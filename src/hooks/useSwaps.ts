import { useState, useEffect } from 'react';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';

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
            loadedSwaps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setSwaps(loadedSwaps);
            setLoading(false);
        }, (err) => {
            console.error("Error loading swaps:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [businessId]);

    return { swaps, loading };
}
