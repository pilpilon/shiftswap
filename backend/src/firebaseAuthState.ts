import * as admin from 'firebase-admin';
import { AuthenticationCreds, AuthenticationState, SignalDataTypeMap, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';
import { getFirestore } from './firebase';

const COLLECTION = 'whatsapp_sessions';

/**
 * A Baileys auth-state implementation that persists credentials in Firestore.
 * This replaces useMultiFileAuthState (which writes to local disk) so that
 * sessions survive Render restarts and deployments.
 *
 * Firestore structure:
 *   whatsapp_sessions/{businessId}/creds        → serialized AuthenticationCreds
 *   whatsapp_sessions/{businessId}/keys/{type}_{id} → individual signal keys
 */
export async function useFirestoreAuthState(businessId: string): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
}> {
    const db = getFirestore();
    if (!db) {
        throw new Error('[FirestoreAuthState] Firestore is not initialized.');
    }

    const sessionDoc = db.collection(COLLECTION).doc(businessId);

    // ─── Load or initialize credentials ───────────────────────────────────────
    async function loadCreds(): Promise<AuthenticationCreds> {
        const snap = await sessionDoc.get();
        const raw = snap.data()?.creds;
        if (raw) {
            try {
                return JSON.parse(raw, BufferJSON.reviver) as AuthenticationCreds;
            } catch {
                console.warn('[FirestoreAuthState] Failed to parse stored creds, initializing fresh.');
            }
        }
        return initAuthCreds();
    }

    // ─── Signal key store backed by Firestore ─────────────────────────────────
    function makeKeyStore() {
        const keysCollection = sessionDoc.collection('keys');

        async function get<T extends keyof SignalDataTypeMap>(
            type: T,
            ids: string[]
        ): Promise<{ [id: string]: SignalDataTypeMap[T] }> {
            const result: { [id: string]: SignalDataTypeMap[T] } = {};
            await Promise.all(
                ids.map(async (id) => {
                    const docId = `${type}_${id}`;
                    const snap = await keysCollection.doc(docId).get();
                    if (snap.exists) {
                        try {
                            const parsed = JSON.parse(snap.data()!.value, BufferJSON.reviver);
                            result[id] = parsed;
                        } catch {
                            // ignore corrupt keys
                        }
                    }
                })
            );
            return result;
        }

        async function set(data: { [T in keyof SignalDataTypeMap]?: { [id: string]: SignalDataTypeMap[T] | null | undefined } }) {
            const batch = db!.batch();
            for (const type of Object.keys(data) as (keyof SignalDataTypeMap)[]) {
                const typeData = data[type];
                if (!typeData) continue;
                for (const id of Object.keys(typeData)) {
                    const value = typeData[id];
                    const docId = `${type}_${id}`;
                    const docRef = keysCollection.doc(docId);
                    if (value == null) {
                        batch.delete(docRef);
                    } else {
                        batch.set(docRef, { value: JSON.stringify(value, BufferJSON.replacer) });
                    }
                }
            }
            await batch.commit();
        }

        return { get, set };
    }

    const creds = await loadCreds();
    const keys = makeKeyStore();

    const state: AuthenticationState = { creds, keys };

    async function saveCreds() {
        await sessionDoc.set(
            { creds: JSON.stringify(state.creds, BufferJSON.replacer) },
            { merge: true }
        );
    }

    return { state, saveCreds };
}

/**
 * Deletes all stored auth data for a business from Firestore.
 * Call this when the user explicitly disconnects/logs out.
 */
export async function deleteFirestoreAuthState(businessId: string): Promise<void> {
    const db = getFirestore();
    if (!db) return;

    const sessionDoc = db.collection(COLLECTION).doc(businessId);

    // Delete all sub-collection keys first (Firestore doesn't auto-delete sub-collections)
    const keysSnap = await sessionDoc.collection('keys').listDocuments();
    const batch = db.batch();
    for (const doc of keysSnap) {
        batch.delete(doc);
    }
    batch.delete(sessionDoc);
    await batch.commit();

    console.log(`[FirestoreAuthState] Deleted session for ${businessId}`);
}
