import * as admin from 'firebase-admin';

// Initialize Firebase Admin
// Make sure to set GOOGLE_APPLICATION_CREDENTIALS in your environment variable
// pointing to your Firebase Admin SDK service account JSON file.

let db: admin.firestore.Firestore | null = null;

try {
    admin.initializeApp();
    db = admin.firestore();
    console.log("Firebase Admin initialized successfully.");
} catch (error) {
    console.warn("Could not initialize Firebase Admin SDK. Please configure credentials.", error);
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
