import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Shift {
    id: string;
    businessId: string;
    date: string; // ISO String or simple YYYY-MM-DD
    title: string; // e.g., 'בוקר (08:00 - 16:00)'
    totalRequired: number;
    filledCount: number;
    isUrgent: boolean;
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

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const shiftsData: Shift[] = [];
            snapshot.forEach((doc) => {
                shiftsData.push({ id: doc.id, ...doc.data() } as Shift);
            });

            // Sort by date (assuming YYYY-MM-DD logic)
            shiftsData.sort((a, b) => a.date.localeCompare(b.date));

            setShifts(shiftsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching shifts:", err);
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [businessId]);

    const addShift = async (date: string, title: string, totalRequired: number, isUrgent: boolean = false) => {
        if (!businessId) throw new Error("No business ID");
        return await addDoc(collection(db, 'shifts'), {
            businessId,
            date,
            title,
            totalRequired,
            filledCount: 0,
            isUrgent,
            createdAt: new Date().toISOString()
        });
    };

    const removeShift = async (shiftId: string) => {
        return await deleteDoc(doc(db, 'shifts', shiftId));
    };

    const updateShift = async (shiftId: string, data: Partial<Shift>) => {
        return await updateDoc(doc(db, 'shifts', shiftId), data);
    };

    return { shifts, loading, error, addShift, removeShift, updateShift };
}
