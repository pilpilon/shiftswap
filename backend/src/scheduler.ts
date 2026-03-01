/**
 * scheduler.ts
 * Runs two recurring jobs:
 *
 * 1. Availability Reminder: On the deadline day, after botActiveFrom, nudges
 *    employees who haven't submitted their availability yet.
 *
 * 2. Proactive Gap-Fill: Every hour, checks for published shifts that start
 *    within `warningHours` hours and are still understaffed. If so, contacts
 *    available staff to fill the gap — just like the cancellation flow.
 *
 * Both jobs respect the business's botActiveFrom / botActiveTo window.
 * Activated by server.ts calling startReminderScheduler().
 */

import { getFirestore, getStaffWhoHaventSubmitted, getCurrentWeekKey } from './firebase';
import { activeSockets } from './whatsapp';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // check every hour

/** Tracks which (businessId, weekKey) pairs have already been nudged today */
const nudgedThisWeek = new Set<string>();

/** Tracks which (businessId, shiftId) gap-fill attempts have already been started */
const gapFillStarted = new Set<string>();

// ── Helper: load business settings from Firestore ──────────────────────────
interface BizSettings {
    reminderBotEnabled: boolean;
    submissionDeadlineDay: number;
    warningHours: number;
    botActiveFrom: number; // 0-23
    botActiveTo: number;   // 0-23
}

async function getBusinessSettings(db: FirebaseFirestore.Firestore, businessId: string): Promise<BizSettings> {
    const defaults: BizSettings = {
        reminderBotEnabled: true,
        submissionDeadlineDay: -1,
        warningHours: 24,
        botActiveFrom: 8,
        botActiveTo: 21,
    };

    try {
        // Settings are stored in the user document under the `settings` field
        // (keyed by userId who owns this business). We check the business-level
        // settings collection first, then fall back to user-level settings.
        const settingsDoc = await db
            .collection('businesses').doc(businessId)
            .collection('settings').doc('general').get();
        const data = settingsDoc.data() ?? {};
        return {
            reminderBotEnabled: data.reminderBotEnabled !== false,
            submissionDeadlineDay: data.submissionDeadlineDay ?? defaults.submissionDeadlineDay,
            warningHours: data.warningHours ?? defaults.warningHours,
            botActiveFrom: data.botActiveFrom ?? defaults.botActiveFrom,
            botActiveTo: data.botActiveTo ?? defaults.botActiveTo,
        };
    } catch {
        return defaults;
    }
}

// ── Job 1: Availability Reminder ────────────────────────────────────────────
async function runAvailabilityReminder(db: FirebaseFirestore.Firestore, businessesSnap: FirebaseFirestore.QuerySnapshot) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    for (const bizDoc of businessesSnap.docs) {
        const businessId = bizDoc.id;
        const biz = await getBusinessSettings(db, businessId);

        if (!biz.reminderBotEnabled || biz.submissionDeadlineDay < 0) continue;
        if (currentDay !== biz.submissionDeadlineDay) continue;
        if (currentHour < biz.botActiveFrom || currentHour >= biz.botActiveTo) continue;

        const weekKey = getCurrentWeekKey();
        const nudgeKey = `${businessId}:${weekKey}`;
        if (nudgedThisWeek.has(nudgeKey)) continue;

        const sock = activeSockets[businessId];
        if (!sock) continue;

        const missing = await getStaffWhoHaventSubmitted(businessId, weekKey);
        if (missing.length === 0) continue;

        for (const { name, phone } of missing) {
            const jid = `${phone}@s.whatsapp.net`;
            const message =
                `שלום ${name} 👋\n` +
                `תזכורת: עדיין לא שלחת את הזמינות שלך לשבוע הבא.\n` +
                `אנא שלח הודעה עם הימים שאתה פנוי, לדוגמא:\n` +
                `"לשבוע הבא אני פנוי שני, שלישי, שישי"`;
            try {
                await sock.sendMessage(jid, { text: message });
                console.log(`[SCHEDULER] Availability nudge sent to ${name} (${jid})`);
            } catch (error) {
                const err = error as Error;
                console.error(`[SCHEDULER] Failed to nudge ${name}:`, err.message);
            }
        }

        nudgedThisWeek.add(nudgeKey);
        console.log(`[SCHEDULER] Nudged ${missing.length} employees for ${businessId} (${weekKey})`);
    }
}

// ── Job 2: Proactive Gap-Fill ───────────────────────────────────────────────
async function runGapFillCheck(db: FirebaseFirestore.Firestore, businessesSnap: FirebaseFirestore.QuerySnapshot) {
    const now = new Date();
    const currentHour = now.getHours();

    for (const bizDoc of businessesSnap.docs) {
        const businessId = bizDoc.id;
        const biz = await getBusinessSettings(db, businessId);

        // Respect bot active hours
        if (currentHour < biz.botActiveFrom || currentHour >= biz.botActiveTo) continue;

        const sock = activeSockets[businessId];
        if (!sock) continue;

        // Find all shifts in the next warningHours hours that are understaffed
        const windowEnd = new Date(now.getTime() + biz.warningHours * 60 * 60 * 1000);
        const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const windowEndStr = windowEnd.toISOString().slice(0, 10);

        let shiftsSnap;
        try {
            shiftsSnap = await db
                .collection('businesses').doc(businessId)
                .collection('shifts')
                .where('date', '>=', todayStr)
                .where('date', '<=', windowEndStr)
                .get();
        } catch {
            continue;
        }

        for (const shiftDoc of shiftsSnap.docs) {
            const shift = shiftDoc.data();
            const shiftId = shiftDoc.id;

            // Only act on published, understaffed shifts
            if (shift.filledCount >= shift.totalRequired) continue;
            if (!shift.published) continue;

            const gapKey = `${businessId}:${shiftId}`;
            if (gapFillStarted.has(gapKey)) continue; // already trying to fill this one
            gapFillStarted.add(gapKey);

            console.log(`[SCHEDULER] Gap-fill triggered for shift ${shiftId} on ${shift.date} (${shift.filledCount}/${shift.totalRequired})`);

            // Find all staff without a filled role in this shift
            const staffSnap = await db.collection('businesses').doc(businessId).collection('staff').get();
            const assignedPhones = new Set<string>();
            for (const rr of (shift.roleRequirements ?? [])) {
                for (const sid of (rr.assignedIds ?? [])) {
                    assignedPhones.add(sid);
                }
            }

            const candidates: { name: string; phone: string }[] = [];
            for (const staffDoc of staffSnap.docs) {
                const emp = staffDoc.data();
                if (!emp.phone) continue;
                if (assignedPhones.has(staffDoc.id)) continue; // already in this shift

                let p = emp.phone.replace(/[^0-9]/g, '');
                if (p.startsWith('0')) p = '972' + p.slice(1);
                candidates.push({ name: emp.name, phone: p });
            }

            if (candidates.length === 0) continue;

            // Send async — don't block the scheduler loop
            (async () => {
                for (const candidate of candidates) {
                    // Re-check: is the shift still understaffed?
                    const fresh = await shiftDoc.ref.get();
                    if (!fresh.exists || (fresh.data()?.filledCount ?? 0) >= (fresh.data()?.totalRequired ?? 1)) {
                        console.log(`[SCHEDULER] Shift ${shiftId} is now filled. Stopping gap-fill.`);
                        break;
                    }

                    const jid = `${candidate.phone}@s.whatsapp.net`;
                    const msg =
                        `היי ${candidate.name} 👋\n` +
                        `יש משמרת פתוחה ב-${shift.date} (${shift.title || ''}) שעדיין לא מאויישת.\n` +
                        `האם תוכל/י להגיע?\n` +
                        `(השב "כן" או "לא תודה")`;

                    try {
                        await sock.sendMessage(jid, { text: msg });
                        console.log(`[SCHEDULER] Gap-fill offer sent to ${candidate.name} for shift ${shiftId}`);
                        await new Promise(r => setTimeout(r, 10 * 60 * 1000)); // wait 10 min for reply
                    } catch (err) {
                        console.error(`[SCHEDULER] Failed to send gap-fill offer to ${candidate.name}:`, err);
                    }
                }
            })().catch(e => console.error('[SCHEDULER] Gap-fill async error:', e));
        }
    }
}

// ── Main entry ─────────────────────────────────────────────────────────────
async function runSchedulerCheck() {
    const db = getFirestore();
    if (!db) return;

    let businessesSnap;
    try {
        businessesSnap = await db.collection('businesses').get();
    } catch {
        return;
    }

    await Promise.allSettled([
        runAvailabilityReminder(db, businessesSnap),
        runGapFillCheck(db, businessesSnap),
    ]);
}

export function startReminderScheduler() {
    console.log('[SCHEDULER] Scheduler started (availability reminders + proactive gap-fill)');
    runSchedulerCheck().catch(console.error);
    setInterval(() => runSchedulerCheck().catch(console.error), CHECK_INTERVAL_MS);
}
