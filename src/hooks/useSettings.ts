import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export interface AppSettings {
    enableWeekendSwaps: boolean;
    enableCashBonus: boolean;
    enableTaxi: boolean;
    botTone: string;
    warningHours: number;
    customRules: string;
}

const defaultSettings: AppSettings = {
    enableWeekendSwaps: true,
    enableCashBonus: true,
    enableTaxi: false,
    botTone: 'צעיר וקליל (אחי, מה קורה?)',
    warningHours: 24,
    customRules: ''
};

export function useSettings() {
    const { user } = useAuth();
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        const userDocRef = doc(db, 'users', user.id);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().settings) {
                setSettings({ ...defaultSettings, ...docSnap.data().settings });
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.id]);

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        if (!user?.id) return;

        const mergedSettings = { ...settings, ...newSettings };

        await updateDoc(doc(db, 'users', user.id), {
            settings: mergedSettings
        });

        // Optimistic update
        setSettings(mergedSettings);
    };

    return { settings, loading, updateSettings };
}
