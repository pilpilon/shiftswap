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

    // Track assigned staff globally per date to prevent double-booking on the same day
    const assignedPerDate: Record<string, Set<string>> = {};

    // First pass: populate assignedPerDate with existing manual/previous assignments
    for (const shift of shifts) {
        if (!assignedPerDate[shift.date]) {
            assignedPerDate[shift.date] = new Set<string>();
        }
        for (const req of (shift.roleRequirements || [])) {
            for (const id of (req.assignedIds || [])) {
                assignedPerDate[shift.date].add(id);
            }
        }
    }

    for (const shift of shifts) {
        const shiftDayHe = getHebrewDay(shift.date);
        const dateAssignedSet = assignedPerDate[shift.date];

        // Filter the staff pool: include those who declare availability
        const availableStaff = staff.filter(member => {
            const phone = normalizePhone(member.phone);
            const memberDays = availabilityMap[phone];
            return memberDays && memberDays.includes(shiftDayHe);
        });

        // Do NOT clear existing assignments: keep them!
        const existingRequirements = shift.roleRequirements.map(req => ({
            ...req,
            assignedIds: req.assignedIds ? [...req.assignedIds] : []
        }));

        const { totalFilled, updatedRequirements } = computeFilledCount(existingRequirements, availableStaff, dateAssignedSet);

        await updateDoc(doc(db, 'businesses', businessId!, 'shifts', shift.id), {
            filledCount: totalFilled,
            roleRequirements: updatedRequirements
        });

        results.push({ shiftId: shift.id, filledCount: totalFilled });
    }

    return results;
}

/**
 * Count how many role-slots can be filled given the available staff pool.
 * Respects existing assignments and prevents same-day double booking.
 */
function computeFilledCount(
    requirements: RoleRequirement[],
    staff: StaffMember[],
    dateAssignedSet: Set<string>
): { totalFilled: number, updatedRequirements: RoleRequirement[] } {
    // Build a working copy of available staff
    const available = [...staff];
    let totalFilled = 0;
    const updatedRequirements: RoleRequirement[] = [];

    for (const req of requirements) {
        // We only need to fill the *remaining* slots
        let needed = req.count - (req.assignedIds?.length || 0);

        // Accumulate existing manual assignments into the total length
        totalFilled += (req.assignedIds?.length || 0);

        const requiredRank = SKILL_RANK[req.skillLevel] ?? 1;
        const newReq = { ...req, assignedIds: req.assignedIds ? [...req.assignedIds] : [] };

        for (let i = available.length - 1; i >= 0 && needed > 0; i--) {
            const member = available[i];

            // ALREADY assigned on this date? Skip them.
            if (dateAssignedSet.has(member.id)) {
                available.splice(i, 1);
                continue;
            }

            const memberRank = SKILL_RANK[member.skillLevel] ?? 1;
            const roleMatch = member.roles?.some(
                (r) => r.trim() === req.role.trim()
            );

            if (roleMatch && memberRank >= requiredRank) {
                totalFilled++;
                needed--;
                newReq.assignedIds.push(member.id);
                // Mark globally assigned for this date
                dateAssignedSet.add(member.id);
                // Remove from local shift pool
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
