import { motion } from 'framer-motion';
import { CalendarClock, MessageCircle, Zap, ShieldCheck, ArrowLeft, BrainCircuit } from 'lucide-react';
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
                        onClick={() => {
                            document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-full transition-colors"
                    >
                        מחירים
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        className="text-sm font-medium bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 px-5 py-2.5 rounded-full transition-colors"
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
                                className="text-xl text-slate-600 max-w-2xl mx-auto mb-4"
                            >
                                רובוט AI חכם שמנהל משא ומתן עם העובדים שלכם, סוגר משמרות ברגע האחרון, וחוסך לכם את הכאב ראש של טלפונים והודעות סרק.
                            </motion.p>

                            {/* Product Video Demo - Anti AI Slop Styling */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                                className="relative mx-auto max-w-4xl pt-4 pb-8"
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-brand-blue/30 to-[#CCFF00]/20 blur-3xl -z-10 rounded-full" />
                                <div className="bg-slate-950 p-2 sm:p-4 rounded-[2rem] border border-white/10 shadow-[0_20px_60px_-15px_rgba(204,255,0,0.15)] backdrop-blur-xl relative overflow-hidden group">
                                    <video
                                        src="/shiftswap-demo.mp4"
                                        controls
                                        playsInline
                                        className="w-full h-auto rounded-[1.5rem] bg-black object-cover relative z-10"
                                        poster="/og-image.png"
                                    />
                                    {/* Subtle gradient overlay to tie into the UI */}
                                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950/40 to-transparent pointer-events-none rounded-b-[1.5rem]"></div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
                            >
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white px-8 py-4 rounded-full text-lg font-medium shadow-lg shadow-brand-blue/25 transition-all active:scale-95"
                                >
                                    התחילו 14 ימי ניסיון חינם
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => {
                                        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="w-full sm:w-auto text-slate-600 hover:text-slate-900 px-8 py-4 rounded-full text-lg font-medium transition-colors"
                                >
                                    צפו בחבילות המחירים
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
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { icon: MessageCircle, title: 'משא ומתן אוטומטי', desc: 'הבוט מציע "קח את משמרת ערב, ותקבל את שישי חופש" לחלוטין לבד לפי חוקים שתגדירו.' },
                                { icon: Zap, title: '100% בוואטסאפ', desc: 'אין צורך להוריד אפליקציה. העובדים כנראה כבר שם בכל מקרה, אז הבאנו את סידור העבודה אליהם.' },
                                { icon: ShieldCheck, title: 'אבטחת הגעה', desc: 'וידוא הגעה אוטומטי 4 שעות לפני המשמרת. מישהו מבריז? המערכת כבר תמצא לו מחליף.' },
                                { icon: BrainCircuit, title: 'AI שממלא פערים לבד', desc: 'הבוט מזהה משמרות ריקות בסידור שפורסם ויוצא מיוזמתו לחפש מתנדבים — לפני שאתם בכלל שמים לב לבעיה.' },
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

                {/* How It Works */}
                <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
                    <div className="container mx-auto px-4 relative z-10">
                        <div className="max-w-3xl mx-auto text-center mb-16">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-brand-gold mb-6"
                            >
                                <Zap className="w-4 h-4 fill-brand-gold" />
                                איך זה עובד?
                            </motion.div>
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4"
                            >
                                מ-0 לסידור עבודה מנוהל
                                <br /><span className="text-brand-gold">תוך 30 שניות</span>
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="text-slate-400 text-lg"
                            >
                                עובד לבד. אתם רק מאשרים.
                            </motion.p>
                        </div>

                        <div className="max-w-5xl mx-auto">
                            <div className="grid md:grid-cols-4 gap-6 relative">
                                {/* Connecting line desktop */}
                                <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent"></div>

                                {[
                                    {
                                        step: '01', emoji: '📋', title: 'בונים סידור',
                                        desc: 'מגדירים משמרות, תפקידים ועובדים. לוקח 5 דקות.',
                                        color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30', highlight: false,
                                    },
                                    {
                                        step: '02', emoji: '📤', title: 'מפרסמים בוואטסאפ',
                                        desc: 'לחיצה אחת — כל עובד מקבל את הסידור לנייד.',
                                        color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30', highlight: false,
                                    },
                                    {
                                        step: '03', emoji: '🤖', title: 'הבוט מנהל הכל',
                                        desc: 'ביטולים, החלפות, וידוא הגעה — AI עושה זאת לבד.',
                                        color: 'from-brand-gold/20 to-yellow-500/10', border: 'border-brand-gold/40', highlight: true,
                                    },
                                    {
                                        step: '04', emoji: '✅', title: 'אתם רק מאשרים',
                                        desc: 'קיבלתם התראה? אישרתם. זהו. הצוות מסודר.',
                                        color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30', highlight: false,
                                    },
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.15 }}
                                        className="relative flex flex-col items-center text-center px-2"
                                    >
                                        <div className={`relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br ${item.color} border ${item.border} flex flex-col items-center justify-center mb-6 ${item.highlight ? 'shadow-[0_0_30px_rgba(255,193,7,0.25)] scale-110' : ''}`}>
                                            <span className="text-2xl mb-0.5">{item.emoji}</span>
                                            <span className={`text-xs font-black tracking-widest ${item.highlight ? 'text-brand-gold' : 'text-slate-500'}`}>{item.step}</span>
                                        </div>
                                        <h3 className={`text-lg font-extrabold mb-2 ${item.highlight ? 'text-brand-gold' : 'text-white'}`}>{item.title}</h3>
                                        <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>

                                        {/* WhatsApp mockup on the AI step */}
                                        {item.highlight && (
                                            <div className="mt-5 bg-[#111b21] rounded-2xl p-3 text-right w-full border border-white/10 shadow-2xl">
                                                <div className="flex flex-col gap-2">
                                                    <div className="self-end bg-[#005c4b] text-white text-xs rounded-xl rounded-tr-sm px-3 py-2 max-w-[90%] leading-relaxed">
                                                        לא יכול להגיע ביום שלישי 😓
                                                    </div>
                                                    <div className="self-start bg-[#202c33] text-white text-xs rounded-xl rounded-tl-sm px-3 py-2 max-w-[90%] leading-relaxed">
                                                        🤖 מצאתי 2 מחליפים פוטנציאלים...
                                                    </div>
                                                    <div className="self-start bg-[#202c33] text-emerald-400 text-xs rounded-xl rounded-tl-sm px-3 py-2 max-w-[90%] font-bold">
                                                        ✅ ישראל הסכים! המנהל אושר.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}

                <section className="py-24 bg-slate-50 relative overflow-hidden" id="pricing">
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                    <div className="container mx-auto px-4">
                        <div className="max-w-3xl mx-auto text-center mb-16">
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-4">תמחור פשוט ושקוף</h2>
                            <p className="text-lg text-slate-600">שלם על מה שעובד. בלי התחייבות, בלי אותיות קטנות.</p>
                        </div>

                        <div className="max-w-lg mx-auto">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border-2 border-brand-blue relative overflow-hidden"
                            >
                                {/* Popular badge */}
                                <div className="absolute top-0 inset-x-0 bg-brand-blue text-white text-center py-1.5 text-sm font-bold tracking-wide">
                                    הכי משתלם
                                </div>

                                <div className="p-8 pt-12 text-center border-b border-slate-100">
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">למיקום יחיד</h3>
                                    <p className="text-slate-500 mb-6">למסעדות, חנויות ואולמות אירועים</p>
                                    <div className="flex items-center justify-center gap-1 mb-8">
                                        <span className="text-5xl font-extrabold text-slate-900">₪120</span>
                                        <span className="text-slate-500 font-medium mt-2">/חודש</span>
                                    </div>
                                </div>

                                <div className="p-8 bg-slate-50/50">
                                    <ul className="space-y-4 mb-8">
                                        {[
                                            'ניהול של עד 100 עובדים',
                                            'משא ומתן AI אוטומטי בוואטסאפ',
                                            'התראות ווידוא הגעה',
                                            'מערכת ניהול חכמה לדפדפן נייד ונייח',
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
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-brand-blue/25 transition-all active:scale-95"
                                    >
                                        התחל 14 ימי ניסיון חינם
                                    </button>
                                    <p className="text-xs text-slate-400 text-center mt-3">לא חיוב היום. אחרי 14 יום — ₪120/חודש. ביטול חופשי בכל עת.</p>
                                </div>
                            </motion.div>
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
