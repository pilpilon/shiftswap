import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useSwaps } from '../../hooks/useSwaps';
import { useAuth } from '../../context/AuthContext';

export default function SwapView() {
    const { user } = useAuth();
    const { swaps: swapRequests, loading } = useSwaps(user?.businessId);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <p className="text-slate-500 font-medium">טוען בקשות החלפה...</p>
            </div>
        );
    }

    if (swapRequests.length === 0) {
        return (
            <div className="space-y-6 pb-24 md:pb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">ניהול החלפות <span className="text-brand-gold">AI</span></h2>
                        <p className="text-sm text-slate-500 mt-1">
                            כאן יופיעו משמרות שהבוט מנסה לאייש אוטומטית.
                        </p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 mb-1">הכל שקט ויציב</h3>
                    <p className="text-sm text-slate-500">אין כרגע בקשות להחלפת משמרות.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-24 md:pb-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">ניהול החלפות <span className="text-brand-gold">AI</span></h2>
                    <p className="text-sm text-slate-500 mt-1">
                        כאן יופיעו משמרות שהבוט מנסה לאייש אוטומטית.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                    {swapRequests.map((req) => (
                        <motion.div
                            key={req.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all ${req.status === 'pending' ? 'border-amber-200' : 'border-emerald-200'
                                }`}
                        >
                            <div className={`p-4 ${req.status === 'pending' ? 'bg-amber-50' : 'bg-emerald-50'} border-b ${req.status === 'pending' ? 'border-amber-100' : 'border-emerald-100'} flex justify-between items-center`}>
                                <div className="flex items-center gap-2">
                                    {req.status === 'pending' ? (
                                        <div className="bg-amber-100 text-amber-700 p-1.5 rounded-lg">
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-100 text-emerald-700 p-1.5 rounded-lg">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-slate-800">{req.date}</h3>
                                        <p className="text-xs font-semibold text-slate-600">{req.shiftTitle}</p>
                                    </div>
                                </div>
                                {req.urgency === 'high' && req.status === 'pending' && (
                                    <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                                        דחוף
                                    </span>
                                )}
                            </div>

                            <div className="p-5 space-y-4">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">תפקיד דרוש</p>
                                    <p className="text-sm font-bold text-slate-800 bg-slate-50 inline-block px-3 py-1 rounded-lg border border-slate-100">{req.role}</p>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                                            {req.originalEmployee.charAt(0)}
                                        </div>
                                        <div className="text-xs">
                                            <span className="block text-slate-500">ביטל עקב: {req.reason.substring(0, 15)}</span>
                                            <span className="font-bold text-slate-800 line-through decoration-rose-400">{req.originalEmployee}</span>
                                        </div>
                                    </div>

                                    {req.status === 'covered' && req.coveredBy && (
                                        <div className="flex items-center gap-2 text-left">
                                            <div className="text-xs">
                                                <span className="block text-slate-500">מחליף/ה:</span>
                                                <span className="font-bold text-emerald-600">{req.coveredBy}</span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                                {req.coveredBy.charAt(0)}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {req.status === 'pending' && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-xs text-amber-600 font-medium mb-2 flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            הבוט מנהל כעת משא ומתן מול 3 עובדים פוטנציאליים...
                                        </p>
                                        <button className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                                            שיבוץ ידני
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
