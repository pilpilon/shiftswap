import { motion } from 'framer-motion';
import { ShieldCheck, CalendarClock, LogOut, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { initializePaddle } from '@paddle/paddle-js';
import type { Paddle } from '@paddle/paddle-js';
import { useState, useEffect } from 'react';
export default function Paywall() {
    const { user, logout } = useAuth();
    const [paddle, setPaddle] = useState<Paddle>();
    const [loading, setLoading] = useState(false);

    const upgradeUserToPro = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            // We removed the insecure client-side updateDoc here.
            // The server-side webhook (/api/webhooks/paddle) handles this now.
            alert("תודה על ההרשמה! חשבונך ישודרג ל-Pro תוך מספר רגעים (יש לרענן את העמוד).");
            window.location.reload();
        } catch (err) {
            console.error("Error handling upgrade UI:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        const initPaddle = async () => {
            const clientToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
            if (clientToken) {
                try {
                    const paddleInstance = await initializePaddle({
                        environment: (import.meta.env.VITE_PADDLE_ENV as 'sandbox' | 'production') || 'sandbox',
                        token: clientToken,
                        eventCallback: async (data) => {
                            if (data.name === 'checkout.completed') {
                                // Payment successful
                                await upgradeUserToPro();
                            }
                        }
                    });
                    if (paddleInstance) setPaddle(paddleInstance);
                } catch (err) {
                    console.error("Failed to initialize Paddle:", err);
                }
            }
        };
        initPaddle();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);



    const handleSubscribe = async () => {
        if (paddle) {
            const priceId = import.meta.env.VITE_PADDLE_PRICE_ID;
            if (priceId) {
                paddle.Checkout.open({
                    items: [{ priceId, quantity: 1 }],
                    customer: { email: user?.name || '', address: { countryCode: "IL" } },
                    customData: { userId: user?.id }
                });
            } else {
                alert("שגיאה: חסר מזהה מוצר של Paddle בהגדרות המערכת (Vite Envs).");
            }
        } else {
            // Development fallback
            if (confirm("הערת פיתוח: המערכת לא מחוברת לחשבון Paddle כרגע. האם תרצה לאשר מנוי חינמי לצורכי בדיקה?")) {
                await upgradeUserToPro();
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
            >
                <div className="bg-brand-blue p-10 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="bg-white/10 p-3 rounded-2xl mb-4 backdrop-blur-sm border border-white/20">
                            <CalendarClock className="w-10 h-10 text-brand-gold" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight mb-2">שדרג למנוי פרו</h1>
                        <p className="text-brand-gold/90 text-sm max-w-sm mx-auto">
                            החשבון של <span className="font-bold text-white">{user?.businessName || 'העסק שלך'}</span> נוצר בהצלחה! כדי להתחיל לחבר עובדים ולנהל משמרות אוטומטית עליך לעבור לגרסת ה-Pro החודשית.
                        </p>
                    </div>
                </div>

                <div className="p-8 md:p-12">
                    <div className="flex flex-col md:flex-row gap-8 items-center justify-center mb-8">
                        <div className="text-center md:text-right flex-1">
                            <h3 className="text-2xl font-bold text-slate-800 mb-4">חבילת הכל כלול</h3>
                            <ul className="space-y-4">
                                {[
                                    'ניהול של עד 100 עובדים',
                                    'משא ומתן AI אוטומטי בוואטסאפ ללא הגבלה',
                                    'התראות ווידוא הגעה',
                                    'שליטה בחוקי המודיעין המלאכותי',
                                    'תמיכה בוואטסאפ 24/7'
                                ].map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-3">
                                        <div className="rounded-full bg-emerald-100 p-1 flex-shrink-0">
                                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <span className="text-slate-700 font-medium">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center flex-1 w-full shrink-0">
                            <div className="text-sm font-bold tracking-wider text-brand-blue mb-2 uppercase">למיקום יחיד</div>
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <span className="text-5xl font-extrabold text-slate-900">₪120</span>
                                <span className="text-slate-500 font-medium mt-2">/חודש</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-6">
                                ✓ 14 ימים ראשונים — חינם לגמרי
                            </div>
                            <button
                                onClick={handleSubscribe}
                                disabled={loading}
                                className="w-full bg-brand-gold hover:bg-yellow-400 text-slate-900 font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-yellow-200 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        התחל 14 ימי ניסיון חינם
                                        <ArrowLeft className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                                לא חיוב היום. אחרי 14 יום — ₪120/חודש. ביטול חופשי בכל עת.
                            </p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 text-center">
                        <button
                            onClick={async () => {
                                await logout();
                                window.location.reload();
                            }}
                            className="text-sm text-slate-500 hover:text-slate-700 font-medium inline-flex items-center gap-2 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            התנתק בינתיים
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
