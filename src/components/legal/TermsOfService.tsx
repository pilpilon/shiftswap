import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            <header className="bg-white border-b border-slate-200 py-6">
                <div className="container mx-auto px-4 max-w-4xl flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-brand-blue">תנאי שימוש</h1>
                    <Link to="/" className="text-slate-500 hover:text-brand-blue flex items-center gap-2 transition-colors">
                        חזרה ראשי <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 max-w-4xl mt-10">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
                    <p className="text-sm text-slate-500">עודכן לאחרונה: פברואר 2026</p>

                    <h2 className="text-xl font-bold">1. קבלת התנאים</h2>
                    <p>בעת שימוש במערכת ShiftSwap AI, אתה מסכים לתקנון זה מול החברה במלואו.</p>

                    <h2 className="text-xl font-bold">2. תיאור השירות</h2>
                    <p>מערכת לניהול משמרות מבוססת בינה מלאכותית ווואטסאפ המיועדת לעסקים. השירות מסופק "כמות שהוא" (AS IS).</p>

                    <h2 className="text-xl font-bold">3. אחריות ושימוש גורם שלישי (WhatsApp)</h2>
                    <p>המערכת מבצעת אינטגרציה לפלטפורמות צד-שלישי. החברה אינה אחראית לחסימות בחשבונות צד ג׳ הנובעות עקב שימוש בלתי הולם או הפרה של מדיניות חברת Meta.</p>

                    <h2 className="text-xl font-bold">4. תשלומים ומנויים</h2>
                    <p>המערכת פועלת במודל של מינוי חודשי. חיובים מעובדים באמצעות ספק תשלומים מורשה (Paddle).</p>

                    <h2 className="text-xl font-bold">5. הגבלת אחריות</h2>
                    <p>בשום מקרה לא נהיה אחראים לנזק עקיף, מיוחד, אגבי או תוצאתי כתוצאה מהשימוש או מחוסר היכולת להשתמש במערכת.</p>
                </div>
            </main>
        </div>
    );
}
