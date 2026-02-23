import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, MessageSquareText, Settings, LogOut, Bell, CheckCircle2, ShieldAlert, Save, Zap, Crown } from 'lucide-react';
import { NotificationsTray } from './Notifications';
import UpgradeModal from './UpgradeModal';
import { useAuth } from '../context/AuthContext';
import StaffView from './views/StaffView';
import RosterView from './views/RosterView';
import NegotiationsView from './views/NegotiationsView';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface DashboardProps {
    onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
    const [activeTab, setActiveTab] = useState('roster');
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

    const tabs = [
        { id: 'roster', label: 'סידור עבודה', icon: Calendar },
        { id: 'staff', label: 'עובדים', icon: Users },
        { id: 'negotiations', label: 'משא ומתן AI', icon: MessageSquareText },
        { id: 'settings', label: 'הגדרות', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-brand-blue text-white shadow-xl z-20">
                <div className="h-16 flex items-center px-6 border-b border-white/10">
                    <span className="text-xl font-bold">ShiftSwap<span className="text-brand-gold">.ai</span></span>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === tab.id
                                ? 'bg-white/10 text-brand-gold font-medium'
                                : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-brand-gold' : ''}`} />
                            {tab.label}
                            {tab.id === 'negotiations' && (
                                <span className="mr-auto bg-brand-gold text-brand-blue text-xs font-bold px-2 py-0.5 rounded-full">
                                    2
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/10 space-y-2">
                    <button
                        onClick={() => setIsUpgradeOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-500 text-slate-900 font-bold hover:shadow-lg hover:shadow-brand-gold/20 transition-all active:scale-95"
                    >
                        <Crown className="w-5 h-5" />
                        שדרגו לפרימיום
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        התנתק
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Mobile Header */}
                <header className="md:hidden h-16 bg-brand-blue text-white flex items-center justify-between px-4 shadow-md z-20">
                    <span className="text-lg font-bold">ShiftSwap<span className="text-brand-gold">.ai</span></span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsUpgradeOpen(true)}
                            className="p-1.5 bg-brand-gold text-brand-blue rounded-lg shadow-sm"
                        >
                            <Crown className="w-5 h-5" />
                        </button>
                        <button
                            className="p-2 relative"
                            onClick={() => setIsNotificationsOpen(true)}
                        >
                            <Bell className="w-6 h-6" />
                            <span className="absolute top-1 right-2 w-2 h-2 bg-brand-gold rounded-full"></span>
                        </button>
                    </div>
                    <NotificationsTray isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
                </header>

                {/* Desktop Header */}
                <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 z-10 shadow-sm relative">
                    <h1 className="text-2xl font-bold text-slate-800">
                        {tabs.find(t => t.id === activeTab)?.label}
                    </h1>
                    <div className="flex items-center gap-4">
                        <button
                            className="p-2 text-slate-400 hover:text-brand-blue relative transition-colors"
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        >
                            <Bell className="w-6 h-6" />
                            <span className="absolute top-1 right-2 w-2.5 h-2.5 bg-brand-gold rounded-full border-2 border-white"></span>
                        </button>
                        <div className="w-10 h-10 rounded-full bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue font-bold">
                            מ
                        </div>
                    </div>
                    {/* Desktop Notifications are positioned relative to the header */}
                    <div className="absolute top-16 right-8">
                        <NotificationsTray isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="max-w-5xl mx-auto h-full"
                        >
                            {activeTab === 'roster' && <RosterView />}
                            {activeTab === 'negotiations' && <NegotiationsView />}
                            {activeTab === 'staff' && <StaffView />}
                            {activeTab === 'settings' && <SettingsView />}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Mobile Bottom Nav */}
                <nav className="md:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 px-2 pb-safe z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${activeTab === tab.id ? 'text-brand-blue' : 'text-slate-400'
                                }`}
                        >
                            <div className="relative">
                                <tab.icon className={`w-6 h-6 transition-transform ${activeTab === tab.id ? 'scale-110 text-brand-blue' : ''}`} />
                                {tab.id === 'negotiations' && (
                                    <span className="absolute -top-1 -right-2 bg-brand-gold w-3 h-3 rounded-full border-2 border-white"></span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium">{tab.label}</span>
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="mobile-nav-indicator"
                                    className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-brand-blue rounded-b-md"
                                />
                            )}
                        </button>
                    ))}
                </nav>

                {/* Global Modals */}
                <UpgradeModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />
            </main>
        </div>
    );
}

// --- Mock Components for the Views --- //







function SettingsView() {
    const { user, logout } = useAuth();
    const [qrCodeData, setQrCodeData] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const businessId = user?.businessId || 'demo-business-123';

    // Verify initial connection status
    useEffect(() => {
        let isMounted = true;
        const checkStatus = async () => {
            try {
                const res = await fetch(`${API_URL}/api/whatsapp/status/${businessId}`);
                const data = await res.json();
                if (isMounted && data.status === 'connected') setIsConnected(true);
            } catch (err) {
                console.error("Failed to check status", err);
            }
        };
        checkStatus();
        return () => { isMounted = false; };
    }, [businessId]);

    return (
        <div className="space-y-6 pb-8">
            <h2 className="text-2xl font-bold text-slate-800 hidden md:block">הגדרות המערכת ומשא ומתן</h2>

            {/* QR display modal */}
            <AnimatePresence>
                {qrCodeData && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
                        onClick={() => setQrCodeData(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative text-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button onClick={() => setQrCodeData(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">קישור מכשיר לוואטסאפ</h3>
                            <p className="text-sm text-slate-600 mb-6">פתח את הגדרות הוואטסאפ במכשירך &gt; מכשירים מקושרים &gt; סרוק את הקוד</p>

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-center">
                                <img src={qrCodeData} alt="WhatsApp QR Code" className="w-64 h-64 mix-blend-multiply" />
                            </div>

                            <p className="text-xs text-brand-blue font-medium mt-4 animate-pulse">ממתין לסריקה...</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* WhatsApp Integration Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transform transition-all duration-300 hover:shadow-md mb-6">
                <div className="p-6 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl shrink-0">
                        {/* Custom WhatsApp Icon or use MessageSquare */}
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                        </svg>
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">חיבור לוואטסאפ (סריקת ברקוד)</h3>
                </div>
                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-1 space-y-4">
                            <p className="text-sm text-slate-600 leading-relaxed">
                                על מנת שהבוט של ShiftSwap יוכל לנהל משא ומתן באופן אוטומטי מול העובדים, עליך לקשר את מספר הוואטסאפ שלך (או מספר ייעודי לעסק) באמצעות סריקת QR, ממש כמו ב-WhatsApp Web.
                            </p>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">מספר מחובר</label>
                                    <div className="flex gap-2">
                                        <input type="text" disabled value={isConnected ? "מחובר \u2705" : "לא מחובר"} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-medium ${isConnected ? 'text-emerald-600' : 'text-slate-500'}`} />
                                        {isConnected ? (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await fetch(`${API_URL}/api/whatsapp/disconnect`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ businessId })
                                                        });
                                                        setIsConnected(false);
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                }}
                                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-xl font-medium transition-colors border border-rose-200 shadow-sm whitespace-nowrap"
                                            >
                                                ניתוק חשבון
                                            </button>
                                        ) : (
                                            <button
                                                disabled={isGenerating || isConnected}
                                                onClick={async () => {
                                                    setIsGenerating(true);
                                                    try {
                                                        const res = await fetch(`${API_URL}/api/whatsapp/connect`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ businessId })
                                                        });
                                                        const data = await res.json();

                                                        if (data.status === 'connected') {
                                                            setIsConnected(true);
                                                            setIsGenerating(false);
                                                            return;
                                                        }

                                                        if (data.qr) {
                                                            setQrCodeData(data.qr);
                                                        }

                                                        // Continuous polling
                                                        const pollInterval = setInterval(async () => {
                                                            try {
                                                                const pollRes = await fetch(`${API_URL}/api/whatsapp/status/${businessId}`);
                                                                const pollData = await pollRes.json();

                                                                if (pollData.status === 'connected') {
                                                                    clearInterval(pollInterval);
                                                                    setIsConnected(true);
                                                                    setQrCodeData(null);
                                                                    setIsGenerating(false);
                                                                } else if (pollData.qr && pollData.qr !== qrCodeData) {
                                                                    setQrCodeData(pollData.qr);
                                                                }
                                                            } catch (err) {
                                                                console.error(err);
                                                            }
                                                        }, 2000);

                                                    } catch (err) {
                                                        alert("Backend server not running. (Did you run 'npm run dev' inside backend?)");
                                                        setIsGenerating(false);
                                                    }

                                                }}
                                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium transition-colors border border-emerald-600 shadow-sm whitespace-nowrap disabled:opacity-50"
                                            >
                                                {isGenerating ? 'טוען קוד...' : 'קשר מכשיר (QR)'}
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">* אין צורך בחשבון WhatsApp Business כדי להתחיל.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transform transition-all duration-300 hover:shadow-md">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-brand-blue rounded-xl shrink-0"><MessageSquareText className="w-5 h-5" /></div>
                        <h3 className="font-bold text-slate-800 text-lg">חוקי משא ומתן לבוט</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <label className="flex items-start gap-4 cursor-pointer group p-3 -m-3 rounded-xl hover:bg-slate-50 transition-colors">
                                <div className="relative flex items-center justify-center mt-1 shrink-0">
                                    <input type="checkbox" className="peer sr-only" defaultChecked />
                                    <div className="w-5 h-5 border-2 border-slate-300 rounded group-hover:border-brand-blue peer-checked:bg-brand-blue peer-checked:border-brand-blue transition-all"></div>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-slate-700">
                                    <span className="font-bold flex items-center gap-2 flex-wrap">המרת משמרות מבוקשות (שישי-שבת) <Zap className="w-4 h-4 text-brand-gold fill-brand-gold shrink-0" /></span>
                                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">הבוט מוסמך להציע לעובד לוותר על משמרת קשה באמצע השבוע תמורת משמרת סופ"ש כדי לסגור חורים.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-4 cursor-pointer group p-3 -m-3 rounded-xl hover:bg-slate-50 transition-colors">
                                <div className="relative flex items-center justify-center mt-1 shrink-0">
                                    <input type="checkbox" className="peer sr-only" defaultChecked />
                                    <div className="w-5 h-5 border-2 border-slate-300 rounded group-hover:border-brand-blue peer-checked:bg-brand-blue peer-checked:border-brand-blue transition-all"></div>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-slate-700">
                                    <span className="font-bold">בונוס כספי מיידי</span>
                                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">הבוט יציע "בונוס הקפצה" של 50 ש"ח כברירת מחדל לאיוש משמרות בהתראה של פחות מ-4 שעות.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-4 cursor-pointer group p-3 -m-3 rounded-xl hover:bg-slate-50 transition-colors">
                                <div className="relative flex items-center justify-center mt-1 shrink-0">
                                    <input type="checkbox" className="peer sr-only" />
                                    <div className="w-5 h-5 border-2 border-slate-300 rounded group-hover:border-brand-blue peer-checked:bg-brand-blue peer-checked:border-brand-blue transition-all"></div>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-slate-700">
                                    <span className="font-bold text-red-600 flex items-center gap-1"><ShieldAlert className="w-4 h-4 shrink-0" /> הפעלה אוטומטית של מוניות</span>
                                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">הבוט מבטיח לעובדים תשלום על מונית כפתרון לחוסר זמינות תחבורة ציבורית בלילה או בסופ"ש.</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 flex flex-col justify-between">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transform transition-all duration-300 hover:shadow-md">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 text-yellow-700 rounded-xl shrink-0"><Settings className="w-5 h-5" /></div>
                            <h3 className="font-bold text-slate-800 text-lg">תצורת AI והתראות</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">טון הדיבור של הבוט לעובדים</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all">
                                    <option>צעיר וקליל (אחי, מה קורה?)</option>
                                    <option>רשמי ומקצועי (שלום רב)</option>
                                    <option>סחבקי ומתגמל (אלוף, יש מצב ש...)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">מספר השעות לאזהרה במקרה של חוסר באיש צוות</label>
                                <input type="number" defaultValue={24} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2 transition-all active:scale-95">
                            <Save className="w-5 h-5 shrink-0" />
                            שמור הגדרות מערכת
                        </button>
                        <button
                            onClick={async () => {
                                await logout();
                                window.location.reload();
                            }}
                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-red-200"
                        >
                            <LogOut className="w-5 h-5 shrink-0" />
                            התנתקות מהמערכת
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
