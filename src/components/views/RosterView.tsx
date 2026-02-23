import { useState } from 'react';
import { useAuth } from '../../../src/context/AuthContext';
import { useShifts, type Shift } from '../../../src/hooks/useShifts';
import { Calendar, Plus, CheckCircle2, Loader2, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';

const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
};

export default function RosterView() {
    const { user } = useAuth();
    const { shifts, loading, error, addShift, removeShift } = useShifts(user?.businessId);

    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getStartOfWeek(new Date()));
    const [addingDate, setAddingDate] = useState<string | null>(null);
    const [newDate, setNewDate] = useState('');
    const [newTitle, setNewTitle] = useState('בוקר (08:00 - 16:00)');
    const [newTotalRequired, setNewTotalRequired] = useState(3);
    const [newIsUrgent, setNewIsUrgent] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addShift(newDate, newTitle, newTotalRequired, newIsUrgent);
            setAddingDate(null);
        } catch (err) {
            console.error("Failed to add shift", err);
            alert("שגיאה בהוספת משמרת");
        }
    };

    const openAddShiftForDate = (dateStr: string) => {
        setNewDate(dateStr);
        setNewTitle('בוקר (08:00 - 16:00)');
        setNewTotalRequired(3);
        setNewIsUrgent(false);
        setAddingDate(dateStr);
    };

    const nextWeek = () => {
        const next = new Date(currentWeekStart);
        next.setDate(next.getDate() + 7);
        setCurrentWeekStart(next);
        setAddingDate(null);
    };

    const prevWeek = () => {
        const prev = new Date(currentWeekStart);
        prev.setDate(prev.getDate() - 7);
        setCurrentWeekStart(prev);
        setAddingDate(null);
    };

    const jumpToToday = () => {
        setCurrentWeekStart(getStartOfWeek(new Date()));
        setAddingDate(null);
    };

    // Group shifts by date for display
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
        return {
            dateObj: d,
            dateString: `${year}-${month}-${day}`
        };
    });

    const isCurrentWeek = getStartOfWeek(new Date()).getTime() === currentWeekStart.getTime();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-brand-blue" />
                    יומן שבועי
                </h2>
                <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-slate-200 p-1" dir="ltr">
                    <button onClick={nextWeek} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" title="שבוע הבא">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                        onClick={jumpToToday}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${isCurrentWeek ? 'bg-brand-blue/10 text-brand-blue' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                        השבוע
                    </button>
                    <button onClick={prevWeek} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" title="שבוע קודם">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">{error}</div>}

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
                                <div key={dateString} id={`day-${dateString}`} className={`p-4 md:p-6 transition-colors ${isToday ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className={`font-bold flex items-center gap-2 ${isToday ? 'text-brand-blue' : 'text-slate-900'}`}>
                                            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                                                <span>{dateObj.toLocaleDateString('he-IL', { weekday: 'long' })}</span>
                                                <span className="text-sm font-normal text-slate-500">
                                                    {dateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
                                                </span>
                                            </div>
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

                                    {addingDate === dateString && (
                                        <form onSubmit={handleAdd} className="bg-slate-50 p-4 md:p-5 rounded-xl shadow-inner border border-brand-blue/20 mb-4 animate-in fade-in slide-in-from-top-2">
                                            <h4 className="font-bold text-slate-700 mb-3 text-sm">הוספת משמרת חדשה</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <select value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-blue focus:outline-none text-sm">
                                                    <option value="בוקר (08:00 - 16:00)">בוקר (08:00 - 16:00)</option>
                                                    <option value="ערב (16:00 - 24:00)">ערב (16:00 - 24:00)</option>
                                                    <option value="לילה (24:00 - 08:00)">לילה (24:00 - 08:00)</option>
                                                    <option value="משמרת כפולה">משמרת כפולה</option>
                                                </select>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 h-full">
                                                        <label className="text-sm font-medium text-slate-600 whitespace-nowrap">מספר עובדים:</label>
                                                        <input required type="number" min="1" max="20" value={newTotalRequired} onChange={e => setNewTotalRequired(Number(e.target.value))} className="w-20 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-brand-blue focus:outline-none text-sm" />
                                                    </div>
                                                </div>
                                                <div className="md:col-span-2 flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100">
                                                    <input type="checkbox" id="urgent" checked={newIsUrgent} onChange={e => setNewIsUrgent(e.target.checked)} className="w-5 h-5 accent-brand-blue rounded cursor-pointer" />
                                                    <label htmlFor="urgent" className="font-medium text-slate-700 text-sm cursor-pointer select-none">סמן משמרת בסיכון / דחופה</label>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex justify-end gap-2 text-sm">
                                                <button type="button" onClick={() => setAddingDate(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 font-medium rounded-xl transition-colors">
                                                    ביטול
                                                </button>
                                                <button type="submit" className="bg-brand-green hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-sm">
                                                    שמור משמרת
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {dayShifts.length > 0 ? (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {dayShifts.map((shift) => (
                                                <div key={shift.id} className={`p-4 rounded-xl border ${shift.isUrgent ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'} flex justify-between items-center group shadow-sm`}>
                                                    <div>
                                                        <div className="font-medium text-slate-800 text-sm md:text-base">{shift.title}</div>
                                                        <div className="text-xs md:text-sm text-slate-500 mt-1 font-medium">
                                                            {shift.filledCount} מתוך {shift.totalRequired} כיסויים
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {shift.isUrgent ? (
                                                            <button className="text-[10px] md:text-xs font-bold text-red-600 bg-red-100 px-2 md:px-3 py-1 md:py-1.5 rounded-full hover:bg-red-200 transition-colors">
                                                                דרוש איוש!
                                                            </button>
                                                        ) : shift.filledCount >= shift.totalRequired ? (
                                                            <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                                                        ) : (
                                                            <button className="text-[10px] md:text-xs font-bold text-slate-600 bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 rounded-full">
                                                                חסר איש צוות
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm('האם אתה בטוח שברצונך למחוק את המשמרת?')) {
                                                                    removeShift(shift.id);
                                                                }
                                                            }}
                                                            className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full cursor-pointer bg-slate-50 hover:bg-red-50"
                                                            title="מחק משמרת"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        !addingDate || addingDate !== dateString ? (
                                            <div className="text-slate-400 text-sm py-2 px-2 flex items-center gap-2 bg-slate-50/50 rounded-lg border border-slate-100 border-dashed">
                                                <span className="block w-1.5 h-1.5 rounded-full bg-slate-300"></span>
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
