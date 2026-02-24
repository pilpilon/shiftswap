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

/**
 * Persist a WhatsApp LID → real phone mapping in Firestore so we only need
 * to resolve it once (via name lookup) and then always have it available.
 */
export async function saveLidMapping(businessId: string, lid: string, phone: string): Promise<void> {
    if (!db) return;
    try {
        await db.collection('businesses').doc(businessId)
            .collection('lid_mappings').doc(lid).set({ phone, updatedAt: new Date().toISOString() });
        console.log(`[FIREBASE] Saved LID mapping: ${lid} → ${phone}`);
    } catch (err) {
        console.error('[FIREBASE] saveLidMapping error:', err);
    }
}

/**
 * Resolve a WhatsApp @lid JID to a real normalized phone number.
 * 1. Checks the Firestore LID cache first (fast path).
 * 2. Falls back to name-based lookup in the staff collection.
 * 3. If resolved via name, persists the mapping for future calls.
 * Returns null if resolution fails.
 */
export async function resolveLidToPhone(businessId: string, lid: string, senderName?: string): Promise<string | null> {
    if (!db) return null;
    const lidKey = lid.split('@')[0]; // strip @lid suffix for use as doc ID

    // 1. Check cache
    try {
        const cached = await db.collection('businesses').doc(businessId)
            .collection('lid_mappings').doc(lidKey).get();
        if (cached.exists) {
            const phone = cached.data()?.phone;
            if (phone) {
                console.log(`[FIREBASE] LID cache hit: ${lidKey} → ${phone}`);
                return phone;
            }
        }
    } catch { /* ignore cache errors */ }

    // 2. Fallback: look up by name
    if (senderName) {
        const phone = await getStaffPhoneByName(businessId, senderName);
        if (phone) {
            // 3. Persist for next time
            await saveLidMapping(businessId, lidKey, phone);
            return phone;
        }
    }

    return null;
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

// ─── Availability Submission ───────────────────────────────────────────────

/** Returns current ISO week key e.g. "2026-W08" */
export function getCurrentWeekKey(): string {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((now.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Save an employee's availability for the upcoming week */
export async function saveAvailability(
    businessId: string,
    phone: string, // normalized phone (972XXXXXXXXX)
    weekKey: string,
    days: string[]   // e.g. ["שני", "שלישי", "שישי"]
): Promise<void> {
    if (!db) return;
    await db
        .collection('availability')
        .doc(businessId)
        .collection(weekKey)
        .doc(phone)
        .set({ days, submittedAt: new Date().toISOString() });
}

/** Get all submitted availability for a given week */
export async function getAvailability(
    businessId: string,
    weekKey: string
): Promise<Record<string, string[]>> {
    if (!db) return {};
    const snap = await db
        .collection('availability')
        .doc(businessId)
        .collection(weekKey)
        .get();
    const result: Record<string, string[]> = {};
    snap.forEach(doc => { result[doc.id] = doc.data().days ?? []; });
    return result;
}

/** Given a display name, return the normalized phone (972XXXXXXXXX) of the matching staff member, or null if not found */
export async function getStaffPhoneByName(businessId: string, name: string): Promise<string | null> {
    if (!db || !name) return null;

    // Strip emojis and extra whitespace from the incoming pushName
    const stripEmojis = (s: string) =>
        s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FEFF}]/gu, '').trim();

    const cleanName = stripEmojis(name).toLowerCase();
    // Split into meaningful words (≥3 chars) for word-overlap matching
    const nameWords = cleanName.split(/\s+/).filter(w => w.length >= 3);

    try {
        const snap = await db.collection('staff').where('businessId', '==', businessId).get();
        const allNames = snap.docs.map(d => `"${d.data().name}"`).join(', ');
        console.log(`[FIREBASE] getStaffPhoneByName: searching for "${name}" (cleaned: "${cleanName}") in [${allNames}]`);

        const matches: { name: string; phone: string }[] = [];
        for (const doc of snap.docs) {
            const data = doc.data();
            if (!data.name || !data.phone) continue;

            const staffClean = stripEmojis(data.name).toLowerCase();
            const staffWords = staffClean.split(/\s+/).filter(w => w.length >= 3);

            // Match if: exact clean match, OR any word from pushName appears in staff name, OR vice versa
            const isMatch =
                cleanName === staffClean ||
                nameWords.some(w => staffClean.includes(w)) ||
                staffWords.some(w => cleanName.includes(w));

            if (isMatch) {
                let p = data.phone.replace(/[^0-9]/g, '');
                if (p.startsWith('0')) p = '972' + p.slice(1);
                matches.push({ name: data.name, phone: p });
            }
        }

        if (matches.length === 0) return null;

        if (matches.length > 1) {
            console.warn(`[FIREBASE] ⚠️ AMBIGUOUS name match for "${name}" — found ${matches.length} employees: ${matches.map(m => `"${m.name}"`).join(', ')}. Returning first. Consider adding last name to differentiate.`);
        } else {
            console.log(`[FIREBASE] Name match: "${name}" → "${matches[0].name}" → ${matches[0].phone}`);
        }

        return matches[0].phone;

    } catch (err) {
        console.error('[FIREBASE] getStaffPhoneByName error:', err);
    }
    return null;
}

/** Returns phone numbers of staff who have NOT submitted availability this week */
export async function getStaffWhoHaventSubmitted(
    businessId: string,
    weekKey: string
): Promise<{ name: string; phone: string }[]> {
    if (!db) return [];

    const [staffSnap, submittedMap] = await Promise.all([
        db.collection('staff').where('businessId', '==', businessId).get(),
        getAvailability(businessId, weekKey),
    ]);

    const missing: { name: string; phone: string }[] = [];
    for (const doc of staffSnap.docs) {
        const data = doc.data();
        if (!data.phone) continue;
        let phone = data.phone.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '972' + phone.slice(1);
        if (!submittedMap[phone]) {
            missing.push({ name: data.name, phone });
        }
    }
    return missing;
}

// ─── Published Schedule ───────────────────────────────────────────────────

export interface EmployeePublishedShift {
    date: string;
    hours: string;
    role: string;
}

/** Save a compiled schedule so the AI can answer "what is my schedule?" */
export async function savePublishedSchedule(
    businessId: string,
    weekKey: string,
    scheduleMap: Record<string, EmployeePublishedShift[]> // normalizedPhone -> shifts
): Promise<void> {
    if (!db) return;
    try {
        await db
            .collection('published_schedules')
            .doc(businessId)
            .collection('weeks')
            .doc(weekKey)
            .set({ schedule: scheduleMap, updatedAt: new Date().toISOString() });
    } catch (err) {
        console.error("Failed to save published schedule:", err);
    }
}

/** Retrieve an employee's published shifts */
export async function getPublishedSchedule(
    businessId: string,
    weekKey: string,
    phone: string // normalized phone
): Promise<EmployeePublishedShift[] | null> {
    if (!db) return null;
    try {
        const doc = await db
            .collection('published_schedules')
            .doc(businessId)
            .collection('weeks')
            .doc(weekKey)
            .get();
        if (doc.exists) {
            const data = doc.data();
            return data?.schedule?.[phone] || [];
        }
    } catch (err) {
        console.error("Failed to get published schedule:", err);
    }
    return null;
}

// ─── Shift Swaps / AI Cancellations ───────────────────────────────────────

export interface SwapRequest {
    id: string;
    date: string;       // DD/MM/YYYY text
    shiftTitle: string; // The "hours" string
    role: string;
    originalEmployee: string;
    originalPhone: string;
    reason: string;
    status: 'pending' | 'covered';
    coveredBy?: string;
    urgency: 'high' | 'medium' | 'low';
    createdAt: string;
}

export async function registerSwapRequest(
    businessId: string,
    phone: string,
    dateString: string,
    reason: string,
    senderName?: string   // fallback display name for @lid senders
): Promise<void> {
    if (!db) return;

    // We try to find the actual shift from the current week
    const weekKey = getCurrentWeekKey();
    const publishedShifts = await getPublishedSchedule(businessId, weekKey, phone);

    let role = 'חבר צוות';
    let shiftTitle = 'משמרת';
    let urgency: 'high' | 'medium' | 'low' = 'medium';
    let actualDate = dateString;

    if (publishedShifts && publishedShifts.length > 0) {
        // Find the closest or specifically requested shift
        // For MVP, we just take their first shift or the one matching the string loosely
        const targetShift = publishedShifts.find(s => s.date.includes(dateString)) || publishedShifts[0];

        if (targetShift) {
            role = targetShift.role;
            shiftTitle = targetShift.hours;
            actualDate = targetShift.date;
        }
    }

    try {
        const staffSnap = await db.collection('staff').where('businessId', '==', businessId).get();
        let employeeName = senderName || 'עובד לא מזוהה'; // use pushName as fallback for @lid
        for (const doc of staffSnap.docs) {
            const data = doc.data();
            if (data.phone) {
                let p = data.phone.replace(/[^0-9]/g, '');
                if (p.startsWith('0')) p = '972' + p.slice(1);
                if (p === phone) {
                    employeeName = data.name;
                    break;
                }
            }
        }

        await db.collection('businesses').doc(businessId).collection('swaps').add({
            date: actualDate,
            shiftTitle,
            role,
            originalEmployee: employeeName,
            originalPhone: phone,
            reason,
            status: 'pending',
            urgency,
            createdAt: new Date().toISOString()
        });

        console.log(`[FIREBASE] Saved swap request for ${employeeName} on ${actualDate}`);

        // --- Trigger AI Negotiation Asynchronously ---
        // We do not await this so the WhatsApp response to the original employee is fast
        initiateNegotiation(businessId, actualDate, shiftTitle, role, phone, employeeName, reason).catch(e => {
            console.error('[AI] Async negotiation failed:', e);
        });

    } catch (err) {
        console.error("Failed to register swap request:", err);
    }
}

async function initiateNegotiation(
    businessId: string,
    date: string,
    shiftTitle: string,
    role: string,
    originalPhone: string,
    originalName: string,
    reason: string
) {
    if (!db) return;
    try {
        const staffSnap = await db.collection('staff').where('businessId', '==', businessId).get();
        const candidates: any[] = [];

        for (const doc of staffSnap.docs) {
            const emp = doc.data();
            if (!emp.phone) continue;

            let p = emp.phone.replace(/[^0-9]/g, '');
            if (p.startsWith('0')) p = '972' + p.slice(1);

            // Skip the person who cancelled
            if (p === originalPhone) continue;

            // Basic filtering: In MVP we just ask everyone with a phone number (or filter by role if structured)
            // For now, let's ask everyone to maximize coverage chance
            candidates.push({ name: emp.name, phone: p });
        }

        if (candidates.length === 0) {
            console.log(`[AI] No eligible candidates found for swap on ${date}`);
            return;
        }

        // Dynamically import whatsapp to prevent circular dependency issues
        const { activeSockets } = await import('./whatsapp');
        const sock = activeSockets[businessId];
        if (!sock) {
            console.error(`[AI] WhatsApp socket not active for business ${businessId}. Cannot send offers.`);
            return;
        }

        console.log(`[AI] Initiating negotiation with ${candidates.length} candidates for ${date}`);

        for (const candidate of candidates) {
            const jid = `${candidate.phone}@s.whatsapp.net`;
            const offerMessage =
                `היי ${candidate.name} 👋\n` +
                `פנתה משמרת ${role} בתאריך ${date} (${shiftTitle}).\n` +
                `האם תוכל/י להתפנות?\n` +
                `(השב "כן אני אחליף" או "לא תודה")`;

            await sock.sendMessage(jid, { text: offerMessage });

            // Log the outbound offer
            await db.collection('negotiation_logs').add({
                businessId,
                employeePhone: jid,
                message: offerMessage,
                sender: 'ai',
                timestamp: new Date().toISOString()
            });

            // Add a slight delay to avoid rate limits
            await new Promise(r => setTimeout(r, 1000));
        }
    } catch (error) {
        console.error('[AI] Error in initiateNegotiation:', error);
    }
}

export async function assignSwap(
    businessId: string,
    coveredByPhone: string
): Promise<{ success: boolean; date?: string; shiftTitle?: string; error?: string }> {
    if (!db) return { success: false, error: 'Database not connected' };

    try {
        // Find the oldest pending swap
        const swapSnap = await db.collection('businesses')
            .doc(businessId)
            .collection('swaps')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .limit(1)
            .get();

        if (swapSnap.empty) {
            return { success: false, error: 'אין בקשות להחלפה כרגע.' };
        }

        const swapDoc = swapSnap.docs[0];
        const swapData = swapDoc.data() as SwapRequest;

        // Prevent the original employee from covering their own shift
        const normalizedCoveredPhone = coveredByPhone.replace(/[^0-9]/g, '');
        const normalizedOriginalPhone = (swapData.originalPhone || '').replace(/[^0-9]/g, '');
        if (normalizedCoveredPhone === normalizedOriginalPhone) {
            return { success: false, error: 'self_replacement' };
        }
        // Find the name of the covering employee
        let coveredByName = 'עובד מחליף';
        const staffSnap = await db.collection('staff')
            .where('businessId', '==', businessId)
            .get();

        for (const doc of staffSnap.docs) {
            const data = doc.data();
            if (data.phone) {
                let p = data.phone.replace(/[^0-9]/g, '');
                if (p.startsWith('0')) p = '972' + p.slice(1);
                if (p === coveredByPhone) {
                    coveredByName = data.name;
                    break;
                }
            }
        }

        // Mark the swap as covered
        await swapDoc.ref.update({
            status: 'covered',
            coveredBy: coveredByName,
            updatedAt: new Date().toISOString()
        });

        console.log(`[FIREBASE] Swap ${swapDoc.id} covered by ${coveredByName}`);

        // --- Manager Alert ---
        // Dynamically import whatsapp to prevent circular dependency issues
        const { activeSockets } = await import('./whatsapp');
        const sock = activeSockets[businessId];
        if (sock) {
            // Find managers to notify
            const managersSnap = await db.collection('staff')
                .where('businessId', '==', businessId)
                .where('role', 'in', ['מנהל', 'אדמין', 'manager', 'admin'])
                .get();

            for (const mDoc of managersSnap.docs) {
                const manager = mDoc.data();
                if (manager.phone) {
                    let mp = manager.phone.replace(/[^0-9]/g, '');
                    if (mp.startsWith('0')) mp = '972' + mp.slice(1);

                    const mJid = `${mp}@s.whatsapp.net`;
                    const alertMsg = `ℹ️ עדכון סידור אוטומטי (AI):\n${coveredByName} לקח/ה את משמרת ${swapData.shiftTitle} ב-${swapData.date} במקום ${swapData.originalEmployee}.`;
                    await sock.sendMessage(mJid, { text: alertMsg }).catch((e: any) => console.error("Manager alert error", e));
                    await new Promise(r => setTimeout(r, 500));
                }
            }
        }

        return {
            success: true,
            date: swapData.date,
            shiftTitle: swapData.shiftTitle
        };

    } catch (err) {
        console.error("Failed to assign swap:", err);
        return { success: false, error: 'Internal system error' };
    }
}
