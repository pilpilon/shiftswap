// @ts-nocheck
import { motion } from 'framer-motion';
import { CalendarClock, MessageCircle, Zap, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-brand-blue text-brand-gold p-1.5 rounded-lg">
                            <CalendarClock className="w-6 h-6" />
                        </div>
                        <span className="text-xl font-bold font-sans text-brand-blue">ShiftSwap<span className="text-brand-gold">.ai</span></span>
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        className="text-sm font-medium text-brand-blue hover:text-brand-blue/80 px-4 py-2 rounded-full transition-colors"
                    >
                        כניסת מנהלים
                    </button>
                </div>
            </header>

            {/* Main Hero */}
            <main className="flex-1">
                <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-40">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-white"></div>

                    <div className="container mx-auto px-4">
                        <div className="max-w-3xl mx-auto text-center space-y-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-brand-blue border border-blue-100 shadow-sm text-sm font-medium"
                            >
                                <Zap className="w-4 h-4 text-brand-gold fill-brand-gold" />
                                מערכת הניהול שחוסכת לכם שעתיים ביום
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900"
                            >
                                סידור עבודה <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-blue-600">
                                    שאשכרה עובד בוואטסאפ
                                </span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="text-xl text-slate-600 max-w-2xl mx-auto"
                            >
                                רובוט AI חכם שמנהל משא ומתן עם העובדים שלכם, סוגר משמרות ברגע האחרון, וחוסך לכם את הכאב ראש של טלפונים והודעות סרק.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
                            >
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white px-8 py-4 rounded-full text-lg font-medium shadow-lg shadow-brand-blue/25 transition-all active:scale-95"
                                >
                                    התחילו עכשיו חינם
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <button className="w-full sm:w-auto text-slate-600 hover:text-slate-900 px-8 py-4 rounded-full text-lg font-medium transition-colors">
                                    צפו בסרטון הדגמה
                                </button>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Social Proof Numbers */}
                <section className="py-10 bg-slate-900 text-white">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto text-center">
                            {[
                                { value: '2+', label: 'שעות שחוסכות ביום' },
                                { value: '94%', label: 'כיסוי משמרות ראשון לאחרון' },
                                { value: '30 שניות', label: 'זמן ממוצע לסגירת משמרת' },
                            ].map((stat, i) => (
                                <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                                    <div className="text-3xl font-extrabold text-brand-gold">{stat.value}</div>
                                    <div className="text-sm text-slate-300 mt-1">{stat.label}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Feature Highlights */}
                <section className="py-20 bg-white">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl font-extrabold text-slate-900 text-center mb-12">ניהול משמרות חכם — ישירות בוואטסאפ</h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                { icon: MessageCircle, title: 'משא ומתן אוטומטי', desc: 'הבוט מציע "קח את משמרת ערב, ותקבל את שישי חופש" לחלוטין לבד לפי חוקים שתגדירו.' },
                                { icon: Zap, title: '100% בוואטסאפ', desc: 'אין צורך להוריד אפליקציה. העובדים כנראה כבר שם בכל מקרה, אז הבאנו את סידור העבודה אליהם.' },
                                { icon: ShieldCheck, title: 'אבטחת הגעה', desc: 'וידוא הגעה אוטומטי 4 שעות לפני המשמרת. מישהו מבריז? המערכת כבר תמצא לו מחליף.' },
                            ].map((feature, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-brand-blue group-hover:text-white group-hover:border-brand-blue transition-all">
                                        <feature.icon className="w-6 h-6 text-brand-blue group-hover:text-white transition-colors" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                                    <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* PWA Install CTA */}
                <section className="py-16 bg-gradient-to-r from-brand-blue to-blue-700 text-white text-center">
                    <div className="container mx-auto px-4 max-w-2xl space-y-4">
                        <h2 className="text-2xl font-bold">הוסיפו לדף הבית — עובד כמו אפליקציה</h2>
                        <p className="text-blue-100 text-sm">ShiftSwap AI זמינה כ-PWA. פתחו בדפדפן הנייד, לחצו &quot;הוסף למסך הבית&quot; — וזהו.</p>
                        <div className="flex items-center justify-center gap-2 text-xs text-blue-200 opacity-80">
                            <span>🍎 iOS</span><span>·</span><span>🤖 Android</span><span>·</span><span>💻 Desktop</span>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white py-8">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-slate-500 text-sm">© {new Date().getFullYear()} ShiftSwap AI. כל הזכויות שמורות.</p>
                        <nav className="flex gap-6 text-sm text-slate-400">
                            <a href="/privacy" className="hover:text-slate-700 transition-colors">פרטיות</a>
                            <a href="/terms" className="hover:text-slate-700 transition-colors">תנאי שימוש</a>
                            <a href="mailto:hello@shiftswap.ai" className="hover:text-slate-700 transition-colors">צור קשר</a>
                        </nav>
                    </div>
                </div>
            </footer>
        </div>
    );
}
