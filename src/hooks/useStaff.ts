import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { type SkillLevel } from './useShifts'; // Import SkillLevel

export interface StaffMember {
    id: string;
    businessId: string;
    name: string;
    phone: string;
    roles: string[]; // Changed from single role string to string[]
    skillLevel: SkillLevel; // Added skill level
}

export function useStaff(businessId: string | undefined) {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!businessId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
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
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                // Handle legacy docs where role was a string, and skillLevel was missing
                const roles = data.roles || (data.role ? [data.role] : []);
                const skillLevel = data.skillLevel || 'standard';

                staffData.push({
                    ...data,
                    id: docSnap.id,
                    roles,
                    skillLevel
                } as StaffMember);
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

    const addStaffMember = async (name: string, phone: string, roles: string[], skillLevel: SkillLevel) => {
        if (!businessId) throw new Error("No business ID");
        return await addDoc(collection(db, 'staff'), {
            businessId,
            name,
            phone,
            roles,
            skillLevel,
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
