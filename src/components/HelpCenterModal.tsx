import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, Zap, X, Settings } from 'lucide-react';

interface HelpCenterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function HelpCenterModal({ isOpen, onClose }: HelpCenterModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl bg-slate-900 rounded-[32px] shadow-[0_0_50px_rgba(204,255,0,0.1)] border border-white/5 overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-8 py-6 flex items-center justify-between border-b border-white/5 bg-slate-900/50">
                        <button
                            onClick={onClose}
                            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all min-w-[48px] min-h-[48px]"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="text-right" dir="rtl">
                            <h2 className="text-2xl font-black text-white tracking-tight">איך המערכת עובדת?</h2>
                            <p className="text-sm text-slate-400 mt-1 font-medium">המדריך המהיר שלך לניהול משמרות באוטומט</p>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6" dir="rtl">

                        {/* Section 1: Roster */}
                        <div className="group rounded-2xl bg-white/5 border border-white/5 p-6 hover:bg-white/10 transition-all cursor-default">
                            <div className="flex items-start gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-brand-blue/20 text-brand-blue flex items-center justify-center shrink-0 border border-brand-blue/30 shadow-[0_0_20px_rgba(30,58,138,0.2)] group-hover:scale-105 transition-transform">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">סידור עבודה</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        כאן תוכלו לראות ולנהל את כל המשמרות השבועיות. משמרות "אדומות" (שחסרים בהן עובדים)
                                        יועברו אוטומטית לטיפול סוכן ה-AI. אתם יכולים גם להוסיף, לערוך ולמחוק משמרות באופן ידני.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: AI Agent */}
                        <div className="group rounded-2xl bg-white/5 border border-white/5 p-6 hover:bg-[#CCFF00]/5 transition-all cursor-default">
                            <div className="flex items-start gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-[#CCFF00]/10 text-[#CCFF00] flex items-center justify-center shrink-0 border border-[#CCFF00]/20 shadow-[0_0_20px_rgba(204,255,0,0.15)] group-hover:scale-105 transition-transform">
                                    <Zap className="w-6 h-6 fill-[#CCFF00]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">סוכן AI חכם להחלפות</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        הסוכן החכם שלנו יפנה בוואטסאפ לכל צוות העובדים שמסומנים כזמינים, ויציע להם (עד סכום מקסימלי שתגדירו)
                                        בונוס לעשות משמרת חסרה. אתם לא מתערבים בתהליך — עד שהמשמרת נסגרת ואתם מקבלים אישור אוטומטי!
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Staff */}
                        <div className="group rounded-2xl bg-white/5 border border-white/5 p-6 hover:bg-white/10 transition-all cursor-default">
                            <div className="flex items-start gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)] group-hover:scale-105 transition-transform">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">ניהול עובדים (Staff)</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        כאן תגדירו אילו עובדים פעילים, אילו עובדים מתאימים לאיזה תפקיד (למשל טבח מול מלצר),
                                        ותעדכנו את מספרי הטלפון שלהם, כדי שהסוכן ידע למי בדיוק ומתי לפנות אליהם.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Settings */}
                        <div className="group rounded-2xl bg-white/5 border border-white/5 p-6 hover:bg-white/10 transition-all cursor-default">
                            <div className="flex items-start gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)] group-hover:scale-105 transition-transform">
                                    <Settings className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">הגדרות וחיבור לוואטסאפ</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        כדי שהסוכן יוכל להתחיל לפעול מהמספר שלכם — היכנסו להגדרות &gt; "סרוק למכשיר מחובר".
                                        שם תמצאו QR Code, תסרקו ממכשיר הוואטסאפ שבו תרצו שהסוכן ייצג אתכם, וככה הוא יתחיל לעבוד בשבילכם מיד!
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer / CTA Action */}
                    <div className="p-6 bg-slate-900/80 border-t border-white/5 flex justify-center">
                        <button
                            onClick={onClose}
                            className="min-w-[48px] min-h-[48px] w-full px-8 py-4 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-950 font-black rounded-2xl transition-all active:scale-[0.98] shadow-[0_0_30px_rgba(204,255,0,0.3)] text-lg"
                        >
                            הבנתי, בואו נתחיל לעבוד!
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
