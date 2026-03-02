import * as admin from 'firebase-admin';
export let db: admin.firestore.Firestore;

try {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
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

// ─── Helper: Staff collection reference (multi-tenant) ─────────────────────
function staffCol(businessId: string) {
    return db.collection('businesses').doc(businessId).collection('staff');
}

// ─── Helper: Negotiation logs with TTL ─────────────────────────────────────
function logTtlExpiry(): string {
    const d = new Date();
    d.setDate(d.getDate() + 20);
    return d.toISOString();
}

// Data Access Helpers
export async function getBusinessRules(businessId: string): Promise<string> {
    if (!db) {
        return '- Bonuses: NOT ALLOWED.';
    }

    try {
        // Settings are stored on the user doc (users/{userId}.settings)
        const usersSnap = await db.collection('users').where('businessId', '==', businessId).limit(1).get();
        if (!usersSnap.empty) {
            const settings = usersSnap.docs[0].data().settings || {};
            const customRules: string = settings.customRules || '';
            const enableCashBonus: boolean = settings.enableCashBonus ?? false;
            const maxBonusAmount: number = settings.maxBonusAmount ?? 50;

            // Build unified rules string
            const bonusRule = enableCashBonus
                ? `- Cash Bonus Policy: ALLOWED. You MAY offer a financial bonus of up to ${maxBonusAmount}₪ per shift, but ONLY as a last resort.`
                : `- Cash Bonus Policy: STRICTLY FORBIDDEN. Do NOT offer any bonus, extra pay, or monetary incentive under any circumstances.`;

            return `${bonusRule}\n${customRules ? `- Manager Custom Rules:\n${customRules}` : ''}`.trim();
        }
    } catch (err) {
        console.error('Error fetching business rules:', err);
    }
    return '- Bonuses: NOT ALLOWED.';
}

export async function getOpenShifts(businessId: string): Promise<{ id: string; role: string; date: string; isUrgent: boolean }[]> {
    if (!db) return [];

    try {
        const todayStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        const shiftsSnap = await db.collection('businesses')
            .doc(businessId)
            .collection('shifts')
            .where('date', '>=', todayStr)
            .get();

        const openShifts: { id: string; role: string; date: string; isUrgent: boolean }[] = [];

        shiftsSnap.forEach(doc => {
            const data = doc.data();
            // Assuming shifts have a totalRequired and a filledCount or assignedIds array
            const filledCount = data.filledCount || (data.assignedIds ? data.assignedIds.length : 0);
            const totalRequired = data.totalRequired || 1; // Default to 1 if not specified

            if (filledCount < totalRequired) {
                openShifts.push({
                    id: doc.id,
                    role: data.role || 'Unspecified Role',
                    date: data.date,
                    isUrgent: data.urgency === 'high'
                });
            }
        });

        return openShifts;
    } catch (err) {
        console.error("Error fetching open shifts:", err);
        return [];
    }
}

export async function saveNegotiationLog(businessId: string, employeePhone: string, message: string, sender: 'ai' | 'employee' | 'system') {
    if (!db) return;
    try {
        await db.collection('businesses').doc(businessId).collection('negotiation_logs').add({
            employeePhone,
            message,
            sender,
            timestamp: new Date().toISOString(),
            expiresAt: logTtlExpiry()
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
 * to resolve it once (via verified binding) and then always have it available.
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
 * SECURITY: Only returns from the verified cache. Does NOT auto-match by name.
 * If a new @lid is encountered, use requestLidVerification() to start the PIN flow.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function resolveLidToPhone(businessId: string, lid: string, _senderName?: string): Promise<string | null> {
    if (!db) return null;
    const lidKey = lid.split('@')[0];

    // Only check verified cache — no fuzzy name matching
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

    console.log(`[FIREBASE] No verified LID mapping for ${lidKey}. Verification required.`);
    return null;
}

// ─── LID Verification (PIN-based) ─────────────────────────────────────────

/**
 * Attempt to find a matching staff member by EXACT name and start PIN verification.
 * Returns the PIN and matched phone if a match is found, null otherwise.
 */
export async function requestLidVerification(
    businessId: string,
    lidKey: string,
    senderName: string
): Promise<{ pin: string; phone: string } | null> {
    if (!db || !senderName) return null;

    // Strip emojis and extra whitespace
    const stripEmojis = (s: string) =>
        s.replace(/[^\p{L}\p{N}\s]/gu, '').trim();

    const cleanName = stripEmojis(senderName).toLowerCase();

    try {
        const snap = await staffCol(businessId).get();
        let matchedPhone: string | null = null;

        for (const doc of snap.docs) {
            const data = doc.data();
            if (!data.name || !data.phone) continue;

            const staffClean = stripEmojis(data.name).toLowerCase();
            if (cleanName === staffClean) {
                let p = data.phone.replace(/[^0-9]/g, '');
                if (p.startsWith('0')) p = '972' + p.slice(1);
                matchedPhone = p;
                break;
            }
        }

        if (!matchedPhone) return null;

        // Generate 4-digit PIN
        const pin = String(Math.floor(1000 + Math.random() * 9000));
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await db.collection('businesses').doc(businessId)
            .collection('lid_verifications').doc(lidKey).set({
                pin,
                phone: matchedPhone,
                expiresAt: expiresAt.toISOString(),
                createdAt: new Date().toISOString()
            });

        console.log(`[FIREBASE] LID verification created for ${lidKey} → PIN: ${pin}`);
        return { pin, phone: matchedPhone };

    } catch (err) {
        console.error('[FIREBASE] requestLidVerification error:', err);
    }
    return null;
}

/**
 * Verify a PIN submitted by a user to bind their @lid to their phone.
 * Returns the verified phone on success, null on failure.
 */
export async function verifyLidPin(
    businessId: string,
    lidKey: string,
    submittedPin: string
): Promise<string | null> {
    if (!db) return null;

    try {
        const ref = db.collection('businesses').doc(businessId)
            .collection('lid_verifications').doc(lidKey);
        const doc = await ref.get();

        if (!doc.exists) return null;

        const data = doc.data()!;
        const now = new Date();

        if (new Date(data.expiresAt) < now) {
            console.log(`[FIREBASE] LID verification expired for ${lidKey}`);
            await ref.delete();
            return null;
        }

        if (data.pin !== submittedPin.trim()) {
            console.log(`[FIREBASE] LID verification PIN mismatch for ${lidKey}`);
            return null;
        }

        // PIN matches! Bind the LID permanently
        await saveLidMapping(businessId, lidKey, data.phone);
        await ref.delete(); // clean up verification doc
        console.log(`[FIREBASE] LID ${lidKey} verified and bound to ${data.phone}`);
        return data.phone;

    } catch (err) {
        console.error('[FIREBASE] verifyLidPin error:', err);
    }
    return null;
}

/**
 * Check if there is a pending LID verification for this lid.
 */
export async function getPendingLidVerification(
    businessId: string,
    lidKey: string
): Promise<{ phone: string; pin: string } | null> {
    if (!db) return null;
    try {
        const doc = await db.collection('businesses').doc(businessId)
            .collection('lid_verifications').doc(lidKey).get();
        if (!doc.exists) return null;
        const data = doc.data()!;
        if (new Date(data.expiresAt) < new Date()) {
            return null; // expired
        }
        return { phone: data.phone, pin: data.pin };
    } catch {
        return null;
    }
}


const phoneCache = new Map<string, { lastChecked: number; isEmployee: boolean }>();

export async function isEmployeePhone(businessId: string, phoneJid: string): Promise<boolean> {
    if (!db) return true;

    // WhatsApp Multi-Device @lid JIDs — allow through (verified later)
    if (phoneJid.endsWith('@lid')) {
        console.log(`[AUTH] Allowing @lid message from ${phoneJid} (cannot verify phone)`);
        return true;
    }

    const senderPhone = phoneJid.split('@')[0];
    const normalizedSender = normalizePhone(senderPhone);
    const cacheKey = `${businessId}:${normalizedSender}`;

    // Check RAM cache (valid for 10 mins if true, 1 min if false)
    const cached = phoneCache.get(cacheKey);
    if (cached) {
        const age = Date.now() - cached.lastChecked;
        if ((cached.isEmployee && age < 10 * 60 * 1000) || (!cached.isEmployee && age < 60 * 1000)) {
            return cached.isEmployee;
        }
    }

    try {
        const staffSnapshot = await staffCol(businessId).get();

        for (const doc of staffSnapshot.docs) {
            const data = doc.data();
            if (data.phone) {
                const normalizedStaffPhone = normalizePhone(data.phone);
                console.log(`[AUTH] Comparing ${normalizedSender} vs stored ${normalizedStaffPhone}`);
                if (normalizedStaffPhone === normalizedSender) {
                    phoneCache.set(cacheKey, { lastChecked: Date.now(), isEmployee: true });
                    return true;
                }
            }
        }
    } catch (err) {
        console.error("Error checking employee phone:", err);
    }

    console.log(`[AUTH] Rejected message from ${normalizedSender} — not in staff list.`);
    phoneCache.set(cacheKey, { lastChecked: Date.now(), isEmployee: false });
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
    phone: string,
    weekKey: string,
    days: string[],
    notes?: string
): Promise<void> {
    if (!db) return;
    const payload: Record<string, unknown> = { days, submittedAt: new Date().toISOString() };
    if (notes) payload.notes = notes;

    await db
        .collection('businesses').doc(businessId)
        .collection('availability').doc(weekKey)
        .collection('submissions').doc(phone)
        .set(payload);
}

/** Get all submitted availability for a given week */
export async function getAvailability(
    businessId: string,
    weekKey: string
): Promise<Record<string, string[]>> {
    if (!db) return {};
    const snap = await db
        .collection('businesses').doc(businessId)
        .collection('availability').doc(weekKey)
        .collection('submissions')
        .get();
    const result: Record<string, string[]> = {};
    snap.forEach(doc => { result[doc.id] = doc.data().days ?? []; });
    return result;
}

/** Given a display name, return the normalized phone (972XXXXXXXXX) of the matching staff member, or null if not found */
export async function getStaffPhoneByName(businessId: string, name: string): Promise<string | null> {
    if (!db || !name) return null;

    const stripEmojis = (s: string) =>
        s.replace(/[^\p{L}\p{N}\s]/gu, '').trim();

    const cleanName = stripEmojis(name).toLowerCase();
    const nameWords = cleanName.split(/\s+/).filter(w => w.length >= 3);

    try {
        const snap = await staffCol(businessId).get();
        const allNames = snap.docs.map(d => `"${d.data().name}"`).join(', ');
        console.log(`[FIREBASE] getStaffPhoneByName: searching for "${name}" (cleaned: "${cleanName}") in [${allNames}]`);

        const matches: { name: string; phone: string }[] = [];
        for (const doc of snap.docs) {
            const data = doc.data();
            if (!data.name || !data.phone) continue;

            const staffClean = stripEmojis(data.name).toLowerCase();
            const staffWords = staffClean.split(/\s+/).filter(w => w.length >= 3);

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
            console.warn(`[FIREBASE] ⚠️ AMBIGUOUS name match for "${name}" — found ${matches.length} employees: ${matches.map(m => `"${m.name}"`).join(', ')}. Returning first.`);
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
        staffCol(businessId).get(),
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
    scheduleMap: Record<string, EmployeePublishedShift[]>
): Promise<void> {
    if (!db) return;
    try {
        await db
            .collection('businesses').doc(businessId)
            .collection('published_schedules').doc(weekKey)
            .set({ schedule: scheduleMap, updatedAt: new Date().toISOString() });
    } catch (err) {
        console.error("Failed to save published schedule:", err);
    }
}

/** Retrieve an employee's published shifts */
export async function getPublishedSchedule(
    businessId: string,
    weekKey: string,
    phone: string
): Promise<EmployeePublishedShift[] | null> {
    if (!db) return null;
    try {
        const doc = await db
            .collection('businesses').doc(businessId)
            .collection('published_schedules').doc(weekKey)
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
    shiftTitle: string;  // The "hours" string
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
    senderName?: string
): Promise<void> {
    if (!db) return;

    const weekKey = getCurrentWeekKey();
    const publishedShifts = await getPublishedSchedule(businessId, weekKey, phone);

    let role = 'חבר צוות';
    let shiftTitle = 'משמרת';
    const urgency: 'high' | 'medium' | 'low' = 'medium';
    let actualDate = dateString;

    if (publishedShifts && publishedShifts.length > 0) {
        const targetShift = publishedShifts.find(s => s.date.includes(dateString)) || publishedShifts[0];
        if (targetShift) {
            role = targetShift.role;
            shiftTitle = targetShift.hours;
            actualDate = targetShift.date;
        }
    }

    try {
        const staffSnap = await staffCol(businessId).get();
        let employeeName = senderName || 'עובד לא מזוהה';
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
        const staffSnap = await staffCol(businessId).get();
        const candidates: { name: string; phone: string }[] = [];

        for (const doc of staffSnap.docs) {
            const emp = doc.data();
            if (!emp.phone) continue;

            let p = emp.phone.replace(/[^0-9]/g, '');
            if (p.startsWith('0')) p = '972' + p.slice(1);

            // Skip the person who cancelled
            if (p === originalPhone) continue;

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
                break;
            }

            // Set the 'currentlyAsking' field + offerExpiresAt for crash resilience
            const offerExpiresAt = new Date();
            offerExpiresAt.setMinutes(offerExpiresAt.getMinutes() + 15);
            await swapDoc.ref.update({
                currentlyAsking: candidate.phone,
                offerExpiresAt: offerExpiresAt.toISOString()
            });

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

            // Log the outbound offer (multi-tenant path + TTL)
            await db.collection('businesses').doc(businessId).collection('negotiation_logs').add({
                employeePhone: jid,
                message: offerMessage,
                sender: 'ai',
                timestamp: new Date().toISOString(),
                expiresAt: logTtlExpiry()
            });

            console.log(`[AI] Sent swap offer for ${swapId} to ${candidate.name} (${candidate.phone})`);

            // Just send the first offer and exit. A background cron will handle subsequent offers
            // if this one expires without an answer.
            console.log(`[AI] Started negotiation for ${swapId}. Awaiting response from ${candidates[0].name} (${candidates[0].phone}).`);
            break; // Stop asking other candidates sequentially! Let advancePendingSwaps handle the rest.
        }
    } catch (error) {
        console.error('[AI] Error in initiateNegotiation:', error);
    }
}

/**
 * Checks all pending swaps. If the current offer has expired, it moves to the next
 * candidate. If no candidates left, it notifies the manager.
 * This should be called by a cron job (e.g., in scheduler.ts).
 */
export async function advancePendingSwaps(businessId: string) {
    if (!db) return;
    try {
        const now = new Date();
        const pendingSnap = await db.collection('businesses').doc(businessId)
            .collection('swaps')
            .where('status', '==', 'pending')
            .get();

        const { activeSockets } = await import('./whatsapp');
        const sock = activeSockets[businessId];

        for (const doc of pendingSnap.docs) {
            const swapData = doc.data() as SwapRequest & { offerExpiresAt?: string, currentlyAsking?: string, rejectedBy?: string[] };

            // If there's an active offer that hasn't expired, skip
            if (swapData.offerExpiresAt && new Date(swapData.offerExpiresAt) > now) {
                continue;
            }

            // Either offer expired, or it's a brand new swap with no currentlyAsking set.
            // Find next eligible candidate
            const staffSnap = await staffCol(businessId).get();
            const candidates: { name: string; phone: string }[] = [];

            for (const staffDoc of staffSnap.docs) {
                const emp = staffDoc.data();
                if (!emp.phone) continue;
                let p = emp.phone.replace(/[^0-9]/g, '');
                if (p.startsWith('0')) p = '972' + p.slice(1);

                if (p === (swapData.originalPhone || '').replace(/[^0-9]/g, '').replace(/^0/, '972')) continue;
                if (swapData.rejectedBy?.includes(p)) continue;
                // If it expired, treat the previous person as if they implicitly rejected it
                if (swapData.currentlyAsking === p && swapData.offerExpiresAt && new Date(swapData.offerExpiresAt) <= now) {
                    continue;
                }

                candidates.push({ name: emp.name, phone: p });
            }

            if (candidates.length === 0) {
                // Escalation: No coverage found for swap
                console.log(`[AI] Escalation: No coverage found for swap ${doc.id}. Notifying manager.`);

                // Notify original employee
                const originalJid = `${(swapData.originalPhone || '').replace(/^0/, '972')}@s.whatsapp.net`;
                const employeeMsg = `שלום, ניסיתי לחפש מחליף מכל הצוות למשמרת ב-${swapData.date} אך עדיין ללא הצלחה. הבקשה הועברה לידיצת המנהל לחפש פתרונות חלופיים. בינתיים אתה עדיין משובץ.`;
                if (sock) await sock.sendMessage(originalJid, { text: employeeMsg }).catch(() => { });

                // Notify managers
                const managersSnap = await staffCol(businessId).where('role', 'in', ['מנהל', 'אדמין', 'manager', 'admin']).get();
                for (const mDoc of managersSnap.docs) {
                    const manager = mDoc.data();
                    if (manager.phone) {
                        const mp = manager.phone.replace(/[^0-9]/g, '').startsWith('0') ? '972' + manager.phone.replace(/[^0-9]/g, '').slice(1) : manager.phone.replace(/[^0-9]/g, '');
                        const mJid = `${mp}@s.whatsapp.net`;
                        const managerMsg = `⚠️ אירוע חריג: לא נמצא מחליף למשמרת ${swapData.shiftTitle} ב- ${swapData.date}. נא התערבות מנהל.`;
                        if (sock) await sock.sendMessage(mJid, { text: managerMsg }).catch(() => { });
                    }
                }

                // Mark as escalated so we don't keep firing this
                await doc.ref.update({ status: 'escalated' });
                continue;
            }

            // Ask next candidate
            const nextCandidate = candidates[0];
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 15);

            // If the old one expired, push them to rejected
            const updatePayload: Record<string, unknown> = {
                currentlyAsking: nextCandidate.phone,
                offerExpiresAt: expiresAt.toISOString(),
            };
            if (swapData.currentlyAsking) {
                updatePayload.rejectedBy = admin.firestore.FieldValue.arrayUnion(swapData.currentlyAsking);
            }

            await doc.ref.update(updatePayload);

            const jid = `${nextCandidate.phone}@s.whatsapp.net`;
            const msg = `היי ${nextCandidate.name} 👋\nפנתה משמרת ב-${swapData.date} (${swapData.shiftTitle}).\nהאם מגיע/ה? (השב כן לחייב או בלא).`;

            if (sock) {
                await sock.sendMessage(jid, { text: msg }).catch(() => { });
                console.log(`[AI] Advanced swap ${doc.id} to new candidate: ${nextCandidate.name} (${nextCandidate.phone})`);
            }
        }
    } catch (e) {
        console.error('[AI] Error in advancePendingSwaps:', e);
    }
}

/**
 * Assigns a shift swap using a Firestore Transaction to prevent race conditions.
 */
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

        // Use Firestore Transaction to prevent race conditions
        const result = await db.runTransaction(async (transaction) => {
            const swapDoc = await transaction.get(swapDocRef);

            if (!swapDoc.exists || swapDoc.data()?.status !== 'pending') {
                return { success: false as const, error: 'אין בקשות להחלפה כרגע בסטטוס פתוח ל-ID זה.' };
            }

            const swapData = swapDoc.data() as SwapRequest;

            // Prevent the original employee from covering their own shift
            const normalizedCoveredPhone = coveredByPhone.replace(/[^0-9]/g, '');
            const normalizedOriginalPhone = (swapData.originalPhone || '').replace(/[^0-9]/g, '');
            if (normalizedCoveredPhone === normalizedOriginalPhone) {
                return { success: false as const, error: 'self_replacement' };
            }

            // Find the name of the covering employee (read outside transaction is OK for name lookup)
            const coveredByName = 'עובד מחליף';

            // NOTE: We can't do arbitrary queries inside a transaction, so we resolve the name
            // after the transaction commits. For now, we set a placeholder.
            transaction.update(swapDocRef, {
                status: 'covered',
                coveredByPhone: coveredByPhone,
                updatedAt: new Date().toISOString()
            });

            return {
                success: true as const,
                date: swapData.date,
                shiftTitle: swapData.shiftTitle,
                originalEmployee: swapData.originalEmployee,
                coveredByName
            };
        });

        if (!result.success) {
            return result;
        }

        // Post-transaction: resolve covering employee name and update
        const staffSnap = await staffCol(businessId).get();
        let coveredByName = 'עובד מחליף';
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

        // Update coveredBy name (non-transactional, cosmetic)
        await swapDocRef.update({ coveredBy: coveredByName });

        console.log(`[FIREBASE] Swap ${offerId} covered by ${coveredByName}`);

        // --- Manager Alert ---
        const { activeSockets } = await import('./whatsapp');
        const sock = activeSockets[businessId];
        if (sock) {
            const managersSnap = await staffCol(businessId)
                .where('role', 'in', ['מנהל', 'אדמין', 'manager', 'admin'])
                .get();

            for (const mDoc of managersSnap.docs) {
                const manager = mDoc.data();
                if (manager.phone) {
                    let mp = manager.phone.replace(/[^0-9]/g, '');
                    if (mp.startsWith('0')) mp = '972' + mp.slice(1);

                    const mJid = `${mp}@s.whatsapp.net`;
                    const alertMsg = `ℹ️ עדכון סידור אוטומטי (AI):\n${coveredByName} לקח/ה את משמרת ${result.shiftTitle} ב-${result.date} במקום ${(result as { originalEmployee?: string }).originalEmployee}.`;
                    await sock.sendMessage(mJid, { text: alertMsg }).catch((e: unknown) => console.error("Manager alert error", e));
                    await new Promise(r => setTimeout(r, 500));
                }
            }
        }

        return {
            success: true,
            date: result.date,
            shiftTitle: result.shiftTitle
        };

    } catch (err) {
        console.error("Failed to assign swap:", err);
        return { success: false, error: 'Internal system error' };
    }
}

// ─── Stale Lock Sweep ─────────────────────────────────────────────────────

/**
 * On server startup, finds any swap offers with expired `offerExpiresAt` and
 * clears the hanging lock so the negotiation queue can resume.
 */
export async function sweepStaleLocks(businessId: string): Promise<number> {
    if (!db) return 0;
    let cleaned = 0;
    try {
        const now = new Date().toISOString();
        const snap = await db.collection('businesses').doc(businessId)
            .collection('swaps')
            .where('status', '==', 'pending')
            .get();

        for (const doc of snap.docs) {
            const data = doc.data();
            if (data.offerExpiresAt && data.offerExpiresAt < now && data.currentlyAsking) {
                await doc.ref.update({
                    currentlyAsking: admin.firestore.FieldValue.delete(),
                    offerExpiresAt: admin.firestore.FieldValue.delete(),
                    rejectedBy: admin.firestore.FieldValue.arrayUnion(data.currentlyAsking)
                });
                console.log(`[SWEEP] Cleared stale lock on swap ${doc.id} (was asking ${data.currentlyAsking})`);
                cleaned++;
            }
        }
    } catch (err) {
        console.error('[SWEEP] Error sweeping stale locks:', err);
    }
    return cleaned;
}

/**
 * Generates the weekly schedule CSV dynamically from firestore and sends it to the requesting employee.
 */
export async function generateAndSendScheduleCsv(businessId: string, remoteJid: string, employeePhone: string): Promise<{ success: boolean; error?: string }> {
    if (!db) return { success: false, error: 'Database not connected' };

    try {
        const weekKey = getCurrentWeekKey();

        // 1. Fetch published schedule for the current week
        const scheduleDoc = await db
            .collection('businesses').doc(businessId)
            .collection('published_schedules').doc(weekKey)
            .get();

        if (!scheduleDoc.exists) {
            console.log(`[FIREBASE] No published schedule found for ${weekKey}`);
            return { success: false, error: 'no_published_schedule' };
        }

        const data = scheduleDoc.data();
        const scheduleMap = data?.schedule as Record<string, EmployeePublishedShift[]>;

        if (!scheduleMap) {
            return { success: false, error: 'empty_schedule' };
        }

        // 2. Staff directory for CSV
        const staffSnap = await staffCol(businessId).get();
        const staffByPhone: Record<string, string> = {};

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

        const staffScheduleCsvMap = new Map<string, string[]>();

        for (const [phone, shifts] of Object.entries(scheduleMap)) {
            if (!staffScheduleCsvMap.has(phone)) {
                staffScheduleCsvMap.set(phone, ['', '', '', '', '', '', '']);
            }
            const schedArr = staffScheduleCsvMap.get(phone)!;

            for (const shift of shifts) {
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
            return { success: false, error: 'whatsapp_not_connected' };
        }

        await sock.sendMessage(remoteJid, {
            document: csvBuffer,
            mimetype: 'text/csv',
            fileName: 'סידור_עבודה.csv',
            caption: 'סידור עבודה שבועי',
        });

        console.log(`[FIREBASE] Directly sent CSV schedule to ${employeePhone} (${remoteJid})`);
        return { success: true };

    } catch (err) {
        console.error("Failed to generate and send schedule CSV:", err);
        return { success: false, error: 'Internal system error' };
    }
}
