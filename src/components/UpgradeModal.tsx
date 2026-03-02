import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Zap, ExternalLink, Loader2 } from 'lucide-react';
import { usePaddle } from '../hooks/usePaddle';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail?: string;
}

// Ensure you replace this with your actual Paddle Price ID from the dashboard
const MONTHLY_PRICE_ID = import.meta.env.VITE_PADDLE_PRICE_ID || 'pri_01h...';

export default function UpgradeModal({ isOpen, onClose, userEmail }: UpgradeModalProps) {
    const { isInitialized, openCheckout } = usePaddle();
    const { user } = useAuth();
    const [isLoadingPortal, setIsLoadingPortal] = useState(false);

    const handleUpgrade = () => {
        openCheckout(MONTHLY_PRICE_ID, userEmail);
    };

    const handleManageSubscription = async () => {
        setIsLoadingPortal(true);
        try {
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch(`${API_URL}/api/paddle/customer-portal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
                }
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to open portal');
            }

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url; // Redirect to Paddle's hosted portal
            }
        } catch (err) {
            console.error('Error opening portal:', err);
            alert('לא הצלחנו לפתוח את פורטל ניהול המנוי. נא לנסות שוב מאוחר יותר או לפנות לתמיכה.');
        } finally {
            setIsLoadingPortal(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Header Image / Gradient */}
                        <div className="h-32 bg-gradient-to-br from-brand-blue to-blue-700 relative flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-gold to-transparent"></div>
                            <Zap className="w-16 h-16 text-brand-gold opacity-90 relative z-10" />
                            <button
                                onClick={onClose}
                                className="absolute top-4 left-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 text-center" dir="rtl">
                            {user?.isPro ? (
                                <>
                                    <h2 className="text-3xl font-extrabold text-slate-900 mb-2">ניהול מנוי Pro</h2>
                                    <p className="text-slate-600 mb-8 font-medium">המנוי הנוכחי פעיל ומעניק לך גישה מלאה למערכת.</p>

                                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 mb-8 flex flex-col items-center">
                                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-emerald-800">מנוי פעיל</h3>
                                        <p className="text-sm text-emerald-600 mt-1">נהנה מכל יכולות המערכת.</p>
                                    </div>

                                    <button
                                        onClick={handleManageSubscription}
                                        disabled={isLoadingPortal}
                                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg active:scale-[0.98]"
                                    >
                                        {isLoadingPortal ? (
                                            <><Loader2 className="w-5 h-5 animate-spin" /> פותח פורטל...</>
                                        ) : (
                                            <><ExternalLink className="w-5 h-5" /> ניהול / ביטול מנוי ב-Paddle</>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-3xl font-extrabold text-slate-900 mb-2">שדרגו ל-Pro</h2>
                                    <p className="text-slate-600 mb-8">פתחו את כל היכולות של תוכנת העבודה החכמה בעולם.</p>

                                    <div className="space-y-4 text-right bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
                                        {[
                                            'אינסוף הודעות וואטסאפ אוטומטיות',
                                            'ניהול עובדים ומשמרות ללא הגבלה',
                                            'וידוא הגעה חכם לפני המשמרת',
                                            'תמיכה פרימיום 24/7'
                                        ].map((feature, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                                <span className="text-slate-700 font-medium">{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleUpgrade}
                                        disabled={!isInitialized}
                                        className="w-full flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                                    >
                                        {isInitialized ? (
                                            <>
                                                הצטרפו עכשיו - 120 ש"ח / חודש
                                            </>
                                        ) : (
                                            'טוען מערכת תשלום...'
                                        )}
                                    </button>
                                </>
                            )}

                            <p className="text-xs text-slate-400 mt-4">
                                חיוב מאובטח מנוהל על ידי Paddle. {user?.isPro ? 'ניתן לשנות אמצעי תשלום, לעיין בקבלות ולבטל את המנוי בכל עת בפורטל.' : 'ניתן לבטל בכל עת.'}
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
