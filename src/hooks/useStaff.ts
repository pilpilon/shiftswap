import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface StaffMember {
    id: string;
    businessId: string;
    name: string;
    phone: string;
    role: string;
}

export function useStaff(businessId: string | undefined) {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!businessId) {
            setStaff([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'staff'),
            where('businessId', '==', businessId)
        );

        const failSafe = setTimeout(() => setLoading(false), 3000);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            clearTimeout(failSafe);
            const staffData: StaffMember[] = [];
            snapshot.forEach((doc) => {
                staffData.push({ id: doc.id, ...doc.data() } as StaffMember);
            });
            setStaff(staffData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching staff:", err);
            setError(err.message);
            setLoading(false);
        });

        return () => {
            clearTimeout(failSafe);
            unsubscribe();
        };
    }, [businessId]);

    const addStaffMember = async (name: string, phone: string, role: string) => {
        if (!businessId) throw new Error("No business ID");
        return await addDoc(collection(db, 'staff'), {
            businessId,
            name,
            phone,
            role,
            createdAt: new Date()
        });
    };

    const removeStaffMember = async (staffId: string) => {
        return await deleteDoc(doc(db, 'staff', staffId));
    };

    const updateStaffMember = async (staffId: string, data: Partial<StaffMember>) => {
        return await updateDoc(doc(db, 'staff', staffId), data);
    };

    return { staff, loading, error, addStaffMember, removeStaffMember, updateStaffMember };
}
