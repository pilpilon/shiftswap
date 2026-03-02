import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, MessageSquareText, Settings, LogOut, Bell, Save, Zap, Crown, Download } from 'lucide-react';
import { NotificationsTray } from './Notifications';
import { useNotifications } from '../hooks/useNotifications';
import UpgradeModal from './UpgradeModal';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import StaffView from './views/StaffView';
import RosterView from './views/RosterView';
import NegotiationsView from './views/NegotiationsView';
import SwapView from './views/SwapView';
import { useShifts } from '../hooks/useShifts';
import { useSwaps } from '../hooks/useSwaps';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface DashboardProps {
    onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('roster');
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [readIds, setReadIds] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('shiftswap_read_notifications');
            return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
        } catch {
            return new Set<string>();
        }
    });
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        if (window.deferredPrompt) {

            setIsInstallable(true);
        }
        const handleInstallable = () => setIsInstallable(true);
        window.addEventListener('pwa-installable', handleInstallable);
        return () => window.removeEventListener('pwa-installable', handleInstallable);
    }, []);

    const handleInstallClick = async () => {
        setIsProfileOpen(false);
        if (!window.deferredPrompt) return;
        window.deferredPrompt.prompt();
        const { outcome } = await window.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstallable(false);
            window.deferredPrompt = null;
        }
    };

    // Real notifications derived from live Firestore shifts
    const { shifts } = useShifts(user?.businessId);
    const { swaps } = useSwaps(user?.businessId);
    const rawNotifications = useNotifications(shifts);


    // Allow the user to mark individual notification IDs as read
    const notifications = rawNotifications.map(n => ({
        ...n,
        read: n.read || readIds.has(n.id),
    }));
    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAllRead = () => {
        const newIds = new Set(notifications.map(n => n.id));
        setReadIds(newIds);
        localStorage.setItem('shiftswap_read_notifications', JSON.stringify([...newIds]));
    };

    const tabs = [
        { id: 'roster', label: 'סידור עבודה', icon: Calendar },
        { id: 'swaps', label: 'החלפות (AI)', icon: Zap },
        { id: 'staff', label: 'עובדים', icon: Users },
        { id: 'negotiations', label: 'לוג שיחות', icon: MessageSquareText },
        { id: 'settings', label: 'הגדרות', icon: Settings },
    ];

    // Reference to profile dropdown for 'click outside' handling
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isProfileOpen && !(e.target as Element).closest('.profile-menu-container')) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isProfileOpen]);

    const renderProfileMenu = (isMobile: boolean = false) => (
        <div className="relative profile-menu-container">
            <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold ${isMobile ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-brand-blue-50 border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/10'}`}
            >
                מ
            </button>

            <AnimatePresence>
                {isProfileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-14 left-0 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-right"
                    >
                        <div className="px-4 py-2 border-b border-slate-100 mb-1">
                            <p className="text-sm font-bold text-slate-800">היי, מנהל</p>
                            <p className="text-xs text-slate-500 truncate">{user?.businessId}</p>
                        </div>

                        {isInstallable && (
                            <button
                                onClick={handleInstallClick}
                                className="w-full text-right px-4 py-2.5 text-sm font-bold text-brand-blue bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-2 mb-1"
                            >
                                <Download className="w-4 h-4" />
                                התקן אפליקציה
                            </button>
                        )}

                        <button
                            onClick={() => { setActiveTab('settings'); setIsProfileOpen(false); }}
                            className="w-full text-right px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                            <Settings className="w-4 h-4 text-slate-400" />
                            הגדרות חשבון
                        </button>

                        <button
                            onClick={() => { setIsUpgradeOpen(true); setIsProfileOpen(false); }}
                            className="w-full text-right px-4 py-2.5 text-sm font-medium text-brand-gold hover:bg-yellow-50/50 transition-colors flex items-center gap-2"
                        >
                            <Crown className="w-4 h-4" />
                            ניהול מנוי ושדרוג
                        </button>

                        <button
                            onClick={() => { alert('בקרוב: מרכז עזרה עם מדריכים מקיפים!'); setIsProfileOpen(false); }}
                            className="w-full text-right px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                            <span className="w-4 h-4 flex items-center justify-center text-slate-400 font-bold">?</span>
                            מרכז עזרה
                        </button>

                        <a
                            href="https://wa.me/972501234567"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setIsProfileOpen(false)}
                            className="w-full text-right px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                            <MessageSquareText className="w-4 h-4 text-emerald-500" />
                            צור קשר
                        </a>

                        <div className="h-px bg-slate-100 my-1"></div>

                        <button
                            onClick={() => { onLogout(); setIsProfileOpen(false); }}
                            className="w-full text-right px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            התנתק
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

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
                            {tab.id === 'swaps' && swaps.length > 0 && (
                                <span className="mr-auto bg-brand-gold text-brand-blue text-xs font-bold px-2 py-0.5 rounded-full">
                                    {swaps.length}
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
                            {unreadCount > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-brand-gold rounded-full"></span>}
                        </button>
                        {renderProfileMenu(true)}
                    </div>
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
                            {unreadCount > 0 && <span className="absolute top-1 right-2 w-2.5 h-2.5 bg-brand-gold rounded-full border-2 border-white"></span>}
                        </button>

                        {renderProfileMenu(false)}
                    </div>
                </header>

                {/* Fixed Global Notifications Tray */}
                <NotificationsTray
                    isOpen={isNotificationsOpen}
                    onClose={() => setIsNotificationsOpen(false)}
                    notifications={notifications}
                    onMarkAllRead={handleMarkAllRead}
                />

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="max-w-5xl mx-auto min-h-full pb-28 md:pb-4"
                        >
                            {activeTab === 'roster' && <RosterView />}
                            {activeTab === 'swaps' && <SwapView />}
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
                                {tab.id === 'swaps' && swaps.length > 0 && (
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







import { useSettings } from '../hooks/useSettings';
import type { AppSettings } from '../hooks/useSettings';

function SettingsView() {
    const { user, logout } = useAuth();
    const { settings, updateSettings } = useSettings();
    const [qrCodeData, setQrCodeData] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isGeneratingPairingCode, setIsGeneratingPairingCode] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    // We maintain a local copy of settings to allow editing before saving
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [showNegotiationHelp, setShowNegotiationHelp] = useState(false);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const businessId = user?.businessId || 'demo-business-123';

    // Verify initial connection status
    useEffect(() => {
        let isMounted = true;
        const checkStatus = async () => {
            if (!user?.businessId) return; // Wait for user context
            try {
                const idToken = await auth.currentUser?.getIdToken();
                const res = await fetch(`${API_URL}/api/whatsapp/status/${user.businessId}`, {
                    headers: { ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}) }
                });
                const data = await res.json();
                if (isMounted && data.status === 'connected') setIsConnected(true);
            } catch (err) {
                console.error("Failed to check status", err);
            }
        };
        checkStatus();
        return () => { isMounted = false; };
    }, [user?.businessId]);

    const pollIntervalRef = useRef<number | ReturnType<typeof setInterval> | null>(null);

    // Cleanup interval on unmount or when pairing/qr succeeds
    const startPolling = () => {
        if (!user?.businessId) return;
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(async () => {
            try {
                const idToken = await auth.currentUser?.getIdToken();
                const pollRes = await fetch(`${API_URL}/api/whatsapp/status/${user.businessId}`, {
                    headers: { ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}) }
                });
                const pollData = await pollRes.json();

                if (pollData.status === 'connected') {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    setIsConnected(true);
                    setQrCodeData(null);
                    setPairingCode(null);
                    setIsGenerating(false);
                    setIsGeneratingPairingCode(false);
                } else if (!pairingCode && pollData.qr && pollData.qr !== qrCodeData) {
                    setQrCodeData(pollData.qr);
                }
            } catch (err) {
                console.error(err);
            }
        }, 2000);
    };

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    const handlePairingCode = async () => {
        if (!phoneNumber) return alert("נא להזין מספר טלפון");
        setIsGeneratingPairingCode(true);
        try {
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch(`${API_URL}/api/whatsapp/pairing-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
                },
                body: JSON.stringify({ businessId, phoneNumber: '972' + phoneNumber.replace(/^0/, '') }) // basic IL format
            });
            const data = await res.json();

            if (data.code) {
                setPairingCode(data.code);
                setQrCodeData(null); // Ensure QR is hidden
                startPolling();
            } else if (data.status === 'connected') {
                setIsConnected(true);
            } else {
                alert(data.error || "שגיאה ביצירת קוד אוטומטי");
            }
        } catch (err) {
            console.error(err);
            alert("שגיאת התחברות לשרת");
        } finally {
            setIsGeneratingPairingCode(false);
        }
    };


    return (
        <div className="space-y-6 pb-24 md:pb-8">
            <h2 className="text-2xl font-bold text-slate-800 hidden md:block">הגדרות המערכת ומשא ומתן</h2>

            {/* QR / Pairing Code display modal */}
            <AnimatePresence>
                {(qrCodeData || pairingCode) && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
                        onClick={() => { setQrCodeData(null); setPairingCode(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative text-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button onClick={() => { setQrCodeData(null); setPairingCode(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">קישור מכשיר לוואטסאפ</h3>

                            {pairingCode ? (
                                <>
                                    <p className="text-sm text-slate-600 mb-6 font-medium">פתחו את וואטסאפ בטלפון שלכם ויופיע חלון להכנסת הקוד הבא:</p>
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-brand-blue/20 flex items-center justify-center mb-4">
                                        <span className="text-4xl font-black text-brand-blue tracking-[0.2em]">{pairingCode}</span>
                                    </div>
                                </>
                            ) : qrCodeData ? (
                                <>
                                    <p className="text-sm text-slate-600 mb-6">פתח את הגדרות הוואטסאפ במכשירך &gt; מכשירים מקושרים &gt; סרוק את הקוד</p>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-center">
                                        <img src={qrCodeData} alt="WhatsApp QR Code" className="w-64 h-64 mix-blend-multiply" />
                                    </div>
                                </>
                            ) : null}

                            <p className="text-xs text-brand-blue font-medium mt-4 animate-pulse">ממתין לאישור ממכשירך...</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* WhatsApp Integration Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transform transition-all duration-300 hover:shadow-md mb-6">
                <div className="p-6 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-4">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl shrink-0">
                        {/* Custom WhatsApp Icon or use MessageSquare */}
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">חיבור לוואטסאפ: סריקת ברקוד / קוד לסלולר</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            קשרו את מספר הוואטסאפ כדי לאפשר לבוט לנהל משא ומתן באופן אוטומטי.
                        </p>
                    </div>
                </div>
                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-1 w-full space-y-4">
                            <div className="space-y-4">
                                {isConnected ? (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">פרופיל נוכחי</label>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input type="text" disabled value="מחובר &#x2705;" className={`w-full max-w-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-medium text-emerald-600`} />
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const idToken = await auth.currentUser?.getIdToken();
                                                        await fetch(`${API_URL}/api/whatsapp/disconnect`, {
                                                            method: 'POST',
                                                            headers: {
                                                                'Content-Type': 'application/json',
                                                                ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
                                                            },
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
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-slate-100 mt-2">
                                            <div className="space-y-2 flex-1 pl-4 sm:border-l border-slate-100">
                                                <label className="block text-sm font-bold text-slate-800">אפשרות 1: מטלפון אחר / ממחשב</label>
                                                <button
                                                    disabled={isGenerating || isGeneratingPairingCode || isConnected}
                                                    onClick={async () => {
                                                        setIsGenerating(true);
                                                        try {
                                                            const idToken = await auth.currentUser?.getIdToken();
                                                            const res = await fetch(`${API_URL}/api/whatsapp/connect`, {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Content-Type': 'application/json',
                                                                    ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
                                                                },
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

                                                            startPolling();

                                                        } catch {
                                                            alert("Backend server not running.");
                                                            setIsGenerating(false);
                                                        }
                                                    }}
                                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50"
                                                >
                                                    {isGenerating ? 'טוען קוד...' : 'הצג קוד QR לסריקה'}
                                                </button>
                                            </div>

                                            <div className="space-y-2 flex-1 pt-4 sm:pt-0">
                                                <label className="block text-sm font-bold text-slate-800">אפשרות 2: מאותו הטלפון (Pairing Code)</label>
                                                <p className="text-xs text-slate-500">הזן את המספר שממנו תרצה לשלוח הודעות תקבל קוד אימות להזנה באפליקציה.</p>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="tel"
                                                        placeholder="05X-XXXXXXX"
                                                        value={phoneNumber}
                                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                                        className="flex-1 bg-white px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                                        dir="ltr"
                                                    />
                                                    <button
                                                        disabled={isGeneratingPairingCode || !phoneNumber || isGenerating}
                                                        onClick={handlePairingCode}
                                                        className="bg-brand-blue hover:bg-brand-blue/90 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 transition-colors whitespace-nowrap"
                                                    >
                                                        {isGeneratingPairingCode ? 'שולח...' : 'צור קוד'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Negotiation Help Modal */}
            <AnimatePresence>
                {showNegotiationHelp && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setShowNegotiationHelp(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-br from-brand-blue to-indigo-700 p-6 text-white relative shrink-0">
                                <button onClick={() => setShowNegotiationHelp(false)} className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                </button>
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                                    <MessageSquareText className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black">איך עובד הבוט המשא ומתן?</h3>
                                <p className="text-sm text-white/70 mt-1">הכל על הסוכן החכם שסוגר לך משמרות</p>
                            </div>
                            {/* Content - Scrollable */}
                            <div className="overflow-y-auto flex-1 custom-scrollbar">
                                <div className="p-6 space-y-5 text-right" dir="rtl">
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-brand-blue text-white text-sm font-black flex items-center justify-center shrink-0 mt-0.5">1</div>
                                        <div>
                                            <p className="font-bold text-slate-800">מתי מתחיל המשא ומתן?</p>
                                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">הבוט מתעורר אוטומטית כשמשמרת נשארת פתוחה X שעות לפני תחילתה (לפי ההגדרה שלך). הוא מתחיל לפנות לעובדים הרלוונטיים לפי זמינות וטיב העיסוק.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-brand-blue text-white text-sm font-black flex items-center justify-center shrink-0 mt-0.5">2</div>
                                        <div>
                                            <p className="font-bold text-slate-800">איך הוא מנהל שיחה?</p>
                                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">הבוט שולח הודעת וואטסאפ אישית לכל עובד. הוא מציע תמריצים, עונה על שאלות, ומנסה לשכנע — הכל לפי הכללים שהגדרת בשדה למטה.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white text-sm font-black flex items-center justify-center shrink-0 mt-0.5">✓</div>
                                        <div>
                                            <p className="font-bold text-slate-800">מתי מסתיים המשא ומתן?</p>
                                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">ברגע שעובד אישר — הבוט נועל את המשמרת ומדווח לך. אם אף אחד לא אישר, תקבל התראה ידנית. תוצאות כל שיחה מופיעות ב"לוג שיחות".</p>
                                        </div>
                                    </div>
                                    <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-2xl p-4">
                                        <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><Zap className="w-4 h-4 text-brand-gold fill-brand-gold shrink-0" />הטיפ שלנו</p>
                                        <p className="text-sm text-slate-600 mt-1">כתוב כללים ספציפיים ומדויקים. ככל שהבוט מבין יותר את הלוגיקה שלך, כך הוא סוגר יותר משמרות בלי שתתערב.</p>
                                    </div>
                                </div>
                                <div className="px-6 pb-6">
                                    <button onClick={() => setShowNegotiationHelp(false)} className="w-full bg-[#1e2354] hover:bg-[#15193b] text-white font-black py-4 rounded-xl transition-all">
                                        הבנתי, תודה!
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Negotiation Rules — Full Width Beautiful Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-gradient-to-l from-brand-blue/5 to-transparent flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-xl shrink-0"><MessageSquareText className="w-5 h-5" /></div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base">חוקי משא ומתן — AI Prompt</h3>
                            <p className="text-xs text-slate-500">הנחיות ישירות לסוכן הבוט</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowNegotiationHelp(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20 rounded-xl transition-colors shrink-0"
                    >
                        <span>עזרה</span>
                        <span className="w-4 h-4 rounded-full bg-brand-blue text-white text-[10px] font-black flex items-center justify-center">?</span>
                    </button>
                </div>
                <div className="p-5">
                    <div className="relative">
                        <textarea
                            rows={7}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-slate-800 text-sm leading-relaxed focus:outline-none focus:ring-0 focus:border-brand-blue focus:bg-white transition-all resize-none placeholder:text-slate-400 placeholder:leading-relaxed"
                            placeholder={`לדוגמה:
• אם עובד מבקש תוספת תשלום על משמרת, סרב באדיבות והסבר שזה חורג מהתקציב.
• אפשר להציע בונוס של עד 50 שקלים רק במקרה חירום של משמרת פתוחה לאותו היום.
• במידה ועובד מסרב למשמרת, שאל אותו אם יש יום אחר השבוע בו יוכל לעזור.
• סיים תמיד כל הודעה בברכת 'יום מקסים' או 'שבוע טוב'.`}
                            value={localSettings.customRules}
                            onChange={(e) => setLocalSettings({ ...localSettings, customRules: e.target.value })}
                            dir="rtl"
                        />
                        {localSettings.customRules && (
                            <span className="absolute bottom-3 left-3 text-[10px] text-slate-300 font-medium">{localSettings.customRules.length} תווים</span>
                        )}
                    </div>
                    <div className="mt-3 bg-brand-blue/5 border border-brand-blue/10 rounded-xl p-3 flex flex-col gap-1">
                        <p className="text-xs text-slate-700 flex items-center gap-1.5 font-bold">
                            <Zap className="w-3.5 h-3.5 text-brand-gold fill-brand-gold shrink-0" />
                            הנחיות אלו מסופקות ישירות לסוכן ה-AI.
                        </p>
                        <p className="text-xs text-slate-500 pr-5 leading-relaxed font-medium">
                            במידה ולא תזין חוקים מיוחדים, הבוט ישתמש בשיקול דעתו הכללי כדי לנהל משא ומתן הגיוני ומנומס בנוגע להחלפות משמרות מול העובדים.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transform transition-all duration-300 hover:shadow-md">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 text-yellow-700 rounded-xl shrink-0"><Settings className="w-5 h-5" /></div>
                        <h3 className="font-bold text-slate-800 text-lg">תצורת AI והתראות</h3>
                    </div>
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">טון הדיבור של הבוט לעובדים</label>
                            <select
                                value={localSettings.botTone}
                                onChange={(e) => setLocalSettings({ ...localSettings, botTone: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all"
                            >
                                <option>צעיר וקליל (אחי, מה קורה?)</option>
                                <option>רשמי ומקצועי (שלום רב)</option>
                                <option>סחבקי ומתגמל (אלוף, יש מצב ש...)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">מספר השעות לאזהרה במקרה של חוסר באיש צוות</label>
                            <input
                                type="number"
                                value={localSettings.warningHours}
                                onChange={(e) => setLocalSettings({ ...localSettings, warningHours: Number(e.target.value) })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all"
                            />
                            <p className="text-xs text-slate-500 mt-2">מספר השעות לפני תחילת משמרת ריקה בהן הבוט יתחיל לפנות עצמאית לשאר הצוות.</p>
                        </div>

                        {/* Bonus Control */}
                        <div className={`rounded-xl border p-4 transition-all ${localSettings.enableCashBonus ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <label className="block text-sm font-bold text-slate-800">💰 בונוס כספי לעובדים</label>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                        {localSettings.enableCashBonus
                                            ? 'הבוט מורשה להציע בונוס — לא יעלה על הסכום שקבעת:'
                                            : 'כבוי — הבוט לא יציע שום תמריץ כספי. מומלץ לשמור כך.'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setLocalSettings({ ...localSettings, enableCashBonus: !localSettings.enableCashBonus })}
                                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 ${localSettings.enableCashBonus ? 'bg-amber-400' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform ${localSettings.enableCashBonus ? 'translate-x-1' : '-translate-x-5'}`} style={{ transform: localSettings.enableCashBonus ? 'translateX(22px)' : 'translateX(2px)' }} />
                                </button>
                            </div>
                            {localSettings.enableCashBonus && (
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-200">
                                    <label className="text-xs font-bold text-slate-700 whitespace-nowrap">תקרת בונוס מקסימלית:</label>
                                    <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-xl px-3 py-1.5 flex-1 max-w-[120px]">
                                        <input
                                            type="number"
                                            min={0}
                                            max={500}
                                            value={localSettings.maxBonusAmount ?? 50}
                                            onChange={(e) => setLocalSettings({ ...localSettings, maxBonusAmount: Number(e.target.value) })}
                                            className="w-full bg-transparent text-slate-800 text-sm font-bold focus:outline-none text-center"
                                        />
                                        <span className="text-xs text-slate-500 font-medium">₪</span>
                                    </div>
                                    <p className="text-xs text-amber-700 font-medium">לכל משמרת</p>
                                </div>
                            )}
                        </div>

                        {/* Bot Active Hours */}

                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                            <label className="block text-sm font-bold text-slate-700 mb-1">🕐 שעות פעילות הבוט</label>
                            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                                הבוט יפנה לעובדים רק בחלון השעות הזה — כולל כשמחפש מחליף, מזכיר על זמינות, ומגיב לביטול משמרת. מחוץ לחלון זה — הבוט לא יפנה לאיש.
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="text-xs text-slate-500 mb-1 block">פעיל משעה</label>
                                    <select
                                        value={localSettings.botActiveFrom ?? 8}
                                        onChange={(e) => setLocalSettings({ ...localSettings, botActiveFrom: Number(e.target.value) })}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all text-sm"
                                    >
                                        {Array.from({ length: 24 }, (_, h) => (
                                            <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                                        ))}
                                    </select>
                                </div>
                                <span className="text-slate-400 font-medium mt-5">עד</span>
                                <div className="flex-1">
                                    <label className="text-xs text-slate-500 mb-1 block">עד שעה</label>
                                    <select
                                        value={localSettings.botActiveTo ?? 21}
                                        onChange={(e) => setLocalSettings({ ...localSettings, botActiveTo: Number(e.target.value) })}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all text-sm"
                                    >
                                        {Array.from({ length: 24 }, (_, h) => (
                                            <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>


                <div className="space-y-3">
                    <button
                        disabled={isSaving}
                        onClick={async () => {
                            setIsSaving(true);
                            await updateSettings(localSettings);
                            setIsSaving(false);
                        }}
                        className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Save className="w-5 h-5 shrink-0" />
                        {isSaving ? 'שומר...' : 'שמור הגדרות מערכת'}
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
        </div >
    );
}
