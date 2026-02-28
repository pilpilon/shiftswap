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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getOpenShifts(_businessId: string): Promise<{ id: string; role: string; date: string; isUrgent: boolean }[]> {
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
    days: string[],   // e.g. ["שני", "שלישי", "שישי"]
    notes?: string    // Arbitrary text parsed by AI
): Promise<void> {
    if (!db) return;
    const payload: any = { days, submittedAt: new Date().toISOString() };
    if (notes) payload.notes = notes;

    await db
        .collection('availability')
        .doc(businessId)
        .collection(weekKey)
        .doc(phone)
        .set(payload);
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
        s.replace(/[^\p{L}\p{N}\s]/gu, '').trim();

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

/** Finds the ID of the pending swap offer currently assigned to this employee's phone to answer yes/no. */
export async function getActiveOfferId(businessId: string, phone: string): Promise<string | null> {
    if (!db) return null;
    try {
        const snap = await db.collection('businesses')
            .doc(businessId)
            .collection('swaps')
            .where('status', '==', 'pending')
            .where('currentlyAsking', '==', phone)
            .limit(1)
            .get();
        if (!snap.empty) {
            return snap.docs[0].id;
        }
    } catch (err) {
        console.error("Failed to get active offer id:", err);
    }
    return null;
}

/** Registers that an employee explicitly declined a swap offer. */
export async function rejectShiftSwap(businessId: string, phone: string, swapId: string): Promise<void> {
    if (!db) return;
    try {
        const ref = db.collection('businesses').doc(businessId).collection('swaps').doc(swapId);
        await ref.update({
            rejectedBy: admin.firestore.FieldValue.arrayUnion(phone)
        });
        console.log(`[FIREBASE] ${phone} explicitly rejected swap offer ${swapId}`);
    } catch (err) {
        console.error("Failed to reject shift swap:", err);
    }
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
    const urgency: 'high' | 'medium' | 'low' = 'medium';
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

        const docRef = await db.collection('businesses').doc(businessId).collection('swaps').add({
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

        console.log(`[FIREBASE] Saved swap request for ${employeeName} on ${actualDate} (ID: ${docRef.id})`);

        // --- Trigger AI Negotiation Asynchronously ---
        // We do not await this so the WhatsApp response to the original employee is fast
        initiateNegotiation(businessId, docRef.id, actualDate, shiftTitle, role, phone, employeeName, reason).catch(e => {
            console.error('[AI] Async negotiation failed:', e);
        });

    } catch (err) {
        console.error("Failed to register swap request:", err);
    }
}

async function initiateNegotiation(
    businessId: string,
    swapId: string,
    date: string,
    shiftTitle: string,
    role: string,
    originalPhone: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _originalName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _reason: string
) {
    if (!db) return;
    try {
        const staffSnap = await db.collection('staff').where('businessId', '==', businessId).get();
        const candidates: { name: string; phone: string }[] = [];

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

        console.log(`[AI] Initiating negotiation with ${candidates.length} candidates for ${date} in sequence.`);

        for (const candidate of candidates) {
            // Check if swap is still pending before asking the next candidate
            const swapDoc = await db.collection('businesses').doc(businessId).collection('swaps').doc(swapId).get();
            if (!swapDoc.exists || swapDoc.data()?.status !== 'pending') {
                console.log(`[AI] Swap ${swapId} is no longer pending. Stopping negotiation.`);
                break; // Stop asking other candidates
            }

            // Set the 'currentlyAsking' field so that the AI knows this is the active offer for the candidate
            await swapDoc.ref.update({ currentlyAsking: candidate.phone });

            // Dynamically import whatsapp to prevent circular dependency issues
            const { activeSockets } = await import('./whatsapp');
            const sock = activeSockets[businessId];
            if (!sock) {
                console.error(`[AI] WhatsApp socket not active for business ${businessId}. Cannot send offers.`);
                return;
            }

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

            console.log(`[AI] Sent swap offer for ${swapId} to ${candidate.name} (${candidate.phone})`);

            // Wait 10 minutes maximum for an answer (check every 30 seconds)
            let answered = false;
            let rejected = false;
            for (let i = 0; i < 20; i++) { // 20 * 30s = 10 minutes
                await new Promise(r => setTimeout(r, 30000));

                // Re-check swap status
                const checkDoc = await db.collection('businesses').doc(businessId).collection('swaps').doc(swapId).get();
                if (!checkDoc.exists) break;

                const data = checkDoc.data();
                if (data?.status !== 'pending') {
                    answered = true;
                    break;
                }

                // Check if they explicitly rejected it
                if (data?.rejectedBy && Array.isArray(data.rejectedBy) && data.rejectedBy.includes(candidate.phone)) {
                    rejected = true;
                    break;
                }
            }

            // Clear the currently asking marker
            await db.collection('businesses').doc(businessId).collection('swaps').doc(swapId).update({ currentlyAsking: admin.firestore.FieldValue.delete() }).catch(() => { });

            if (answered) {
                console.log(`[AI] Stopping negotiation for ${swapId} because it was covered.`);
                break;
            } else if (rejected) {
                console.log(`[AI] Candidate ${candidate.name} rejected offer ${swapId}, moving to next candidate instantly.`);
            } else {
                console.log(`[AI] No answer from ${candidate.name} after 10 minutes, moving to next candidate.`);
            }
        }

        // Check if the shift was ever covered by the end of the looping process
        const finalSwapDoc = await db.collection('businesses').doc(businessId).collection('swaps').doc(swapId).get();
        if (finalSwapDoc.exists && finalSwapDoc.data()?.status === 'pending') {
            console.log(`[AI] Escalation: No coverage found for swap ${swapId}. Notifying manager & original employee.`);

            // Need to get the socket since 'sock' might be out of scope here
            const { activeSockets } = await import('./whatsapp');
            const sock = activeSockets[businessId];

            // 1. Notify the original employee
            const originalJid = `${originalPhone}@s.whatsapp.net`;
            let employeeMsg = `שלום ${_originalName}, ניסיתי לחפש מחליף מכל הצוות למשמרת שלך ב-${date}, אבל לצערי אף אחד לא פנוי כרגע.\nהבקשה הועברה לידיעת המנהל. כרגע את/ה עדיין משובץ/ת למשמרת זו.`;

            // Check if the reason was sickness/emergency to avoid claiming they are still scheduled
            if (_reason.includes('חול') || _reason.includes('חולה') || _reason.includes('מחלה') || _reason.includes('מיון') || _reason.includes('רפואי') || _reason.includes('רופא')) {
                employeeMsg = `שלום ${_originalName}, ניסיתי לחפש מחליף למשמרת ב-${date} אך ללא הצלחה. מאחר וציינת סיבה בהקשר דחוף/רפואי, הועבר דיווח למנהל לטיפול מיידי. תרגיש/י טוב!`;
            }

            if (sock) {
                await sock.sendMessage(originalJid, { text: employeeMsg }).catch((e: unknown) => console.error("Failed to notify original employee on fail", e));
            }

            // Log it
            await db.collection('negotiation_logs').add({
                businessId,
                employeePhone: originalJid,
                message: employeeMsg,
                sender: 'system',
                timestamp: new Date().toISOString()
            });

            // 2. Notify the managers
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
                    const managerMsg = `⚠️ עדכון מערכת: לא נמצא מחליף ל-${_originalName} למשמרת ${shiftTitle} ב- ${date}.\nסיבת הביטול: ${_reason}.\nנדרשת התערבותך לכיסוי המשמרת.`;
                    if (sock) {
                        await sock.sendMessage(mJid, { text: managerMsg }).catch((e: unknown) => console.error("Failed to alert manager on fail", e));
                    }
                    await new Promise(r => setTimeout(r, 500));
                }
            }
        }
    } catch (error) {
        console.error('[AI] Error in initiateNegotiation:', error);
    }
}

export async function assignSwap(
    businessId: string,
    coveredByPhone: string,
    offerId: string
): Promise<{ success: boolean; date?: string; shiftTitle?: string; error?: string }> {
    if (!db) return { success: false, error: 'Database not connected' };

    try {
        const swapDocRef = db.collection('businesses')
            .doc(businessId)
            .collection('swaps')
            .doc(offerId);

        const swapDoc = await swapDocRef.get();

        if (!swapDoc.exists || swapDoc.data()?.status !== 'pending') {
            return { success: false, error: 'אין בקשות להחלפה כרגע בסטטוס פתוח ל-ID זה.' };
        }

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
                    await sock.sendMessage(mJid, { text: alertMsg }).catch((e: unknown) => console.error("Manager alert error", e));
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

/**
 * Generates the weekly schedule CSV dynamically from firestore and sends it to the requesting employee.
 */
export async function generateAndSendScheduleCsv(businessId: string, remoteJid: string, employeePhone: string): Promise<boolean> {
    if (!db) return false;

    try {
        const weekKey = getCurrentWeekKey();

        // 1. Fetch published schedule for the current week
        const scheduleDoc = await db
            .collection('published_schedules')
            .doc(businessId)
            .collection('weeks')
            .doc(weekKey)
            .get();

        if (!scheduleDoc.exists) {
            console.log(`[FIREBASE] No published schedule found for ${weekKey}`);
            return false;
        }

        const data = scheduleDoc.data();
        const scheduleMap = data?.schedule as Record<string, EmployeePublishedShift[]>;

        if (!scheduleMap) {
            return false;
        }

        // 2. We need staff directory to map phones to names for the CSV rows
        const staffSnap = await db.collection('staff').where('businessId', '==', businessId).get();
        const staffByPhone: Record<string, string> = {}; // normalizedPhone -> name

        for (const doc of staffSnap.docs) {
            const sData = doc.data();
            if (sData.phone) {
                let p = sData.phone.replace(/[^0-9]/g, '');
                if (p.startsWith('0')) p = '972' + p.slice(1);
                staffByPhone[p] = sData.name;
            }
        }

        // 3. Build CSV Pivot
        const BOM = '\uFEFF';
        const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        const csvHeaderParts = ['עובד', ...dayNames];

        const escapeCsv = (str: string) => {
            if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        const csvHeader = csvHeaderParts.map(escapeCsv).join(',');

        const staffScheduleCsvMap = new Map<string, string[]>(); // phone -> array of 7 days

        // Reconstruct the spreadsheet data
        for (const [phone, shifts] of Object.entries(scheduleMap)) {
            if (!staffScheduleCsvMap.has(phone)) {
                staffScheduleCsvMap.set(phone, ['', '', '', '', '', '', '']);
            }
            const schedArr = staffScheduleCsvMap.get(phone)!;

            for (const shift of shifts) {
                // shift.date is DD/MM/YYYY. We need to parse to JS Date to get dayOfWeek
                const [day, month, year] = shift.date.split('/');
                const d = new Date(`${year}-${month}-${day}T00:00:00Z`);
                const dayOfWeek = d.getDay();

                const entry = `${shift.hours} (${shift.role})`;
                schedArr[dayOfWeek] = schedArr[dayOfWeek] ? `${schedArr[dayOfWeek]} | ${entry}` : entry;
            }
        }

        const csvRows: string[] = [];
        const sortedPhones = Array.from(staffScheduleCsvMap.keys()).sort((a, b) => {
            return (staffByPhone[a] || '').localeCompare(staffByPhone[b] || '');
        });

        for (const phone of sortedPhones) {
            const name = staffByPhone[phone] || 'לא ידוע';
            const daysArr = staffScheduleCsvMap.get(phone)!;
            if (daysArr.some(d => d !== '')) {
                csvRows.push([name, ...daysArr].map(escapeCsv).join(','));
            }
        }

        const csvBuffer = Buffer.from(BOM + [csvHeader, ...csvRows].join('\n'), 'utf-8');

        // 4. Send the CSV
        const { activeSockets } = await import('./whatsapp');
        const sock = activeSockets[businessId];
        if (!sock) {
            console.error(`[FIREBASE] WhatsApp socket not active when trying to send custom CSV`);
            return false;
        }

        await sock.sendMessage(remoteJid, {
            document: csvBuffer,
            mimetype: 'text/csv',
            fileName: 'סידור_עבודה.csv',
            caption: 'סידור עבודה שבועי',
        });

        console.log(`[FIREBASE] Directly sent CSV schedule to ${employeePhone} (${remoteJid})`);
        return true;

    } catch (err) {
        console.error("Failed to generate and send schedule CSV:", err);
        return false;
    }
}
