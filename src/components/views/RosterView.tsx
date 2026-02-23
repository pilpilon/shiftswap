import { useState } from 'react';
import { useAuth } from '../../../src/context/AuthContext';
import { useShifts } from '../../../src/hooks/useShifts';
import type { Shift } from '../../../src/hooks/useShifts';
import { Calendar, Plus, CheckCircle2, Loader2, Trash2 } from 'lucide-react';

export default function RosterView() {
    const { user } = useAuth();
    const { shifts, loading, error, addShift, removeShift } = useShifts(user?.businessId);

    const [isAdding, setIsAdding] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [newTitle, setNewTitle] = useState('בוקר (08:00 - 16:00)');
    const [newTotalRequired, setNewTotalRequired] = useState(3);
    const [newIsUrgent, setNewIsUrgent] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addShift(newDate, newTitle, newTotalRequired, newIsUrgent);
            setIsAdding(false);
        } catch (err) {
            console.error("Failed to add shift", err);
            alert("שגיאה בהוספת משמרת");
        }
    };

    // Group shifts by date for display
    const groupedShifts = shifts.reduce((acc, shift) => {
        if (!acc[shift.date]) acc[shift.date] = [];
        acc[shift.date].push(shift);
        return acc;
    }, {} as Record<string, Shift[]>);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800 md:hidden">סידור עבודה - השבוע</h2>
                <div className="hidden md:flex gap-2">
                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors">
                        שבוע קודם
                    </button>
                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors">
                        שבוע הבא
                    </button>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-brand-blue hover:bg-brand-blue/90 text-white p-3 md:px-4 md:py-2 rounded-full md:rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    {isAdding ? <span className="font-medium hidden md:inline">ביטול</span> : <>
                        <Plus className="w-5 h-5" />
                        <span className="hidden md:inline font-medium">הוספת משמרת</span>
                    </>}
                </button>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">{error}</div>}

            {isAdding && (
                <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">משמרת חדשה</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input required type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-blue focus:outline-none" />
                        <select value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-blue focus:outline-none">
                            <option value="בוקר (08:00 - 16:00)">בוקר (08:00 - 16:00)</option>
                            <option value="ערב (16:00 - 24:00)">ערב (16:00 - 24:00)</option>
                            <option value="לילה (24:00 - 08:00)">לילה (24:00 - 08:00)</option>
                            <option value="משמרת כפולה">משמרת כפולה</option>
                        </select>
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-slate-600 mb-1">מספר עובדים נדרש</label>
                            <input required type="number" min="1" max="20" value={newTotalRequired} onChange={e => setNewTotalRequired(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-blue focus:outline-none" />
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="urgent" checked={newIsUrgent} onChange={e => setNewIsUrgent(e.target.checked)} className="w-5 h-5 accent-brand-blue" />
                            <label htmlFor="urgent" className="font-medium text-slate-700">סמן משמרת בסיכון / דחופה</label>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button type="submit" className="bg-brand-green hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-sm">
                            שמור משמרת
                        </button>
                    </div>
                </form>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            טוען משמרות...
                        </div>
                    ) : Object.keys(groupedShifts).length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            לא נמצאו משמרות למשך התקופה. הוסף משמרת כדי להתחיל.
                        </div>
                    ) : Object.entries(groupedShifts).map(([date, dayShifts]) => (
                        <div key={date} className="p-4 md:p-6 hover:bg-slate-50/50 transition-colors">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-brand-blue" />
                                {new Date(date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'short' })}
                            </h3>
                            <div className="grid gap-3 md:grid-cols-2">
                                {dayShifts.map((shift) => (
                                    <div key={shift.id} className={`p-4 rounded-xl border ${shift.isUrgent ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'} flex justify-between items-center group`}>
                                        <div>
                                            <div className="font-medium text-slate-800">{shift.title}</div>
                                            <div className="text-sm text-slate-500 mt-1">
                                                {shift.filledCount} מתוך {shift.totalRequired} כיסויים
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {shift.isUrgent ? (
                                                <button className="text-xs font-bold text-red-600 bg-red-100 px-3 py-1.5 rounded-full hover:bg-red-200 transition-colors">
                                                    דרוש איוש!
                                                </button>
                                            ) : shift.filledCount >= shift.totalRequired ? (
                                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                                            ) : (
                                                <button className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                                                    חסר איש צוות
                                                </button>
                                            )}

                                            <button
                                                onClick={() => {
                                                    if (window.confirm('האם אתה בטוח שברצונך למחוק את המשמרת?')) {
                                                        removeShift(shift.id);
                                                    }
                                                }}
                                                className="text-slate-400 hover:text-red-500 hidden group-hover:block transition-colors p-1"
                                                title="מחק משמרת"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
