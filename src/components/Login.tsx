import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CalendarClock, Mail, Lock, Building2, User as UserIcon, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
    const { login, register, loginWithGoogle } = useAuth();
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

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-slate-500">או באמצעות</span>
                            </div>
                        </div>

                        <button
                            onClick={async () => {
                                setLoading(true);
                                try {
                                    await loginWithGoogle();
                                } catch (err: any) {
                                    console.error(err);
                                    setError(err.message || 'שגיאה בהתחברות עם גוגל');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                            className="w-full bg-white hover:bg-slate-50 text-slate-700 font-medium py-3 rounded-xl border border-slate-200 shadow-sm transition-all mt-6 flex items-center justify-center gap-3"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                <path d="M1 1h22v22H1z" fill="none" />
                            </svg>
                            התחברות עם Google
                        </button>
                    </div>

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
