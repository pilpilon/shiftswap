import { updateDoc, doc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { type Shift, type RoleRequirement } from './useShifts';
import { type StaffMember } from './useStaff';

// ────────────────────────────────────────────────────────────────────────────
// Auto-assign logic (Availability-Aware)
// Matches staff to shift role requirements based on:
//  1. Availability: employee must have submitted the shift's day-of-week
//  2. Role match (staff.roles includes requirement.role)
//  3. Skill level match: star satisfies star/standard/junior; standard satisfies standard/junior; junior satisfies junior
// ────────────────────────────────────────────────────────────────────────────

const SKILL_RANK: Record<string, number> = {
    star: 3,
    standard: 2,
    junior: 1,
};

// Hebrew weekday names ordered Sun-Sat (matching JS Date.getDay())
const WEEKDAY_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/** Format a YYYY-MM-DD date as the corresponding Hebrew day name */
function getHebrewDay(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00'); // noon to avoid DST edge cases
    return WEEKDAY_HE[d.getDay()];
}

/** Current ISO week key, e.g. "2026-W08" */
function getCurrentWeekKey(): string {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((now.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Normalize a phone number to 972XXXXXXXXX format */
function normalizePhone(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '972' + clean.slice(1);
    return clean;
}

/**
 * Fetch all submitted availability for the current week.
 * Returns a map of normalizedPhone -> string[] (Hebrew day names)
 */
async function fetchWeekAvailability(businessId: string): Promise<Record<string, string[]>> {
    const weekKey = getCurrentWeekKey();
    const weekRef = collection(db, 'availability', businessId, weekKey);
    const snap = await getDocs(weekRef);
    const map: Record<string, string[]> = {};
    snap.forEach(docSnap => {
        map[docSnap.id] = docSnap.data().days || [];
    });
    return map;
}

/**
 * Given a list of shifts and available staff, compute how many slots are filled
 * for each shift (by availability + role + skill matching) and persist to Firestore.
 */
export async function runAutoAssign(
    shifts: Shift[],
    staff: StaffMember[],
    businessId?: string
): Promise<{ shiftId: string; filledCount: number }[]> {
    const results: { shiftId: string; filledCount: number }[] = [];

    // Fetch availability map once for the entire run
    let availabilityMap: Record<string, string[]> = {};
    const hasAvailability = businessId && businessId.length > 0;
    if (hasAvailability) {
        try {
            availabilityMap = await fetchWeekAvailability(businessId);
        } catch (err) {
            console.warn('[AutoAssign] Could not fetch availability — assigning without day filter:', err);
        }
    }

    for (const shift of shifts) {
        const shiftDayHe = getHebrewDay(shift.date);

        // Filter the staff pool: only include those who declared they are available on this day.
        // If the availability collection is empty (no one submitted), fall back to all staff.
        const availableStaff = Object.keys(availabilityMap).length === 0
            ? staff // fallback: no submissions yet → keep legacy MVP behavior
            : staff.filter(member => {
                const phone = normalizePhone(member.phone);
                const memberDays = availabilityMap[phone];
                // If employee submitted, check if they listed this day.
                // If employee never submitted at all, exclude them.
                return memberDays && memberDays.includes(shiftDayHe);
            });

        // Clear previous assignments to avoid duplicate accumulation
        const cleanRequirements = shift.roleRequirements.map(req => ({ ...req, assignedIds: [] }));

        const { totalFilled, updatedRequirements } = computeFilledCount(cleanRequirements, availableStaff);

        await updateDoc(doc(db, 'shifts', shift.id), {
            filledCount: totalFilled,
            roleRequirements: updatedRequirements
        });

        results.push({ shiftId: shift.id, filledCount: totalFilled });
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
): { totalFilled: number, updatedRequirements: RoleRequirement[] } {
    // Build a working copy of available staff (each can be used once per shift)
    const available = [...staff];
    let totalFilled = 0;
    const updatedRequirements: RoleRequirement[] = [];

    for (const req of requirements) {
        let needed = req.count;
        const requiredRank = SKILL_RANK[req.skillLevel] ?? 1;

        const newReq = { ...req, assignedIds: req.assignedIds ? [...req.assignedIds] : [] };

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
                newReq.assignedIds.push(member.id);
                // Remove from available pool so the same person isn't double-assigned
                available.splice(i, 1);
            }
        }
        updatedRequirements.push(newReq);
    }

    return { totalFilled, updatedRequirements };
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
