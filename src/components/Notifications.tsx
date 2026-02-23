import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle2, AlertCircle } from 'lucide-react';

export interface Notification {
    id: string;
    title: string;
    message: string;
    time: string;
    type: 'success' | 'alert' | 'info';
    read: boolean;
}

export const mockNotifications: Notification[] = [
    {
        id: '1',
        title: 'משמרת אוישה בהצלחה',
        message: 'יוני אישר את משמרת הערב ביום ראשון. הבוט סגר את המשא ומתן.',
        time: 'לפני 5 דקות',
        type: 'success',
        read: false,
    },
    {
        id: '2',
        title: 'התראה מחוסר באיש צוות',
        message: 'בעוד 4 שעות מתחילה משמרת ערב ויש חוסר של עובד אחד.',
        time: 'לפני שעה',
        type: 'alert',
        read: false,
    }
];

export function NotificationsTray({
    isOpen,
    onClose,
    notifications,
    onMarkAllRead
}: {
    isOpen: boolean,
    onClose: () => void,
    notifications: Notification[],
    onMarkAllRead: () => void
}) {
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-16 left-4 md:left-8 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                    >
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-800">התראות</h3>
                                {unreadCount > 0 && (
                                    <span className="bg-brand-blue text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={onMarkAllRead} className="text-xs text-brand-blue hover:text-brand-blue/80 font-medium transition-colors">
                                    סמן הכל כנקרא
                                </button>
                                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto w-full">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                    <p>אין התראות חדשות</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 w-full text-right">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 transition-colors hover:bg-slate-50 ${!notification.read ? 'bg-blue-50/30' : ''}`}
                                        >
                                            <div className="flex gap-3">
                                                <div className="shrink-0 mt-1">
                                                    {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                                    {notification.type === 'alert' && <AlertCircle className="w-5 h-5 text-red-500" />}
                                                    {notification.type === 'info' && <Bell className="w-5 h-5 text-brand-blue" />}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-medium ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-2 font-medium">
                                                        {notification.time}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
