import { useState } from 'react';
import { useAuth } from '../../../src/context/AuthContext';
import { useStaff } from '../../../src/hooks/useStaff';
import { Search, Filter, UserPlus, Loader2, UserMinus } from 'lucide-react';

export default function StaffView() {
    const { user } = useAuth();
    const { staff, loading, error, addStaffMember, removeStaffMember } = useStaff(user?.businessId);

    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newRole, setNewRole] = useState('מלצר');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addStaffMember(newName, newPhone, newRole);
            setNewName('');
            setNewPhone('');
            setIsAdding(false);
        } catch (err) {
            console.error("Failed to add staff", err);
            alert("שגיאה בהוספת עובד");
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800 hidden md:block">צוות העובדים</h2>
                <div className="flex flex-wrap w-full sm:w-auto gap-2">
                    <div className="relative flex-1 sm:w-64 min-w-[200px]">
                        <Search className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input type="text" placeholder="חיפוש עובד..." className="w-full pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                    </div>
                    <button className="p-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors">
                        <Filter className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="bg-brand-blue hover:bg-brand-blue/90 text-white p-2 sm:px-4 sm:py-2 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
                    >
                        {isAdding ? <span className="font-medium">ביטול</span> : <>
                            <UserPlus className="w-5 h-5" />
                            <span className="hidden sm:inline font-medium">הוספת עובד</span>
                        </>}
                    </button>
                </div>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">{error}</div>}

            {isAdding && (
                <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">הוספת עובד חדש</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input required type="text" placeholder="שם מלא" value={newName} onChange={e => setNewName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-blue focus:outline-none" />
                        <input required type="tel" placeholder="מספר נייד (לדוגמה: 0501234567)" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-blue focus:outline-none" />
                        <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-blue focus:outline-none">
                            <option value="מלצר">מלצר</option>
                            <option value="אחמ״ש">אחמ״ש</option>
                            <option value="ברמן">ברמן</option>
                            <option value="טבח">טבח</option>
                            <option value="מארחת">מארחת</option>
                        </select>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button type="submit" className="bg-brand-green hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-sm">
                            שמור עובד
                        </button>
                    </div>
                </form>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-right min-w-[600px]">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-medium">
                            <tr>
                                <th className="p-4 rounded-tr-2xl">שם העובד</th>
                                <th className="p-4">מספר נייד</th>
                                <th className="p-4">תפקיד</th>
                                <th className="p-4 text-center">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        טוען נתוני עובדים...
                                    </td>
                                </tr>
                            ) : staff.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400">
                                        לא נמצאו עובדים במערכת. לחץ על "הוספת עובד" כדי להתחיל.
                                    </td>
                                </tr>
                            ) : staff.map((member) => (
                                <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-medium flex items-center gap-3">
                                        <div className="w-10 h-10 shrink-0 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold">
                                            {member.name.charAt(0)}
                                        </div>
                                        {member.name}
                                    </td>
                                    <td className="p-4 text-slate-600" dir="ltr">
                                        {member.phone}
                                    </td>
                                    <td className="p-4">
                                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                                            {member.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center text-slate-400">
                                        <div className="flex items-center justify-center w-full gap-2">
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('האם אתה בטוח שברצונך למחוק את ' + member.name + '?')) {
                                                        removeStaffMember(member.id);
                                                    }
                                                }}
                                                className="hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                            >
                                                <UserMinus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
