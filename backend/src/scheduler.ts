/**
 * scheduler.ts
 * Daily job that runs after the submission deadline and sends a reminder
 * WhatsApp nudge to any employee who hasn't submitted their availability yet.
 *
 * Activated by server.ts calling startReminderScheduler().
 * Respects the businessId-level `reminderBotEnabled` Firestore setting.
 */

import { getFirestore, getStaffWhoHaventSubmitted, getCurrentWeekKey } from './firebase';
import { activeSockets } from './whatsapp';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // check every hour
const NUDGE_HOUR = 18; // send after 18:00 on the deadline day

/** Tracks which (businessId, weekKey) pairs have already been nudged today */
const nudgedThisWeek = new Set<string>();

async function runReminderCheck() {
    const db = getFirestore();
    if (!db) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0=Sun, 1=Mon, … 6=Sat

    if (currentHour < NUDGE_HOUR) return; // too early

    let businessesSnap;
    try {
        businessesSnap = await db.collection('businesses').get();
    } catch {
        return;
    }

    for (const bizDoc of businessesSnap.docs) {
        const businessId = bizDoc.id;

        // Check reminder setting (default: enabled)
        let reminderEnabled = true;
        let deadlineDay = -1;
        try {
            const settingsDoc = await db
                .collection('businesses').doc(businessId)
                .collection('settings').doc('general').get();
            const settingsData = settingsDoc.data() ?? {};
            reminderEnabled = settingsData.reminderBotEnabled !== false;
            deadlineDay = settingsData.submissionDeadlineDay ?? -1;
        } catch { /* ignore */ }

        if (!reminderEnabled || deadlineDay < 0) continue;
        if (currentDay !== deadlineDay) continue; // not the deadline day

        const weekKey = getCurrentWeekKey();
        const nudgeKey = `${businessId}:${weekKey}`;
        if (nudgedThisWeek.has(nudgeKey)) continue; // already sent today

        // Check if we have an active WhatsApp socket for this business
        const sock = activeSockets[businessId];
        if (!sock) continue;

        // Find who hasn't submitted
        const missing = await getStaffWhoHaventSubmitted(businessId, weekKey);
        if (missing.length === 0) continue;

        // Send nudge
        for (const { name, phone } of missing) {
            const jid = `${phone}@s.whatsapp.net`;
            const message =
                `שלום ${name} 👋\n` +
                `תזכורת: עדיין לא שלחת את הזמינות שלך לשבוע הבא.\n` +
                `אנא שלח הודעה עם הימים שאתה פנוי, לדוגמא:\n` +
                `"לשבוע הבא אני פנוי שני, שלישי, שישי"`;
            try {
                await sock.sendMessage(jid, { text: message });
                console.log(`[SCHEDULER] Nudge sent to ${name} (${jid})`);
            } catch (error) {
                const err = error as Error;
                console.error(`[SCHEDULER] Failed to nudge ${name}:`, err.message);
            }
        }

        nudgedThisWeek.add(nudgeKey);
        console.log(`[SCHEDULER] Nudged ${missing.length} employees for ${businessId} (${weekKey})`);
    }
}

export function startReminderScheduler() {
    console.log('[SCHEDULER] Reminder scheduler started');
    // Run once immediately on startup (in case server restarted mid-day)
    runReminderCheck().catch(console.error);
    setInterval(() => runReminderCheck().catch(console.error), CHECK_INTERVAL_MS);
}
