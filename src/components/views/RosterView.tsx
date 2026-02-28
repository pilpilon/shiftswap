import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../src/context/AuthContext';
import { useShifts, type Shift, type RoleRequirement, type SkillLevel, SKILL_LEVEL_LABELS } from '../../../src/hooks/useShifts';
import { useStaff, type StaffMember } from '../../../src/hooks/useStaff';
import { useSettings } from '../../../src/hooks/useSettings';
import { useAvailability } from '../../../src/hooks/useAvailability';
import { runAutoAssign, WEEKDAY_LABELS_HE, isDeadlinePassed } from '../../../src/hooks/useAutoAssign';
import {
    Calendar, Plus, CheckCircle2, Loader2, Trash2,
    ChevronRight, ChevronLeft, Edit2, Wand2, Settings2, AlertCircle, Send, HelpCircle, X, Smartphone, Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ────────────────────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
};

// Predefined role suggestions
const ROLE_SUGGESTIONS = ['מלצר', 'טבח', 'מארחת', 'אחמש', 'בר', 'קופאי', 'מנהל משמרת'];

const SKILL_COLORS: Record<SkillLevel, string> = {
    star: 'bg-yellow-50 text-yellow-700 border-yellow-300',
    standard: 'bg-blue-50 text-blue-700 border-blue-300',
    junior: 'bg-slate-100 text-slate-600 border-slate-300',
};

// Short label for badges displayed inside shift cards
const SKILL_SHORT: Record<SkillLevel, string> = {
    star: 'כוכב',
    standard: 'סטנדרטי',
    junior: 'מתחיל',
};

// Empty role row factory
const newRow = (shiftStart = '08:00', shiftEnd = '16:00'): RoleRequirement => ({
    role: '',
    count: 1, // always 1 — user opens new rows for more
    skillLevel: 'standard',
    startTime: shiftStart,
    endTime: shiftEnd,
});

/** Parse a title like "18:00 - 24:00" and return [start, end] or defaults */
function parseTimes(title: string): [string, string] {
    const m = title.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    return m ? [m[1], m[2]] : ['08:00', '16:00'];
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────
export default function RosterView() {
    const { user } = useAuth();
    const { shifts, loading, error, addShift, removeShift, updateShift } = useShifts(user?.businessId);
    const { staff } = useStaff(user?.businessId);
    const { settings, updateSettings } = useSettings();
    const { availability } = useAvailability(user?.businessId);

    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getStartOfWeek(new Date()));
    const [addingDate, setAddingDate] = useState<string | null>(null);
    const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const [assignMsg, setAssignMsg] = useState<string | null>(null);
    const [showDeadlinePanel, setShowDeadlinePanel] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [showPublishConfirm, setShowPublishConfirm] = useState(false);
    const [publishUnassignedCount, setPublishUnassignedCount] = useState(0);
    const [showHowItWorks, setShowHowItWorks] = useState(false);

    // Derived states
    const activeStaffWithPhones = staff.filter(s => s.phone && s.phone.trim() !== '');
    const submittedCount = activeStaffWithPhones.filter(s => {
        let clean = s.phone.replace(/\D/g, '');
        if (clean.startsWith('0')) clean = '972' + clean.slice(1);
        return availability[clean] !== undefined;
    }).length;

    const allSubmitted = activeStaffWithPhones.length > 0 && submittedCount === activeStaffWithPhones.length;

    // Manage local notification
    const hasNotifiedRef = useRef(false);
    useEffect(() => {
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        if (allSubmitted && !hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification('ShiftSwap AI', {
                        body: 'כל העובדים הגישו זמינות! ניתן לבצע שיבוץ אוטומטי כעת.',
                        icon: '/vite.svg',
                        dir: 'rtl'
                    });
                } catch (error) {
                    console.log('Mobile/iOS browser requires service worker to show notifications', error);
                    // Fallback to Service Worker for mobile Safari
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.ready.then(registration => {
                            registration.showNotification('ShiftSwap AI', {
                                body: 'כל העובדים הגישו זמינות! ניתן לבצע שיבוץ אוטומטי כעת.',
                                icon: '/vite.svg',
                                dir: 'rtl'
                            });
                        }).catch(e => console.error('SW notification failed', e));
                    }
                }
            }
        } else if (!allSubmitted) {
            hasNotifiedRef.current = false;
        }
    }, [allSubmitted]);

    // Form state
    const [newDate, setNewDate] = useState('');
    const [shiftStart, setShiftStart] = useState('08:00');
    const [shiftEnd, setShiftEnd] = useState('16:00');
    const [roleRows, setRoleRows] = useState<RoleRequirement[]>([newRow()]);

    // ── Form helpers ──────────────────────────────────────────────────────────
    const openAddShiftForDate = (dateStr: string) => {
        setEditingShiftId(null);
        setNewDate(dateStr);
        setShiftStart('08:00');
        setShiftEnd('16:00');
        setRoleRows([newRow('08:00', '16:00')]);
        setAddingDate(dateStr);
    };

    const handleEditClick = (shift: Shift) => {
        setEditingShiftId(shift.id);
        setNewDate(shift.date);
        const [s, e] = parseTimes(shift.title);
        setShiftStart(s);
        setShiftEnd(e);
        setRoleRows(shift.roleRequirements && shift.roleRequirements.length > 0 ? shift.roleRequirements : [newRow(s, e)]);
        setAddingDate(shift.date);
        document.getElementById(`day-${shift.date}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const updateRow = (index: number, patch: Partial<RoleRequirement>) => {
        setRoleRows(prev => prev.map((r, i) => {
            if (i !== index) return r;
            const updated = { ...r, ...patch };
            // Only clamp if the new value is strictly out of the shift window.
            // Do NOT reset times based on startTime >= endTime comparison — this
            // breaks overnight shifts where endTime can legitimately be "00:00".
            if (updated.startTime && shiftStart && updated.startTime < shiftStart) updated.startTime = shiftStart;
            if (updated.endTime && shiftEnd && updated.endTime > shiftEnd) updated.endTime = shiftEnd;
            return updated;
        }));
    };

    const addRow = () => setRoleRows(prev => [...prev, newRow(shiftStart, shiftEnd)]);

    const removeRow = (index: number) => {
        setRoleRows(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        for (const row of roleRows) {
            if (!row.role.trim()) {
                alert('יש למלא שם תפקיד בכל שורה');
                return;
            }
        }
        const composedTitle = `${shiftStart} - ${shiftEnd}`;
        try {
            if (editingShiftId) {
                const totalRequired = roleRows.reduce((sum, r) => sum + r.count, 0);
                await updateShift(editingShiftId, { title: composedTitle, roleRequirements: roleRows, totalRequired });
            } else {
                await addShift(newDate, composedTitle, roleRows);
            }
            setAddingDate(null);
            setEditingShiftId(null);
        } catch (err) {
            console.error('Failed to save shift', err);
            alert('שגיאה בשמירת משמרת');
        }
    };

    // ── Auto-assign ───────────────────────────────────────────────────────────
    const handleAutoAssign = async () => {
        if (shifts.length === 0 || staff.length === 0) {
            setAssignMsg('אין משמרות או עובדים לשיבוץ');
            setTimeout(() => setAssignMsg(null), 3000);
            return;
        }
        setIsAssigning(true);
        setAssignMsg(null);
        try {
            const results = await runAutoAssign(shifts, staff, user?.businessId);
            const filled = results.filter(r => r.filledCount > 0).length;
            setAssignMsg(`✅ שיבוץ הושלם — ${filled} משמרות קיבלו כיסוי`);
        } catch (err) {
            console.error('Auto-assign error', err);
            setAssignMsg('❌ שגיאה בשיבוץ אוטומטי');
        } finally {
            setIsAssigning(false);
            setTimeout(() => setAssignMsg(null), 5000);
        }
    };

    const handlePublish = () => {
        if (shifts.length === 0) {
            setAssignMsg('אין משמרות לפרסום בשבוע זה');
            setTimeout(() => setAssignMsg(null), 3000);
            return;
        }
        const unassigned = shifts.filter(s => s.filledCount < s.totalRequired);
        setPublishUnassignedCount(unassigned.length);
        setShowPublishConfirm(true);
    };

    const confirmPublish = async () => {
        setShowPublishConfirm(false);
        setIsPublishing(true);
        setAssignMsg(null);
        try {
            const res = await fetch(`${API_URL}/api/whatsapp/publish-schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId: user?.businessId, shifts, staff }),
            });
            const data = await res.json();

            if (!res.ok || data.error === 'not_connected') {
                setAssignMsg('❌ WhatsApp לא מחובר — חבר את הוואטסאפ בהגדרות לפני שגרת הסידור.');
            } else {
                const errNote = data.errors?.length > 0 ? ` (${data.errors.length} שגיאות)` : '';
                setAssignMsg(`✅ הסידור נשלח! ${data.sent} הודעות וואטסאפ נשלחו לעובדים${errNote}`);
            }
        } catch (err) {
            console.error('Publish failed:', err);
            setAssignMsg('❌ שגיאת תקשורת עם השרת — ודא שהשרת פועל.');
        } finally {
            setIsPublishing(false);
            setTimeout(() => setAssignMsg(null), 7000);
        }
    };

    // ── Week navigation ───────────────────────────────────────────────────────
    const nextWeek = () => {
        const next = new Date(currentWeekStart);
        next.setDate(next.getDate() + 7);
        setCurrentWeekStart(next);
        setAddingDate(null);
        setEditingShiftId(null);
    };

    const prevWeek = () => {
        const prev = new Date(currentWeekStart);
        prev.setDate(prev.getDate() - 7);
        setCurrentWeekStart(prev);
        setAddingDate(null);
        setEditingShiftId(null);
    };

    const jumpToToday = () => {
        setCurrentWeekStart(getStartOfWeek(new Date()));
        setAddingDate(null);
        setEditingShiftId(null);
    };

    // ── Derived data ──────────────────────────────────────────────────────────
    const groupedShifts = shifts.reduce((acc, shift) => {
        if (!acc[shift.date]) acc[shift.date] = [];
        acc[shift.date].push(shift);
        return acc;
    }, {} as Record<string, Shift[]>);

    const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return { dateObj: d, dateString: `${year}-${month}-${day}` };
    });

    const isCurrentWeek = getStartOfWeek(new Date()).getTime() === currentWeekStart.getTime();
    const deadline = settings.submissionDeadlineDay ?? -1;
    const deadlinePassed = isDeadlinePassed(deadline);

    const shouldRecommendAssign = (allSubmitted || deadlinePassed) && shifts.length > 0;
    const allShiftsFilled = shifts.length > 0 && shifts.every(s => s.filledCount >= s.totalRequired);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4" dir="rtl">
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                {/* Top Row: Title & Week Nav */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-brand-blue" />
                            יומן שבועי
                        </h2>
                        <button
                            onClick={() => setShowHowItWorks(true)}
                            className="flex items-center gap-1.5 text-xs font-bold text-brand-blue bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm whitespace-nowrap"
                        >
                            <HelpCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">איך זה עובד?</span>
                            <span className="sm:hidden">עזרה</span>
                        </button>
                    </div>

                    {/* Week navigator */}
                    <div className="flex items-center gap-1 bg-slate-50 rounded-xl border border-slate-200 p-1 self-start sm:self-auto">
                        <button
                            onClick={prevWeek}
                            className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors shadow-sm cursor-pointer"
                            title="שבוע קודם"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={jumpToToday}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${isCurrentWeek
                                ? 'bg-brand-blue text-white shadow-sm'
                                : 'hover:bg-white text-slate-700'
                                }`}
                        >
                            השבוע
                        </button>
                        <button
                            onClick={nextWeek}
                            className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors shadow-sm cursor-pointer"
                            title="שבוע הבא"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Actions */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                    {/* Deadline settings toggle */}
                    <button
                        onClick={() => setShowDeadlinePanel(v => !v)}
                        className={`flex-1 sm:flex-none justify-center flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors border ${showDeadlinePanel ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/20' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                        <Settings2 className="w-4 h-4" />
                        יום הגשה
                    </button>

                    {/* Auto-assign button */}
                    <button
                        onClick={handleAutoAssign}
                        disabled={isAssigning}
                        className={`flex-1 sm:flex-none justify-center flex items-center gap-1.5 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all ${shouldRecommendAssign
                            ? 'bg-gradient-to-r from-brand-gold to-yellow-500 text-slate-900 border-none animate-[pulse_2s_ease-in-out_infinite] ring-2 ring-brand-gold ring-offset-2 hover:brightness-110'
                            : 'bg-brand-blue hover:bg-blue-700'
                            }`}
                    >
                        {isAssigning
                            ? <Loader2 className={`w-4 h-4 animate-spin ${shouldRecommendAssign ? 'text-slate-900' : ''}`} />
                            : <Wand2 className={`w-4 h-4 ${shouldRecommendAssign ? 'text-slate-900' : ''}`} />
                        }
                        שיבוץ אוטומטי
                    </button>

                    {/* Publish Button / Inline Confirm */}
                    {showPublishConfirm ? (
                        <div className="flex-1 flex flex-col gap-2 bg-red-50 border border-red-200 rounded-xl p-3 animate-in fade-in zoom-in duration-200">
                            {publishUnassignedCount > 0 ? (
                                <p className="text-xs font-bold text-red-700">
                                    ⚠️ {publishUnassignedCount} משמרות לא מאויישו! לפרסם בכל זאת?
                                </p>
                            ) : (
                                <p className="text-xs font-bold text-red-700">
                                    לשגר וואטסאפ לכל העובדים?
                                </p>
                            )}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={confirmPublish}
                                    className="flex-1 text-sm bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 font-bold transition"
                                >
                                    כן, שגר!
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPublishConfirm(false)}
                                    className="flex-1 text-sm bg-white text-slate-600 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 font-medium transition"
                                >
                                    בטל
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={handlePublish}
                            disabled={isPublishing || isAssigning}
                            className={`flex-1 sm:flex-none justify-center flex items-center gap-1.5 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all ${allShiftsFilled
                                ? 'bg-red-600 animate-[pulse_2s_ease-in-out_infinite] ring-2 ring-red-400 ring-offset-2 hover:bg-red-500'
                                : 'bg-red-600 hover:bg-red-700'
                                }`}
                            title="פרסם סידור"
                        >
                            {isPublishing
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Send className="w-4 h-4" />
                            }
                            <span>שגר סידור</span>
                        </button>
                    )}
                </div>

                {/* ── Deadline panel ──────────────────────────────────────── */}
                {showDeadlinePanel && (
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 animate-in fade-in slide-in-from-top-2">
                        <p className="text-sm font-semibold text-slate-700 mb-2">
                            יום בשבוע לקבלת זמינות מהעובדים
                        </p>
                        <p className="text-xs text-slate-500 mb-3">
                            המערכת תסמן את המשמרות כ"ממתין" או "מאויש" לאחר מועד זה.
                            ניתן לבצע שיבוץ אוטומטי בכל עת.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => updateSettings({ submissionDeadlineDay: -1 })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${deadline === -1
                                    ? 'bg-brand-blue text-white border-brand-blue'
                                    : 'bg-white text-slate-600 border-slate-300 hover:border-brand-blue'
                                    }`}
                            >
                                ללא הגדרה
                            </button>
                            {([0, 1, 2, 3, 4, 5, 6] as const).map(day => (
                                <button
                                    key={day}
                                    onClick={() => updateSettings({ submissionDeadlineDay: day })}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${deadline === day
                                        ? 'bg-brand-blue text-white border-brand-blue'
                                        : 'bg-white text-slate-600 border-slate-300 hover:border-brand-blue'
                                        }`}
                                >
                                    יום {WEEKDAY_LABELS_HE[day]}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Banners ───────────────────────────────── */}
                {allShiftsFilled && !isAssigning && !isPublishing && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-800 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
                        <span>
                            איזה יופי! כל המשמרות מאויישות ומוכנות. אפשר עכשיו לשגר את הסידור לעובדים בוואטסאפ.
                        </span>
                    </div>
                )}

                {allSubmitted && !allShiftsFilled && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-800 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
                        <span>
                            כל העובדים הגישו זמינות! מומלץ לבצע <button onClick={handleAutoAssign} disabled={isAssigning} className="underline hover:no-underline font-bold decoration-2 underline-offset-4">שיבוץ אוטומטי</button> כעת.
                        </span>
                    </div>
                )}

                {deadline >= 0 && deadlinePassed && !allSubmitted && !allShiftsFilled && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>
                            עבר יום {WEEKDAY_LABELS_HE[deadline]} — מועד הגשת הזמינות הסתיים.{' '}
                            <button
                                onClick={handleAutoAssign}
                                disabled={isAssigning}
                                className="font-bold underline hover:no-underline disabled:opacity-50"
                            >
                                {isAssigning ? 'מבצע שיבוץ...' : 'בצע שיבוץ אוטומטי'}
                            </button>
                        </span>
                    </div>
                )}

                {/* Feedback message */}
                {assignMsg && (
                    <div className="text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
                        {assignMsg}
                    </div>
                )}
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">{error}</div>}

            {/* ── Week grid ──────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            טוען משמרות...
                        </div>
                    ) : (
                        weekDays.map(({ dateObj, dateString }) => {
                            const dayShifts = groupedShifts[dateString] || [];
                            const isToday = new Date().toDateString() === dateObj.toDateString();

                            return (
                                <div
                                    key={dateString}
                                    id={`day-${dateString}`}
                                    className={`p-4 transition-colors ${isToday ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}
                                >
                                    {/* Day header */}
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className={`font-bold flex items-center gap-2 ${isToday ? 'text-brand-blue' : 'text-slate-900'}`}>
                                            <span>{dateObj.toLocaleDateString('he-IL', { weekday: 'long' })}</span>
                                            <span className="text-sm font-normal text-slate-400">
                                                {dateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
                                            </span>
                                        </h3>
                                        {addingDate !== dateString && (
                                            <button
                                                onClick={() => openAddShiftForDate(dateString)}
                                                className="text-brand-blue hover:bg-brand-blue/10 p-2 rounded-full transition-colors flex items-center gap-1 text-sm font-medium"
                                            >
                                                <Plus className="w-5 h-5" />
                                                <span className="hidden md:inline">הוסף משמרת</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* ── Add / Edit form ──────────────────────────────── */}
                                    {addingDate === dateString && (
                                        <form
                                            onSubmit={handleAdd}
                                            className="bg-slate-50 p-4 rounded-xl shadow-inner border border-brand-blue/20 mb-4 animate-in fade-in slide-in-from-top-2"
                                            dir="rtl"
                                        >
                                            <h4 className="font-bold text-slate-700 mb-3 text-sm">
                                                {editingShiftId ? 'עריכת משמרת קיימת' : 'הוספת משמרת חדשה'}
                                            </h4>

                                            {/* Shift hours — compact two-input layout for mobile */}
                                            <div className="mb-4">
                                                <label className="text-xs font-semibold text-slate-500 block mb-1.5">שעות משמרת</label>
                                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                                                    <input
                                                        type="time"
                                                        value={shiftStart}
                                                        onChange={e => {
                                                            setShiftStart(e.target.value);
                                                            // Clamp all role rows to new window
                                                            setRoleRows(prev => prev.map(r => ({
                                                                ...r,
                                                                startTime: r.startTime && r.startTime < e.target.value ? e.target.value : r.startTime,
                                                            })));
                                                        }}
                                                        className="w-full border border-slate-200 rounded-xl px-2 py-2 focus:ring-2 focus:ring-brand-blue focus:outline-none text-sm bg-white text-center"
                                                    />
                                                    <span className="text-slate-400 text-xs text-center">עד</span>
                                                    <input
                                                        type="time"
                                                        value={shiftEnd}
                                                        onChange={e => {
                                                            setShiftEnd(e.target.value);
                                                            // Clamp all role rows to new window
                                                            setRoleRows(prev => prev.map(r => ({
                                                                ...r,
                                                                endTime: r.endTime && r.endTime > e.target.value ? e.target.value : r.endTime,
                                                            })));
                                                        }}
                                                        className="w-full border border-slate-200 rounded-xl px-2 py-2 focus:ring-2 focus:ring-brand-blue focus:outline-none text-sm bg-white text-center"
                                                    />
                                                </div>
                                            </div>

                                            {/* Role requirements table */}
                                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-3">
                                                {/* Table header — compact */}
                                                <div className="grid grid-cols-[72px_102px_60px_24px] gap-1.5 px-3 py-2 bg-slate-100 text-xs font-semibold text-slate-500">
                                                    <span>תפקיד</span>
                                                    <span className="text-center">שעות</span>
                                                    <span className="text-center">רמה</span>
                                                    <span />
                                                </div>

                                                {/* Rows */}
                                                <div className="divide-y divide-slate-100">
                                                    {roleRows.map((row, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="grid grid-cols-[72px_102px_60px_24px] gap-1.5 px-3 py-2 items-center"
                                                        >
                                                            {/* Role name */}
                                                            <div>
                                                                <select
                                                                    required
                                                                    value={row.role}
                                                                    onChange={e => updateRow(idx, { role: e.target.value })}
                                                                    className="w-full border border-slate-200 rounded-lg px-1.5 py-1.5 text-xs focus:ring-2 focus:ring-brand-blue focus:outline-none text-right appearance-none"
                                                                >
                                                                    <option value="" disabled hidden>תפקיד</option>
                                                                    {ROLE_SUGGESTIONS.map(r => (
                                                                        <option key={r} value={r}>{r}</option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            {/* Per-role time — stacked vertically */}
                                                            <div className="flex flex-col gap-0.5">
                                                                <input
                                                                    type="time"
                                                                    value={row.startTime ?? shiftStart}
                                                                    min={shiftStart}
                                                                    max={shiftEnd}
                                                                    onChange={e => updateRow(idx, { startTime: e.target.value })}
                                                                    className="w-full border border-slate-200 rounded px-0 py-1 text-[11px] text-center focus:ring-1 focus:ring-brand-blue focus:outline-none"
                                                                />
                                                                <input
                                                                    type="time"
                                                                    value={row.endTime ?? shiftEnd}
                                                                    min={shiftStart}
                                                                    max={shiftEnd}
                                                                    onChange={e => updateRow(idx, { endTime: e.target.value })}
                                                                    className="w-full border border-slate-200 rounded px-0 py-1 text-[11px] text-center focus:ring-1 focus:ring-brand-blue focus:outline-none"
                                                                />
                                                            </div>

                                                            {/* Skill level — icon toggle buttons, vertical */}
                                                            <div className="flex flex-col gap-0.5">
                                                                {(['star', 'standard', 'junior'] as const).map(level => {
                                                                    const icons = { star: '★★★', standard: '★★', junior: '☆' };
                                                                    const active = row.skillLevel === level;
                                                                    const colors = {
                                                                        star: active ? 'bg-yellow-100 text-yellow-600 border-yellow-300' : 'text-slate-300',
                                                                        standard: active ? 'bg-blue-100 text-blue-600 border-blue-300' : 'text-slate-300',
                                                                        junior: active ? 'bg-slate-200 text-slate-600 border-slate-300' : 'text-slate-300',
                                                                    };
                                                                    return (
                                                                        <button
                                                                            key={level}
                                                                            type="button"
                                                                            title={SKILL_LEVEL_LABELS[level]}
                                                                            onClick={() => updateRow(idx, { skillLevel: level })}
                                                                            className={`flex-1 py-1.5 rounded text-xs border transition-colors ${active ? colors[level] + ' border' : 'border-transparent hover:text-slate-500'}`}
                                                                        >
                                                                            {icons[level]}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Remove row */}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeRow(idx)}
                                                                className="text-slate-300 hover:text-red-500 transition-colors flex items-center justify-center"
                                                                title="הסר שורה"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Add role row */}
                                                <button
                                                    type="button"
                                                    onClick={addRow}
                                                    className="w-full py-2 text-xs text-brand-blue hover:bg-brand-blue/5 flex items-center justify-center gap-1 transition-colors border-t border-slate-100"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    הוסף תפקיד
                                                </button>
                                            </div>

                                            {/* Total workers */}
                                            <p className="text-xs text-slate-500 mb-3">
                                                סה&quot;כ:{' '}
                                                <span className="font-bold text-slate-700">
                                                    {roleRows.reduce((s, r) => s + (r.count || 0), 0)}
                                                </span>{' '}
                                                עובדים
                                            </p>

                                            {/* Actions */}
                                            <div className="flex justify-start gap-2 text-sm">
                                                <button
                                                    type="submit"
                                                    className="bg-brand-blue hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-sm"
                                                >
                                                    {editingShiftId ? 'שמור שינויים' : 'שמור משמרת'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setAddingDate(null); setEditingShiftId(null); }}
                                                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 font-medium rounded-xl transition-colors"
                                                >
                                                    ביטול
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {/* ── Shift cards ──────────────────────────────────── */}
                                    {dayShifts.length > 0 ? (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {dayShifts.map(shift => (
                                                <ShiftCard
                                                    key={shift.id}
                                                    shift={shift}
                                                    staff={staff}
                                                    onRemove={() => {
                                                        removeShift(shift.id).catch(err => {
                                                            console.error("Failed to delete shift:", err);
                                                            alert("שגיאה במחיקת המשמרת");
                                                        });
                                                        if (editingShiftId === shift.id) {
                                                            setAddingDate(null);
                                                            setEditingShiftId(null);
                                                        }
                                                    }}
                                                    onEdit={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        handleEditClick(shift);
                                                    }}
                                                    onUpdate={updateShift}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        !addingDate || addingDate !== dateString ? (
                                            <div className="text-slate-400 text-sm py-2 px-2 flex items-center gap-2 bg-slate-50/50 rounded-lg border border-slate-100 border-dashed">
                                                <span className="block w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                                                אין משמרות שובצו ליום זה
                                            </div>
                                        ) : null
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            {/* ── How It Works Modal ────────────────────────────────────── */}
            <AnimatePresence>
                {showHowItWorks && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowHowItWorks(false)}
                                className="absolute top-4 left-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-blue/10 text-brand-blue mb-4">
                                    <Bot className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800">איך המערכת עובדת?</h3>
                                <p className="text-slate-500 mt-2 font-medium">שלושה שלבים פשוטים לניהול המשמרות שלך</p>
                            </div>

                            <div className="space-y-6 relative">
                                {/* Connecting line */}
                                <div className="absolute top-8 bottom-8 right-6 w-0.5 bg-slate-100 -z-10"></div>

                                {/* Step 1 */}
                                <div className="flex gap-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full bg-white border-4 border-slate-100 shadow-sm flex items-center justify-center text-xl font-black text-slate-400">1</div>
                                    </div>
                                    <div className="flex-1 pt-1.5">
                                        <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-brand-blue" />
                                            הגדרת משמרות
                                        </h4>
                                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                            הזן את המשמרות הנדרשות לכל יום בשבוע (לדוגמה: 2 מלצרים, טבח בוקר).
                                        </p>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="flex gap-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full bg-white border-4 border-blue-100 shadow-sm flex items-center justify-center text-xl font-black text-blue-500">2</div>
                                    </div>
                                    <div className="flex-1 pt-1.5">
                                        <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Smartphone className="w-5 h-5 text-blue-500" />
                                            איסוף זמינות מעובדים
                                        </h4>
                                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                            העובדים שלך פשוט שולחים הודעה לוואטסאפ של העסק עם הימים שהם פנויים השבוע. המערכת תעדכן את כולם באופן אוטומטי!
                                        </p>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="flex gap-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full bg-white border-4 border-emerald-100 shadow-sm flex items-center justify-center text-xl font-black text-emerald-500">3</div>
                                    </div>
                                    <div className="flex-1 pt-1.5">
                                        <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Wand2 className="w-5 h-5 text-emerald-500" />
                                            שיבוץ ושליחה
                                        </h4>
                                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                            לחיצה על <span className="font-bold">"שיבוץ אוטומטי"</span> תסדר את כולם בצורה אופטימלית (ותוכל לתקן ידנית). לאחר מכן <span className="font-bold text-red-600">"שגר סידור"</span> ישלח את המשמרות <span className="font-bold">וקובץ אקסל מרוכז</span> לעובדים!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <button
                                    onClick={() => setShowHowItWorks(false)}
                                    className="w-full bg-brand-blue hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm active:scale-95"
                                >
                                    הבנתי, תודה!
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// ShiftCard — fixed RTL layout, no text truncation
// ────────────────────────────────────────────────────────────────────────────
function ShiftCard({ shift, staff, onRemove, onEdit, onUpdate }: { shift: Shift; staff: StaffMember[]; onRemove: () => void; onEdit: (e: React.MouseEvent) => void; onUpdate: (shiftId: string, updates: Partial<Shift>) => Promise<void> }) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const roles = shift.roleRequirements ?? [];
    const isFilled = shift.filledCount >= shift.totalRequired;

    const handleUnassign = async (e: React.MouseEvent, roleIndex: number, staffId: string) => {
        e.stopPropagation();
        if (!confirm('האם להסיר את העובד מהמשמרת?')) return;

        const updatedRoles = [...roles];
        const role = updatedRoles[roleIndex];
        role.assignedIds = (role.assignedIds || []).filter(id => id !== staffId);

        const newFilledCount = updatedRoles.reduce((sum, r) => sum + (r.assignedIds?.length || 0), 0);

        try {
            await onUpdate(shift.id, {
                roleRequirements: updatedRoles,
                filledCount: newFilledCount
            });
        } catch (err) {
            console.error('Failed to unassign staff:', err);
            alert('שגיאה בהסרת עובד');
        }
    };

    return (
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm" dir="rtl">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
                {/* Title + coverage */}
                <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800 text-sm leading-snug">{shift.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                        {shift.filledCount} מתוך {shift.totalRequired} כיסויים
                    </div>
                </div>

                {/* Status + actions */}
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    {isFilled ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            ממתין לאיוש
                        </span>
                    )}
                    {confirmDelete ? (
                        <div className="flex items-center gap-2 bg-rose-50 rounded-lg px-2 py-1 border border-rose-200 animate-in fade-in zoom-in duration-200">
                            <span className="text-xs font-bold text-rose-700">למחוק?</span>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="text-xs bg-rose-600 text-white px-3 py-1 rounded-md hover:bg-rose-700 transition"
                            >
                                כן
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                                className="text-xs bg-white text-slate-600 border border-slate-300 px-3 py-1 rounded-md hover:bg-slate-50 transition"
                            >
                                לא
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onEdit}
                                className="text-slate-400 hover:text-brand-blue transition-colors p-2 md:p-1.5 rounded-full hover:bg-blue-50"
                                title="ערוך משמרת"
                            >
                                <Edit2 className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                                className="text-slate-400 hover:text-rose-500 transition-colors p-2 md:p-1.5 rounded-full hover:bg-rose-50"
                                title="מחק משמרת"
                            >
                                <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Role badges — each on its own line if needed */}
            {roles.length > 0 && (
                <div className="flex flex-col gap-2 mt-3 p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                    {roles.map((r, i) => {
                        return (
                            <div key={i} className={`flex flex-col gap-1.5 p-2.5 rounded-lg border ${SKILL_COLORS[r.skillLevel]}`}>
                                <div className="flex items-center gap-1.5 text-sm font-semibold flex-wrap">
                                    <span className="bg-white/50 px-1.5 py-0.5 rounded text-xs leading-none shadow-sm">{r.count}×</span>
                                    <span>{r.role}</span>
                                    <span className="opacity-70 text-xs font-normal">({SKILL_SHORT[r.skillLevel]})</span>
                                    {r.startTime && r.endTime && (
                                        <span className="text-xs opacity-60 font-mono">{r.startTime}–{r.endTime}</span>
                                    )}
                                </div>
                                {(r.assignedIds && r.assignedIds.length > 0) ? (
                                    <div className="text-sm font-medium pr-1 text-slate-700 flex flex-wrap gap-1 mt-1">
                                        <span className="text-xs text-slate-500 self-center ml-1">שובצו:</span>
                                        {r.assignedIds.map(id => {
                                            const member = staff.find(s => s.id === id);
                                            const name = member?.name || 'עובד שנמחק';
                                            return (
                                                <button
                                                    key={id}
                                                    onClick={(e) => handleUnassign(e, i, id)}
                                                    className="inline-flex items-center gap-1 bg-white/60 hover:bg-rose-100 hover:text-rose-700 px-2 py-0.5 rounded border border-transparent hover:border-rose-200 transition-colors group"
                                                    title="הסר עובד ממשמרת"
                                                >
                                                    {name}
                                                    <Trash2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-500 pr-1 mt-1">— לא שובץ אף עובד —</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
