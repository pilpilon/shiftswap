import { useState } from 'react';
import { useAuth } from '../../../src/context/AuthContext';
import { useStaff, type StaffMember } from '../../../src/hooks/useStaff';
import { type SkillLevel, SKILL_LEVEL_LABELS } from '../../../src/hooks/useShifts';
import { useAvailability } from '../../../src/hooks/useAvailability';
import { Search, Filter, UserPlus, Loader2, UserMinus, Edit2, Check, X, Calendar } from 'lucide-react';

const SKILL_COLORS: Record<SkillLevel, string> = {
    star: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    standard: 'bg-blue-100 text-blue-700 border-blue-300',
    junior: 'bg-slate-100 text-slate-600 border-slate-300',
};

const COMMON_ROLES = ['מלצר', 'טבח', 'מארחת', 'אחמש', 'בר', 'קופאי', 'מנהל משמרת'];

export default function StaffView() {
    const { user } = useAuth();
    const { staff, loading, error, addStaffMember, removeStaffMember, updateStaffMember } = useStaff(user?.businessId);

    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newRoles, setNewRoles] = useState<string[]>([]);
    const [newRoleInput, setNewRoleInput] = useState('');
    const [newSkillLevel, setNewSkillLevel] = useState<SkillLevel>('standard');

    const [searchQuery, setSearchQuery] = useState('');

    // Availability modal
    const [selectedEmployee, setSelectedEmployee] = useState<StaffMember | null>(null);
    const { getEmployeeAvailability } = useAvailability(user?.businessId);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editRoles, setEditRoles] = useState<string[]>([]);
    const [editRoleInput, setEditRoleInput] = useState('');
    const [editSkillLevel, setEditSkillLevel] = useState<SkillLevel>('standard');



    const removeRole = (index: number, rolesMap: string[], setRoles: (r: string[]) => void) => {
        setRoles(rolesMap.filter((_, i) => i !== index));
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        // Handle pending input as a role
        const finalRoles = [...newRoles];
        const pendingRole = newRoleInput.trim();
        if (pendingRole && !finalRoles.includes(pendingRole)) {
            finalRoles.push(pendingRole);
        }

        if (finalRoles.length === 0) {
            alert("יש להזין לפחות תפקיד אחד");
            return;
        }

        try {
            await addStaffMember(newName, newPhone, finalRoles, newSkillLevel);
            setNewName('');
            setNewPhone('');
            setNewRoles([]);
            setNewRoleInput('');
            setNewSkillLevel('standard');
            setIsAdding(false);
        } catch (err) {
            console.error("Failed to add staff", err);
            alert("שגיאה בהוספת עובד");
        }
    };

    const startEdit = (member: StaffMember) => {
        setEditingId(member.id);
        setEditName(member.name);
        setEditPhone(member.phone);
        setEditRoles([...member.roles]);
        setEditSkillLevel(member.skillLevel || 'standard');
        setEditRoleInput('');
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const saveEdit = async (id: string) => {
        // Handle pending input
        const finalRoles = [...editRoles];
        const pendingRole = editRoleInput.trim();
        if (pendingRole && !finalRoles.includes(pendingRole)) {
            finalRoles.push(pendingRole);
        }

        if (finalRoles.length === 0) {
            alert("יש להזין לפחות תפקיד אחד");
            return;
        }

        try {
            await updateStaffMember(id, {
                name: editName,
                phone: editPhone,
                roles: finalRoles,
                skillLevel: editSkillLevel
            });
            setEditingId(null);
        } catch (err) {
            console.error("Failed to update staff", err);
            alert("שגיאה בעדכון עובד");
        }
    };

    const filteredStaff = staff.filter(s =>
        s.name.includes(searchQuery) ||
        s.phone.includes(searchQuery) ||
        (s.roles && s.roles.some(r => r.includes(searchQuery)))
    );

    return (
        <>
            <div className="space-y-6 h-full flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-800 hidden md:block">צוות העובדים</h2>
                    <div className="flex flex-wrap w-full sm:w-auto gap-2">
                        <div className="relative flex-1 sm:w-64 min-w-[200px]">
                            <Search className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="חיפוש עובד..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            />
                        </div>
                        <button className="p-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors">
                            <Filter className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="bg-brand-blue hover:bg-blue-700 text-white p-2 sm:px-4 sm:py-2 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
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
                    <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 animate-in fade-in slide-in-from-top-2">
                        <h3 className="font-bold text-lg mb-4 text-slate-800">הוספת עובד חדש</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">שם מלא</label>
                                <input required type="text" placeholder="שם העובד" value={newName} onChange={e => setNewName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none bg-white" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">מספר נייד</label>
                                <input required type="tel" placeholder="לדוגמה: 0501234567" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none bg-white" />
                            </div>

                            <div className="space-y-1 lg:col-span-2">
                                <label className="text-xs font-medium text-slate-500">תפקידים (הקש Enter או הוסף לכל תפקיד)</label>
                                <div className="flex flex-wrap gap-2 p-2 border border-slate-200 rounded-xl bg-white min-h-[42px] items-center">
                                    {newRoles.map((role, idx) => (
                                        <span key={idx} className="bg-brand-blue/10 text-brand-blue px-2 py-1 rounded-md text-sm flex items-center gap-1">
                                            {role}
                                            <button type="button" onClick={() => removeRole(idx, newRoles, setNewRoles)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                                        </span>
                                    ))}
                                    <div className="flex-1 flex min-w-[120px]">
                                        <select
                                            value={newRoleInput}
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (val) {
                                                    if (!newRoles.includes(val)) setNewRoles([...newRoles, val]);
                                                    setNewRoleInput('');
                                                }
                                            }}
                                            className="w-full text-sm py-1 focus:outline-none bg-transparent"
                                            dir="rtl"
                                        >
                                            <option value="" disabled>בחר תפקיד...</option>
                                            {COMMON_ROLES.filter(r => !newRoles.includes(r)).map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">רמת עובד</label>
                                <select
                                    value={newSkillLevel}
                                    onChange={e => setNewSkillLevel(e.target.value as SkillLevel)}
                                    className={`w-full border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none bg-white font-medium ${SKILL_COLORS[newSkillLevel]}`}
                                >
                                    {(Object.entries(SKILL_LEVEL_LABELS) as [SkillLevel, string][]).map(([key, label]) => (
                                        <option key={key} value={key} className="bg-white text-slate-800">{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 font-medium rounded-xl transition-colors">
                                ביטול
                            </button>
                            <button type="submit" className="bg-brand-blue hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-sm">
                                שמור עובד
                            </button>
                        </div>
                    </form>
                )}

                <div className="flex-1 overflow-y-auto w-full -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 pb-8">
                        {loading ? (
                            <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-blue" />
                                <p className="font-medium">טוען נתוני עובדים...</p>
                            </div>
                        ) : filteredStaff.length === 0 ? (
                            <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <UserMinus className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                <p className="font-medium text-lg text-slate-600 mb-1">לא נמצאו עובדים</p>
                                <p className="text-sm">{searchQuery ? 'נסה לשנות את מילות החיפוש' : 'לחץ על "הוספת עובד" כדי להתחיל להרכיב את הצוות שלך.'}</p>
                            </div>
                        ) : filteredStaff.map((member) => {
                            const isEditing = editingId === member.id;

                            // Availability status calculation
                            let availStatusIcon = <span title="לא הגיש זמינות" className="w-3 h-3 rounded-full bg-slate-300 shrink-0 shadow-inner" />;
                            let availText = "לא הגיש זמינות";
                            const avail = getEmployeeAvailability(member.phone);
                            if (avail) {
                                if (avail.isPending) {
                                    availStatusIcon = <span title="ממתין להשלמת שיחה" className="w-3 h-3 rounded-full bg-amber-400 shrink-0 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.5)]" />;
                                    availText = "ממתין להשלמה";
                                } else if (avail.days.length === 0) {
                                    availStatusIcon = <span title="הגיש — אין ימים זמינים" className="w-3 h-3 rounded-full bg-rose-400 shrink-0 shadow-[0_0_8px_rgba(251,113,133,0.5)]" />;
                                    availText = "לא זמין השבוע";
                                } else {
                                    availStatusIcon = <span title="הגיש זמינות" className="w-3 h-3 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />;
                                    availText = "זמין לעבודה";
                                }
                            }

                            return (
                                <div key={member.id} className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${isEditing ? 'border-brand-blue shadow-md ring-1 ring-brand-blue/20' : 'border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200'}`}>
                                    {/* Card Header */}
                                    <div className="flex justify-between items-start p-2.5 border-b border-slate-50 bg-slate-50/50">
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-brand-blue/20 to-blue-500/10 text-brand-blue flex items-center justify-center font-black text-xs shadow-sm border border-white">
                                                    {member.name.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={e => setEditName(e.target.value)}
                                                            className="w-full font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-brand-blue focus:outline-none focus:border-transparent text-sm"
                                                            placeholder="שם העובד"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedEmployee(member)}
                                                            className="font-bold text-slate-800 text-sm hover:text-brand-blue transition-colors flex flex-col w-full text-ellipsis overflow-hidden whitespace-nowrap text-right"
                                                            title="לחץ לצפייה בזמינות"
                                                        >
                                                            {member.name}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {!isEditing && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium bg-white/50 px-2 py-1 rounded-md border border-slate-100 self-end">
                                                    {availStatusIcon}
                                                    <span className="truncate">{availText}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-2.5 space-y-2.5">
                                        {/* Phone */}
                                        <div>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 text-right">מספר נייד</div>
                                            {isEditing ? (
                                                <input
                                                    type="tel"
                                                    value={editPhone}
                                                    onChange={e => setEditPhone(e.target.value)}
                                                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-brand-blue focus:outline-none focus:border-transparent text-xs text-right"
                                                    dir="rtl"
                                                    placeholder="מספר טלפון"
                                                />
                                            ) : (
                                                <div className="text-slate-700 font-medium text-xs text-right" dir="ltr">{member.phone}</div>
                                            )}
                                        </div>

                                        {/* Skill Level */}
                                        <div>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 text-right">רמת מיומנות</div>
                                            {isEditing ? (
                                                <select
                                                    value={editSkillLevel}
                                                    onChange={e => setEditSkillLevel(e.target.value as SkillLevel)}
                                                    className={`w-full border rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-brand-blue focus:outline-none font-medium bg-white text-right ${SKILL_COLORS[editSkillLevel]}`}
                                                    dir="rtl"
                                                >
                                                    {(Object.entries(SKILL_LEVEL_LABELS) as [SkillLevel, string][]).map(([key, label]) => (
                                                        <option key={key} value={key} className="bg-white text-slate-800">{label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="text-right">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm ${SKILL_COLORS[member.skillLevel || 'standard']}`}>
                                                        {SKILL_LEVEL_LABELS[member.skillLevel || 'standard']}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Roles */}
                                        <div>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-right">תפקידים</div>
                                            {isEditing ? (
                                                <div className="flex flex-col gap-1.5 p-1.5 border border-slate-200 rounded-lg bg-slate-50/50">
                                                    <div className="flex flex-wrap gap-1 justify-end">
                                                        {editRoles.map((role, idx) => (
                                                            <span key={idx} className="bg-brand-blue text-white shadow-sm px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                                                                <button type="button" onClick={() => removeRole(idx, editRoles, setEditRoles)} className="hover:text-red-200 transition-colors bg-black/10 rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
                                                                {role}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="flex min-w-[80px] bg-white rounded-md border border-slate-200 overflow-hidden shadow-inner">
                                                        <select
                                                            value={editRoleInput}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                if (val) {
                                                                    if (!editRoles.includes(val)) setEditRoles([...editRoles, val]);
                                                                    setEditRoleInput('');
                                                                }
                                                            }}
                                                            className="w-full text-[10px] px-1.5 py-1 focus:outline-none bg-transparent text-right"
                                                            dir="rtl"
                                                        >
                                                            <option value="" disabled>בחר תפקיד...</option>
                                                            {COMMON_ROLES.filter(r => !editRoles.includes(r)).map(r => <option key={r} value={r}>{r}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-1 justify-end">
                                                    {(!member.roles || member.roles.length === 0) ? (
                                                        <span className="text-[10px] text-slate-400 italic">לא הוגדרו תפקידים</span>
                                                    ) : (
                                                        member.roles.map((r, i) => (
                                                            <span key={i} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[10px] font-bold shadow-sm whitespace-nowrap">
                                                                {r}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Footer / Actions */}
                                    <div className="bg-slate-50 border-t border-slate-100 p-2 text-right">
                                        <div className="flex items-center justify-start gap-1.5 w-full flex-row-reverse">
                                            {isEditing ? (
                                                <>
                                                    <button onClick={cancelEdit} className="flex-1 text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 py-1.5 rounded-lg transition-colors font-medium flex items-center justify-center gap-1 shadow-sm text-xs">
                                                        <X className="w-3 h-3" /> ביטול
                                                    </button>
                                                    <button onClick={() => saveEdit(member.id)} className="flex-1 text-white bg-emerald-500 hover:bg-emerald-600 py-1.5 rounded-lg transition-colors font-bold flex items-center justify-center gap-1 shadow-sm text-xs">
                                                        <Check className="w-3 h-3" /> שמור
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('האם אתה בטוח שברצונך למחוק את ' + member.name + '?')) {
                                                                removeStaffMember(member.id);
                                                            }
                                                        }}
                                                        className="text-slate-500 hover:text-rose-600 bg-white border border-slate-200 hover:border-rose-200 py-1.5 px-2 rounded-lg hover:bg-rose-50 transition-colors flex items-center justify-center shadow-sm"
                                                        title="מחיקת עובד"
                                                    >
                                                        <UserMinus className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => startEdit(member)}
                                                        className="flex-1 text-slate-700 hover:text-brand-blue bg-white border border-slate-200 hover:border-brand-blue/30 py-1.5 px-2 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center justify-center gap-1 shadow-sm text-xs"
                                                        title="עריכת עובד"
                                                    >
                                                        <Edit2 className="w-3 h-3" /> ערוך
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Availability Modal */}
            {
                selectedEmployee && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                        onClick={() => setSelectedEmployee(null)}
                    >
                        <div
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedEmployee(null)}
                                className="absolute top-4 left-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-12 h-12 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-lg">
                                    {selectedEmployee.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{selectedEmployee.name}</h3>
                                    <p className="text-sm text-slate-500">{selectedEmployee.phone}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-4">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <p className="text-sm font-semibold text-slate-700">זמינות לשבוע הנוכחי</p>
                            </div>

                            {(() => {
                                const avail = getEmployeeAvailability(selectedEmployee.phone);
                                if (avail === null) return (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                                        <p className="text-slate-500 text-sm">העובד טרם שלח זמינות לשבוע זה דרך הוואטסאפ.</p>
                                    </div>
                                );
                                if (avail.days.length === 0) return (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center flex flex-col gap-2">
                                        <p className="text-red-600 text-sm font-medium">העובד לא יכול לעבוד בכלל השבוע.</p>
                                        {avail.notes && (
                                            <p className="text-xs text-red-500 italic bg-red-100 p-2 rounded-lg text-right">&quot;{avail.notes}&quot;</p>
                                        )}
                                    </div>
                                );
                                return (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-wrap gap-2">
                                            {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map(day => {
                                                const isAvailable = avail.days.includes(day);
                                                return (
                                                    <span
                                                        key={day}
                                                        className={`px-3 py-2 rounded-xl text-sm font-bold border ${isAvailable
                                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                                            : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-50'
                                                            }`}
                                                    >
                                                        {day}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        {avail.notes && (
                                            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-right mt-1">
                                                <p className="text-xs font-bold text-amber-800 mb-1">הערות מהעובד:</p>
                                                <p className="text-sm text-amber-700 leading-relaxed italic">&quot;{avail.notes}&quot;</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            <div className="mt-6 bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
                                <p>🟢 הגיש זמינות | 🟡 ממתין | 🔴 לא זמין | ⚪ לא הגיש</p>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}

