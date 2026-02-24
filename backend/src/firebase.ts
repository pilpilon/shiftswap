import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// On Render (or any cloud), set FIREBASE_SERVICE_ACCOUNT env var to the raw JSON
// of your Firebase Admin service account key.
// Alternatively, set GOOGLE_APPLICATION_CREDENTIALS to the local file path.

let db: admin.firestore.Firestore | null = null;

try {
    let credential: admin.credential.Credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // Cloud environment (Render): use JSON string stored in env var
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        credential = admin.credential.cert(serviceAccount);
        console.log('[FIREBASE] Initializing with FIREBASE_SERVICE_ACCOUNT env var');
    } else {
        // Local environment: use GOOGLE_APPLICATION_CREDENTIALS file path
        credential = admin.credential.applicationDefault();
        console.log('[FIREBASE] Initializing with GOOGLE_APPLICATION_CREDENTIALS file');
    }

    admin.initializeApp({ credential });
    db = admin.firestore();
    console.log('[FIREBASE] Admin SDK initialized successfully.');
} catch (error) {
    console.warn('[FIREBASE] Could not initialize Admin SDK — running without DB.', error);
}

export const getFirestore = () => db;

// Data Access Helpers
export async function getBusinessRules(businessId: string): Promise<string> {
    if (!db) {
        // Fallback mock if no db connected
        return `
            - Max instant bonus: 50.
            - Taxis: Approved for closing shifts only.
            - Swaps permitted if roles match.
         `;
    }

    try {
        const doc = await db.collection('businesses').doc(businessId).collection('settings').doc('rules').get();
        if (doc.exists) {
            const data = doc.data();
            return data?.rulesText || "";
        }
    } catch (err) {
        console.error("Error fetching business rules:", err);
    }
    return "";
}

export async function getOpenShifts(businessId: string): Promise<any[]> {
    if (!db) {
        return [
            { id: '1', role: 'waiter', date: 'Friday Night', isUrgent: true }
        ];
    }
    // Real implementation would query the active shifts collection
    return [];
}

export async function saveNegotiationLog(businessId: string, employeePhone: string, message: string, sender: 'ai' | 'employee' | 'system') {
    if (!db) return;
    try {
        await db.collection('negotiation_logs').add({
            businessId,
            employeePhone,
            message,
            sender,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error("Failed to save negotiation log:", err);
    }
}

function normalizePhone(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
        clean = '972' + clean.slice(1);
    }
    return clean;
}

export async function isEmployeePhone(businessId: string, phoneJid: string): Promise<boolean> {
    if (!db) return true; // Fallback: allow everyone if DB not connected

    // WhatsApp Multi-Device sends @lid JIDs (internal identifier) instead of phone numbers
    // for some contacts. We can't verify the phone, so we allow them through.
    if (phoneJid.endsWith('@lid')) {
        console.log(`[AUTH] Allowing @lid message from ${phoneJid} (cannot verify phone)`);
        return true;
    }

    // WhatsApp JID format: 972501234567@s.whatsapp.net
    const senderPhone = phoneJid.split('@')[0];
    const normalizedSender = normalizePhone(senderPhone);

    try {
        const staffSnapshot = await db.collection('staff')
            .where('businessId', '==', businessId)
            .get();

        for (const doc of staffSnapshot.docs) {
            const data = doc.data();
            if (data.phone) {
                const normalizedStaffPhone = normalizePhone(data.phone);
                console.log(`[AUTH] Comparing ${normalizedSender} vs stored ${normalizedStaffPhone}`);
                if (normalizedStaffPhone === normalizedSender) {
                    return true;
                }
            }
        }
    } catch (err) {
        console.error("Error checking employee phone:", err);
    }

    console.log(`[AUTH] Rejected message from ${normalizedSender} — not in staff list.`);
    return false;
}
