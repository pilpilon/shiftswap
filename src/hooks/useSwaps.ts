import { useState, useEffect } from 'react';
import { getFirestore, collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

export interface SwapRequest {
    id: string;
    date: string;
    shiftTitle: string;
    role: string;
    originalEmployee: string;
    originalPhone: string;
    reason: string;
    status: 'pending' | 'covered';
    coveredBy?: string;
    urgency: 'high' | 'medium' | 'low';
    createdAt: string;
}

export function useSwaps(businessId?: string) {
    const [swaps, setSwaps] = useState<SwapRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!businessId) {

            setSwaps([]);
            setLoading(false);
            return;
        }

        const db = getFirestore();
        const swapsRef = collection(db, 'businesses', businessId, 'swaps');

        const unsubscribe = onSnapshot(swapsRef, (snapshot) => {
            const loadedSwaps: SwapRequest[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as SwapRequest));

            // Sort by creation time, newest first
            loadedSwaps.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                // If invalid date string was provided, getTime() returns NaN. Fallback to 0.
                return (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA);
            });

            setSwaps(loadedSwaps);
            setLoading(false);
        }, (err) => {
            console.error("Error loading swaps:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [businessId]);

    const deleteSwap = async (swapId: string) => {
        if (!businessId) return;
        const db = getFirestore();
        try {
            await deleteDoc(doc(db, 'businesses', businessId, 'swaps', swapId));
        } catch (error) {
            console.error('Error deleting swap:', error);
            throw error;
        }
    };

    return { swaps, loading, deleteSwap };
}
