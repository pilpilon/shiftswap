import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { type Shift, type RoleRequirement } from './useShifts';
import { type StaffMember } from './useStaff';

// ────────────────────────────────────────────────────────────────────────────
// Auto-assign logic
// Matches staff to shift role requirements based on:
//  1. Role match (staff.roles includes requirement.role)
//  2. Skill level match: star satisfies star/standard/junior; standard satisfies standard/junior; junior satisfies junior
// Returns the updated filledCount for each shift.
// ────────────────────────────────────────────────────────────────────────────

const SKILL_RANK: Record<string, number> = {
    star: 3,
    standard: 2,
    junior: 1,
};

/**
 * Given a list of shifts and available staff, compute how many slots are filled
 * for each shift (by role + skill matching) and persist to Firestore.
 */
export async function runAutoAssign(
    shifts: Shift[],
    staff: StaffMember[]
): Promise<{ shiftId: string; filledCount: number }[]> {
    const results: { shiftId: string; filledCount: number }[] = [];

    for (const shift of shifts) {
        const filledCount = computeFilledCount(shift.roleRequirements, staff);

        // Only update if value changed to avoid unnecessary writes
        if (filledCount !== shift.filledCount) {
            await updateDoc(doc(db, 'shifts', shift.id), { filledCount });
        }

        results.push({ shiftId: shift.id, filledCount });
    }

    return results;
}

/**
 * Count how many role-slots can be filled given the available staff pool.
 * Uses a greedy approach: each staff member can fill at most one slot across all roles in a shift.
 */
function computeFilledCount(
    requirements: RoleRequirement[],
    staff: StaffMember[]
): number {
    // Build a working copy of available staff (each can be used once per shift)
    const available = [...staff];
    let totalFilled = 0;

    for (const req of requirements) {
        let needed = req.count;
        const requiredRank = SKILL_RANK[req.skillLevel] ?? 1;

        for (let i = available.length - 1; i >= 0 && needed > 0; i--) {
            const member = available[i];
            const memberRank = SKILL_RANK[member.skillLevel] ?? 1;

            // Check role match and skill level (higher rank satisfies lower requirement)
            const roleMatch = member.roles?.some(
                (r) => r.trim() === req.role.trim()
            );
            if (roleMatch && memberRank >= requiredRank) {
                totalFilled++;
                needed--;
                // Remove from available pool so the same person isn't double-assigned
                available.splice(i, 1);
            }
        }
    }

    return totalFilled;
}

/**
 * Get the deadline label (day name in Hebrew) for a given weekday index.
 */
export const WEEKDAY_LABELS_HE: Record<number, string> = {
    0: 'ראשון',
    1: 'שני',
    2: 'שלישי',
    3: 'רביעי',
    4: 'חמישי',
    5: 'שישי',
    6: 'שבת',
};

/**
 * Check if today has passed the submission deadline day of the current week.
 * Returns true if today >= deadlineDay in the current week.
 */
export function isDeadlinePassed(deadlineDayOfWeek: number): boolean {
    if (deadlineDayOfWeek < 0) return false;
    const today = new Date().getDay(); // 0=Sun
    return today >= deadlineDayOfWeek;
}
