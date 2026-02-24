import { useState } from 'react';
import { useAuth } from '../../../src/context/AuthContext';
import { useShifts, type Shift, type RoleRequirement, type SkillLevel, SKILL_LEVEL_LABELS } from '../../../src/hooks/useShifts';
import { useStaff, type StaffMember } from '../../../src/hooks/useStaff';
import { useSettings } from '../../../src/hooks/useSettings';
import { runAutoAssign, WEEKDAY_LABELS_HE, isDeadlinePassed } from '../../../src/hooks/useAutoAssign';
import {
    Calendar, Plus, CheckCircle2, Loader2, Trash2,
    ChevronRight, ChevronLeft, Edit2, Wand2, Settings2, AlertCircle, Send
} from 'lucide-react';

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
const newRow = (): RoleRequirement => ({ role: '', count: 1, skillLevel: 'standard' });

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────
export default function RosterView() {
    const { user } = useAuth();
    const { shifts, loading, error, addShift, removeShift, updateShift } = useShifts(user?.businessId);
    const { staff } = useStaff(user?.businessId);
    const { settings, updateSettings } = useSettings();

    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getStartOfWeek(new Date()));
    const [addingDate, setAddingDate] = useState<string | null>(null);
    const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const [assignMsg, setAssignMsg] = useState<string | null>(null);
    const [showDeadlinePanel, setShowDeadlinePanel] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    // Form state
    const [newDate, setNewDate] = useState('');
    const [newTitle, setNewTitle] = useState('בוקר (08:00 - 16:00)');
    const [roleRows, setRoleRows] = useState<RoleRequirement[]>([newRow()]);

    // ── Form helpers ──────────────────────────────────────────────────────────
    const openAddShiftForDate = (dateStr: string) => {
        setEditingShiftId(null);
        setNewDate(dateStr);
        setNewTitle('בוקר (08:00 - 16:00)');
        setRoleRows([newRow()]);
        setAddingDate(dateStr);
    };

    const handleEditClick = (shift: Shift) => {
        setEditingShiftId(shift.id);
        setNewDate(shift.date);
        setNewTitle(shift.title);
        setRoleRows(shift.roleRequirements && shift.roleRequirements.length > 0 ? shift.roleRequirements : [newRow()]);
        setAddingDate(shift.date);
        document.getElementById(`day-${shift.date}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const updateRow = (index: number, patch: Partial<RoleRequirement>) => {
        setRoleRows(prev => prev.map((r, i) => i === index ? { ...r, ...patch } : r));
    };

    const addRow = () => setRoleRows(prev => [...prev, newRow()]);

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
        try {
            if (editingShiftId) {
                const totalRequired = roleRows.reduce((sum, r) => sum + r.count, 0);
                await updateShift(editingShiftId, { title: newTitle, roleRequirements: roleRows, totalRequired });
            } else {
                await addShift(newDate, newTitle, roleRows);
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
            const results = await runAutoAssign(shifts, staff);
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
            alert('אין משמרות לפרסום בשבוע זה');
            return;
        }

        const unassigned = shifts.filter(s => s.filledCount < s.totalRequired);
        if (unassigned.length > 0) {
            const proceed = window.confirm(`שים לב: קיימות ${unassigned.length} משמרות שלא אויישו במלואן. האם בכל זאת לפרסם את הסידור? המערכת תשלח הודעות וואטסאפ לכל העובדים המשובצים.`);
            if (!proceed) return;
        } else {
            const proceed = window.confirm('האם אתה בטוח שברצונך לפרסם את סידור העבודה? המערכת תשגר הודעת וואטסאפ לכל העובדים עם המשמרות שלהם.');
            if (!proceed) return;
        }

        setIsPublishing(true);
        // Simulate an API call / sending WhatsApp messages
        setTimeout(() => {
            setIsPublishing(false);
            setAssignMsg('✅ הסידור פורסם בהצלחה והודעות נשלחו לעובדים!');
            setTimeout(() => setAssignMsg(null), 5000);
        }, 1500);
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

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4" dir="rtl">
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-brand-blue" />
                        יומן שבועי
                    </h2>
                    {/* Deadline settings toggle */}
                    <button
                        onClick={() => setShowDeadlinePanel(v => !v)}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-blue hover:bg-brand-blue/5 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                    >
                        <Settings2 className="w-3.5 h-3.5" />
                        יום הגשה
                    </button>
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

                {/* ── Deadline status banner ───────────────────────────────── */}
                {deadline >= 0 && deadlinePassed && (
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

                {/* ── Auto-assign button + message ─────────────────────────── */}
                <div className="flex items-center gap-3">
                    {/* Week navigator */}
                    <div className="flex items-center gap-1 bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                        <button
                            onClick={prevWeek}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                            title="שבוע קודם"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={jumpToToday}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${isCurrentWeek
                                ? 'bg-brand-blue/10 text-brand-blue'
                                : 'hover:bg-slate-100 text-slate-700'
                                }`}
                        >
                            השבוע
                        </button>
                        <button
                            onClick={nextWeek}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                            title="שבוע הבא"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Publish Button */}
                    <button
                        onClick={handlePublish}
                        disabled={isPublishing || isAssigning}
                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition-all"
                        title="פרסם סידור"
                    >
                        {isPublishing
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Send className="w-4 h-4" />
                        }
                        <span className="hidden sm:inline">שגר סידור</span>
                    </button>

                    {/* Auto-assign button */}
                    <button
                        onClick={handleAutoAssign}
                        disabled={isAssigning}
                        className="flex items-center gap-1.5 bg-brand-blue hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition-all"
                    >
                        {isAssigning
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Wand2 className="w-4 h-4" />
                        }
                        שיבוץ אוטומטי
                    </button>
                </div>

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

                                            {/* Shift type */}
                                            <select
                                                value={newTitle}
                                                onChange={e => setNewTitle(e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-blue focus:outline-none text-sm mb-4 bg-white text-right"
                                            >
                                                <option value="בוקר (08:00 - 16:00)">בוקר (08:00 - 16:00)</option>
                                                <option value="ערב (16:00 - 24:00)">ערב (16:00 - 24:00)</option>
                                                <option value="לילה (24:00 - 08:00)">לילה (24:00 - 08:00)</option>
                                                <option value="משמרת כפולה">משמרת כפולה</option>
                                            </select>

                                            {/* Role requirements table */}
                                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-3">
                                                {/* Table header */}
                                                <div className="grid grid-cols-[auto_52px_110px_32px] gap-2 px-3 py-2 bg-slate-100 text-xs font-semibold text-slate-500">
                                                    <span>תפקיד</span>
                                                    <span className="text-center">כמות</span>
                                                    <span className="text-center">רמה</span>
                                                    <span />
                                                </div>

                                                {/* Rows */}
                                                <div className="divide-y divide-slate-100">
                                                    {roleRows.map((row, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="grid grid-cols-[auto_52px_110px_32px] gap-2 px-3 py-2 items-center"
                                                        >
                                                            {/* Role name */}
                                                            <div>
                                                                <input
                                                                    list="role-suggestions"
                                                                    required
                                                                    value={row.role}
                                                                    onChange={e => updateRow(idx, { role: e.target.value })}
                                                                    placeholder="למשל: מלצר"
                                                                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none text-right"
                                                                />
                                                                <datalist id="role-suggestions">
                                                                    {ROLE_SUGGESTIONS.map(r => (
                                                                        <option key={r} value={r} />
                                                                    ))}
                                                                </datalist>
                                                            </div>

                                                            {/* Count */}
                                                            <input
                                                                type="number"
                                                                required
                                                                min={1}
                                                                max={50}
                                                                value={row.count}
                                                                onChange={e => updateRow(idx, { count: Number(e.target.value) })}
                                                                className="w-full border border-slate-200 rounded-lg px-1 py-1.5 text-sm text-center focus:ring-2 focus:ring-brand-blue focus:outline-none"
                                                            />

                                                            {/* Skill level */}
                                                            <select
                                                                value={row.skillLevel}
                                                                onChange={e => updateRow(idx, { skillLevel: e.target.value as SkillLevel })}
                                                                className={`w-full border rounded-lg px-2 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-brand-blue focus:outline-none ${SKILL_COLORS[row.skillLevel]}`}
                                                            >
                                                                {(Object.entries(SKILL_LEVEL_LABELS) as [SkillLevel, string][]).map(([key, label]) => (
                                                                    <option key={key} value={key}>{label}</option>
                                                                ))}
                                                            </select>

                                                            {/* Remove row */}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeRow(idx)}
                                                                className="text-slate-300 hover:text-red-500 transition-colors flex items-center justify-center"
                                                                title="הסר שורה"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
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
                                                    onRemove={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        if (window.confirm('האם אתה בטוח שברצונך למחוק את המשמרת?')) {
                                                            removeShift(shift.id).catch(err => {
                                                                console.error("Failed to delete shift:", err);
                                                                alert("שגיאה במחיקת המשמרת");
                                                            });
                                                            if (editingShiftId === shift.id) {
                                                                setAddingDate(null);
                                                                setEditingShiftId(null);
                                                            }
                                                        }
                                                    }}
                                                    onEdit={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        handleEditClick(shift);
                                                    }}
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
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// ShiftCard — fixed RTL layout, no text truncation
// ────────────────────────────────────────────────────────────────────────────
function ShiftCard({ shift, staff, onRemove, onEdit }: { shift: Shift; staff: StaffMember[]; onRemove: (e: React.MouseEvent) => void; onEdit: (e: React.MouseEvent) => void }) {
    const roles = shift.roleRequirements ?? [];
    const isFilled = shift.filledCount >= shift.totalRequired;

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
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            ממתין לאיוש
                        </span>
                    )}
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
                        onClick={onRemove}
                        className="text-slate-400 hover:text-red-500 transition-colors p-2 md:p-1.5 rounded-full hover:bg-red-50"
                        title="מחק משמרת"
                    >
                        <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                    </button>
                </div>
            </div>

            {/* Role badges — each on its own line if needed */}
            {roles.length > 0 && (
                <div className="flex flex-col gap-2 mt-3 p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                    {roles.map((r, i) => {
                        const assignedNames = (r.assignedIds || [])
                            .map(id => staff.find(s => s.id === id)?.name || 'עובד שנמחק')
                            .filter(Boolean);

                        return (
                            <div key={i} className={`flex flex-col gap-1.5 p-2.5 rounded-lg border ${SKILL_COLORS[r.skillLevel]}`}>
                                <div className="flex items-center gap-1.5 text-sm font-semibold">
                                    <span className="bg-white/50 px-1.5 py-0.5 rounded text-xs leading-none shadow-sm">{r.count}×</span>
                                    <span>{r.role}</span>
                                    <span className="opacity-70 text-xs font-normal">({SKILL_SHORT[r.skillLevel]})</span>
                                </div>
                                {assignedNames.length > 0 ? (
                                    <div className="text-sm font-medium pr-1 text-slate-700">
                                        שובצו: {assignedNames.join(', ')}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-500 pr-1">— לא שובץ אף עובד —</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
