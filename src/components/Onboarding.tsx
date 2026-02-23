import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Save, ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface OnboardingProps {
    onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [businessName, setBusinessName] = useState(user?.businessName === 'העסק שלי' || user?.businessName === 'My Business' ? '' : (user?.businessName || ''));
    const [saving, setSaving] = useState(false);

    const handleNext = async () => {
        if (step < 2) {
            setStep(step + 1);
        } else {
            setSaving(true);
            try {
                if (user?.id) {
                    await setDoc(doc(db, 'users', user.id), {
                        businessName: businessName,
                        name: user.name || 'Google User',
                        businessId: user.id,
                        role: 'manager'
                    }, { merge: true });
                }
                onComplete();
            } catch (err) {
                console.error("Error saving business details:", err);
                setSaving(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
            >
                <div className="bg-brand-blue p-8 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
                            <Store className="w-8 h-8 text-brand-gold" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">הגדרת העסק שלך</h1>
                        <p className="text-brand-gold/90 mt-2 text-sm">עוד רגע מתחילים לנהל משמרות בקלות</p>
                    </div>
                </div>

                <div className="p-8">
                    <div className="mb-8 flex justify-center gap-2">
                        <div className={`h-2 rounded-full transition-all duration-300 ${step >= 1 ? 'w-8 bg-brand-blue' : 'w-2 bg-slate-200'}`}></div>
                        <div className={`h-2 rounded-full transition-all duration-300 ${step >= 2 ? 'w-8 bg-brand-blue' : 'w-2 bg-slate-200'}`}></div>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        שם העסק (מסעדה, בית קפה וכו')
                                    </label>
                                    <input
                                        type="text"
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        placeholder="הקפה של ירדן..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all"
                                        autoFocus
                                    />
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6 text-center"
                            >
                                <div className="bg-blue-50 text-brand-blue p-6 rounded-2xl border border-blue-100">
                                    <h3 className="font-bold text-lg mb-2">חיבור לוואטסאפ</h3>
                                    <p className="text-sm opacity-90 mb-4">
                                        החשבון של <span className="font-bold">{businessName || 'העסק שלך'}</span> מוכן לפעולה.
                                        מכאן תועברו למערכת הניהול.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="mt-8">
                        <button
                            onClick={handleNext}
                            disabled={(step === 1 && !businessName.trim()) || saving}
                            className="w-full bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20 transition-all active:scale-95"
                        >
                            {saving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {step === 1 ? 'המשך' : 'סיום ומעבר למערכת'}
                                    {step === 1 ? <ChevronLeft className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
