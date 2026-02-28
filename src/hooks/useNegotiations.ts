import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface NegotiationLog {
    id: string;
    businessId: string;
    employeePhone: string;
    message: string;
    sender: 'ai' | 'employee' | 'system';
    timestamp: string; // ISO string
}

export function useNegotiations(businessId: string | undefined) {
    const [logs, setLogs] = useState<NegotiationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!businessId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLogs([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'negotiation_logs'),
            where('businessId', '==', businessId)
        );

        const failSafe = setTimeout(() => setLoading(false), 3000);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            clearTimeout(failSafe);
            const logsData: NegotiationLog[] = [];
            snapshot.forEach((doc) => {
                logsData.push({ id: doc.id, ...doc.data() } as NegotiationLog);
            });

            // Sort by timestamp ascending
            logsData.sort((a, b) => {
                const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return (Number.isNaN(timeA) ? 0 : timeA) - (Number.isNaN(timeB) ? 0 : timeB);
            });

            setLogs(logsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching negotiation logs:", err);
            setError(err.message);
            setLoading(false);
        });

        return () => {
            clearTimeout(failSafe);
            unsubscribe();
        };
    }, [businessId]);

    return { logs, loading, error };
}
