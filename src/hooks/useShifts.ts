import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Skill levels for workers - non-offensive, professional terminology
export type SkillLevel = 'star' | 'standard' | 'junior';

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
    star: '⭐ כוכב',
    standard: '✓ סטנדרטי',
    junior: '◎ מתחיל',
};

export interface RoleRequirement {
    role: string;       // e.g., "מלצר", "טבח", "מארחת"
    count: number;      // total needed for this role
    skillLevel: SkillLevel; // required skill level
    startTime?: string; // e.g. "21:00" — optional per-role start (within shift window)
    endTime?: string;   // e.g. "24:00" — optional per-role end
    assignedIds?: string[]; // IDs of staff members assigned to this role
}

export interface Shift {
    id: string;
    businessId: string;
    date: string; // YYYY-MM-DD
    title: string; // e.g., 'בוקר (08:00 - 16:00)'
    totalRequired: number; // sum of all role counts (computed)
    filledCount: number;
    roleRequirements: RoleRequirement[]; // NEW: role+level breakdown
    isUrgent?: boolean; // kept for backward-compat, no longer set from UI
}

export function useShifts(businessId: string | undefined) {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!businessId) {

            setShifts([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'shifts'),
            where('businessId', '==', businessId)
        );

        const failSafe = setTimeout(() => setLoading(false), 3000);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            clearTimeout(failSafe);
            const shiftsData: Shift[] = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data() as Omit<Shift, 'id'>;
                // Normalize: ensure roleRequirements always exists (fallback for old docs)
                shiftsData.push({
                    ...data,
                    id: docSnap.id,
                    roleRequirements: data.roleRequirements ?? [],
                } as Shift);
            });

            shiftsData.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
            setShifts(shiftsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching shifts:", err);
            setError(err.message);
            setLoading(false);
        });

        return () => {
            clearTimeout(failSafe);
            unsubscribe();
        };
    }, [businessId]);

    const addShift = async (
        date: string,
        title: string,
        roleRequirements: RoleRequirement[]
    ) => {
        if (!businessId) throw new Error("No business ID");
        const totalRequired = roleRequirements.reduce((sum, r) => sum + r.count, 0);
        return await addDoc(collection(db, 'shifts'), {
            businessId,
            date,
            title,
            totalRequired,
            filledCount: 0,
            roleRequirements,
            isUrgent: false,
            createdAt: new Date().toISOString()
        });
    };

    const removeShift = async (shiftId: string) => {
        return await deleteDoc(doc(db, 'shifts', shiftId));
    };

    const updateShift = async (shiftId: string, data: Partial<Shift>) => {
        return await updateDoc(doc(db, 'shifts', shiftId), data as Record<string, unknown>);
    };

    return { shifts, loading, error, addShift, removeShift, updateShift };
}
