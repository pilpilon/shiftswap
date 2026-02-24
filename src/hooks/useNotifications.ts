import { useMemo } from 'react';
import type { Shift } from './useShifts';
import type { Notification } from '../components/Notifications';

/**
 * Derives real-time notifications from the live shifts array.
 * Called every render — no extra Firebase listener needed.
 *
 * Rules:
 * 1. URGENT   — shift today that is completely unfilled (filledCount === 0)
 * 2. ALERT    — shift within next 48 h that is partially or fully unfilled
 * 3. SUCCESS  — shift fully filled (filledCount >= totalRequired)
 */
export function useNotifications(shifts: Shift[]): Notification[] {
    return useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        // Tomorrow ISO string
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);

        // Day-after-tomorrow
        const dayAfter = new Date(now);
        dayAfter.setDate(dayAfter.getDate() + 2);
        const dayAfterStr = dayAfter.toISOString().slice(0, 10);

        const notifications: Notification[] = [];

        // ─── Unfilled shifts today ────────────────────────────────────────────
        const unfilledToday = shifts.filter(
            s => s.date === todayStr && s.filledCount < s.totalRequired
        );
        if (unfilledToday.length > 0) {
            notifications.push({
                id: 'unfilled-today',
                title: `⚠️ ${unfilledToday.length} משמרות לא מאויישות היום`,
                message: unfilledToday.map(s => s.title).join(', '),
                time: 'היום',
                type: 'alert',
                read: false,
            });
        }

        // ─── Unfilled shifts tomorrow ─────────────────────────────────────────
        const unfilledTomorrow = shifts.filter(
            s => s.date === tomorrowStr && s.filledCount < s.totalRequired
        );
        if (unfilledTomorrow.length > 0) {
            notifications.push({
                id: 'unfilled-tomorrow',
                title: `⏰ ${unfilledTomorrow.length} משמרות פתוחות מחר`,
                message: unfilledTomorrow.map(s => s.title).join(', '),
                time: 'מחר',
                type: 'alert',
                read: false,
            });
        }

        // ─── Partially unfilled in the next 48h ──────────────────────────────
        const unfilledSoon = shifts.filter(
            s => s.date === dayAfterStr && s.filledCount < s.totalRequired
        );
        if (unfilledSoon.length > 0) {
            notifications.push({
                id: 'unfilled-2days',
                title: `📋 ${unfilledSoon.length} משמרות חסרות בעוד יומיים`,
                message: unfilledSoon.map(s => `${s.title} (${s.filledCount}/${s.totalRequired})`).join(', '),
                time: 'בעוד יומיים',
                type: 'info',
                read: false,
            });
        }

        // ─── Fully filled shifts this week (positive feedback) ───────────────
        const fullyFilled = shifts.filter(
            s => s.filledCount >= s.totalRequired && s.totalRequired > 0 && s.date >= todayStr
        );
        if (fullyFilled.length > 0) {
            notifications.push({
                id: 'fully-filled',
                title: `✅ ${fullyFilled.length} משמרות מאויישות במלואן`,
                message: fullyFilled.slice(0, 3).map(s => `${s.title} (${s.date.slice(5).replace('-', '/')})`).join(', ')
                    + (fullyFilled.length > 3 ? ` ו-${fullyFilled.length - 3} נוספות` : ''),
                time: 'השבוע',
                type: 'success',
                read: true, // not urgent — start as read
            });
        }

        return notifications;
    }, [shifts]);
}
