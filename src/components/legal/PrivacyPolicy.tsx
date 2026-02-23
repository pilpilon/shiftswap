import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            <header className="bg-white border-b border-slate-200 py-6">
                <div className="container mx-auto px-4 max-w-4xl flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-brand-blue">מדיניות פרטיות</h1>
                    <Link to="/" className="text-slate-500 hover:text-brand-blue flex items-center gap-2 transition-colors">
                        חזרה ראשי <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 max-w-4xl mt-10">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
                    <p className="text-sm text-slate-500">עודכן לאחרונה: פברואר 2026</p>

                    <h2 className="text-xl font-bold">1. מבוא</h2>
                    <p>אנו ב-ShiftSwap AI מחויבים להגן על הפרטיות שלך. מדיניות פרטיות זו מתארת כיצד אנו אוספים, משתמשים ומוסרים את המידע שלך כאשר אתה משתמש בשירותים שלנו.</p>

                    <h2 className="text-xl font-bold">2. מידע שאנו אוספים</h2>
                    <p>אנו עשויים לאסוף מידע שאתה מספק לנו ישירות, כגון שמך, מספר הטלפון שלך (לרבות מספרי וואטסאפ), וכתובת דוא"ל. אנו לא שומרים את תוכן ההודעות הפרטיות של העובדים מעבר לדרוש לצורך עיבוד משמרות.</p>

                    <h2 className="text-xl font-bold">3. שימוש במידע</h2>
                    <p>המידע נאסף לצורך הפעלת בוט הוואטסאפ, ניהול משמרות, שיפור השירות, ויצירת קשר עמך בנושאי תמיכה מנהלתית.</p>

                    <h2 className="text-xl font-bold">4. אבטחת מידע</h2>
                    <p>אנו מיישמים אמצעי אבטחה טכנולוגיים מחמירים כדי להגן על המידע שלך מפני גישה או שימוש בלתי מורשים.</p>

                    <h2 className="text-xl font-bold">5. יצירת קשר</h2>
                    <p>בכל שאלה בנושא פרטיות, ניתן לפנות אלינו בכתובת: legal@shiftswap.ai</p>
                </div>
            </main>
        </div>
    );
}
