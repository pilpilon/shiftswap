import { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Format current ISO week as "YYYY-WNN"
function getCurrentWeekKey(): string {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((now.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export type AvailabilityData = {
    days: string[];
    notes?: string;
    isPending?: boolean;
};

// Map of phone -> AvailabilityData
export type AvailabilityMap = Record<string, AvailabilityData>;

/**
 * Fetches all employee availability submissions for the current week.
 * The phone key is in normalized format: 972XXXXXXXXX (matching backend).
 */
export function useAvailability(businessId?: string) {
    const [availability, setAvailability] = useState<AvailabilityMap>({});
    const [loading, setLoading] = useState(false);
    const [weekKey, setWeekKey] = useState(getCurrentWeekKey());

    useEffect(() => {
        if (!businessId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAvailability({});
            return;
        }

        setLoading(true);
        const db = getFirestore();
        const weekRef = collection(db, 'businesses', businessId, 'availability', weekKey, 'submissions');

        getDocs(weekRef).then(snap => {
            const map: AvailabilityMap = {};
            snap.forEach(docSnap => {
                // docSnap.id is the normalized phone
                const data = docSnap.data();
                map[docSnap.id] = {
                    days: data.days || [],
                    notes: data.notes,
                    isPending: data.isPending ?? false
                };
            });
            setAvailability(map);
        }).catch(err => {
            console.error('Error fetching availability:', err);
        }).finally(() => setLoading(false));
    }, [businessId, weekKey]);

    // Normalize a phone number to the 972XXXXXXXXX format for lookup
    function normalizePhone(phone: string): string {
        let clean = phone.replace(/\D/g, '');
        if (clean.startsWith('0')) clean = '972' + clean.slice(1);
        return clean;
    }

    // Get availability for a specific employee by their phone number
    function getEmployeeAvailability(phone: string): AvailabilityData | null {
        const normalized = normalizePhone(phone);
        if (Object.prototype.hasOwnProperty.call(availability, normalized)) {
            return availability[normalized];
        }
        return null;
    }

    return { availability, loading, weekKey, setWeekKey, getEmployeeAvailability, normalizePhone };
}
