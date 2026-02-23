import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CalendarClock, Mail, Lock, Building2, User as UserIcon, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [businessName, setBusinessName] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                if (!name || !businessName) throw new Error("אנא מלא את כל השדות");
                await register(email, password, name, businessName);
            }
            // Navigate is handled automatically by App.tsx observing isAuthenticated
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'שגיאה בהתחברות. אנא נסה שוב.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans" dir="rtl">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <button
                        onClick={() => navigate('/')}
                        className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-slate-600 mb-8 transition-colors"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="bg-brand-blue text-brand-gold p-2 rounded-xl">
                            <CalendarClock className="w-8 h-8" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900">
                        ShiftSwap<span className="text-brand-blue">.ai</span>
                    </h1>
                    <p className="text-slate-500 mt-2">ברוכים הבאים למערכת הניהול החכמה</p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100"
                >
                    <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
                        {isLogin ? 'התחברות לחשבון' : 'יצירת חשבון חדש'}
                    </h2>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">שם מלא</label>
                                    <div className="relative">
                                        <UserIcon className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                            placeholder="ישראל ישראלי"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">שם העסק</label>
                                    <div className="relative">
                                        <Building2 className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            required
                                            value={businessName}
                                            onChange={(e) => setBusinessName(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                            placeholder="מסעדת שמש"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">אימייל</label>
                            <div className="relative">
                                <Mail className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all text-left"
                                    dir="ltr"
                                    placeholder="admin@shiftswap.ai"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">סיסמה</label>
                            <div className="relative">
                                <Lock className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all text-left"
                                    dir="ltr"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white font-medium py-3 rounded-xl shadow-lg shadow-brand-blue/25 transition-all mt-6 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'כניסה למערכת' : 'הרשמה למערכת')}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-brand-blue hover:text-blue-700 text-sm font-medium"
                        >
                            {isLogin ? 'אין לך משתמש? לחץ כאן להרשמה' : 'כבר יש לך חשבון? התחבר כאן'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
