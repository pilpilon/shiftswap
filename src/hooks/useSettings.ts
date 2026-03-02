import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export interface AppSettings {
    enableWeekendSwaps: boolean;
    enableCashBonus: boolean;
    maxBonusAmount: number; // Maximum bonus allowed per shift (ILS)
    enableTaxi: boolean;
    botTone: string;
    warningHours: number;
    customRules: string;
    // Day of week for staff submission deadline: 0=Sun, 1=Mon...6=Sat, -1=disabled
    submissionDeadlineDay: number;
    // Hours window during which the bot is allowed to contact employees (0-23)
    botActiveFrom: number;
    botActiveTo: number;
}

const defaultSettings: AppSettings = {
    enableWeekendSwaps: true,
    enableCashBonus: false,   // OFF by default — manager must explicitly enable
    maxBonusAmount: 50,       // ILS, used only when enableCashBonus is true
    enableTaxi: false,
    botTone: 'צעיר וקליל (אחי, מה קורה?)',
    warningHours: 24,
    customRules: '',
    submissionDeadlineDay: -1, // disabled by default
    botActiveFrom: 8,  // 08:00
    botActiveTo: 21,   // 21:00
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
