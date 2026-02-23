import { useAuth } from '../../../src/context/AuthContext';
import { useNegotiations } from '../../../src/hooks/useNegotiations';
import { Zap, MessageSquareText, Loader2 } from 'lucide-react';

export default function NegotiationsView() {
    const { user } = useAuth();
    const { logs, loading, error } = useNegotiations(user?.businessId);

    const formatTimestamp = (isoString?: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="bg-blue-50 border border-blue-100 text-brand-blue p-4 rounded-xl flex items-start gap-4">
                <div className="bg-white p-2 rounded-full shrink-0 shadow-sm">
                    <Zap className="w-5 h-5 text-brand-gold fill-brand-gold" />
                </div>
                <div>
                    <h4 className="font-bold">פיד משא ומתן חי</h4>
                    <p className="text-sm mt-1 opacity-90">הודעות מערכת ותעבורת תיווך יוצגו כאן בזמן אמת, היישר מהוואטסאפ.</p>
                </div>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">{error}</div>}

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 flex justify-between items-center">
                    <span>ערוץ תקשורת פעיל (AI)</span>
                    <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> מחובר למסד נתונים
                    </span>
                </div>

                <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-[url('https://ik.imagekit.io/yvxgv/whatsapp-bg.png')] bg-cover bg-opacity-10 bg-center">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center text-slate-500 bg-white/80 p-6 rounded-xl backdrop-blur-sm mt-10">
                            עדיין אין היסטוריית שיחות במערכת.
                        </div>
                    ) : (
                        logs.map((log) => {
                            if (log.sender === 'system') {
                                return (
                                    <div key={log.id} className="flex justify-center my-4">
                                        <span className="bg-slate-800/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">
                                            {log.message} - {formatTimestamp(log.timestamp)}
                                        </span>
                                    </div>
                                );
                            }

                            const isIncoming = log.sender === 'employee';

                            return (
                                <div key={log.id} className={`flex ${isIncoming ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`
                                        ${isIncoming ? 'bg-white border-slate-200 rounded-tr-sm' : 'bg-[#E7FFDB] border-[#d4f5c5] rounded-tl-sm'}
                                        border rounded-2xl p-4 max-w-[85%] shadow-sm relative min-w-[120px]
                                    `}>
                                        {isIncoming && <div className="text-xs font-bold text-[#25D366] mb-1">{log.employeePhone}</div>}
                                        {!isIncoming && <div className="text-xs font-bold text-slate-500 mb-1">ShiftSwap AI</div>}
                                        <p className="text-slate-800 whitespace-pre-wrap">{log.message}</p>
                                        <span className={`text-[10px] text-slate-400 absolute bottom-1 ${isIncoming ? 'left-2' : 'right-2'}`}>
                                            {formatTimestamp(log.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-white flex gap-2">
                    <input type="text" disabled placeholder="הרובוט מנהל את השיחות האלו..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 cursor-not-allowed text-sm text-slate-500" />
                    <button disabled className="bg-brand-blue/50 text-white px-4 py-2 rounded-xl cursor-not-allowed">
                        <MessageSquareText className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
