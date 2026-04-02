import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RefundPolicy() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20" dir="rtl">
            <header className="bg-white border-b border-slate-200 py-6">
                <div className="container mx-auto px-4 max-w-4xl flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-brand-blue">מדיניות ביטולים והחזרים</h1>
                    <Link to="/" className="text-slate-500 hover:text-brand-blue flex items-center gap-2 transition-colors">
                        חזרה ראשי <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 max-w-4xl mt-10">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6 leading-relaxed">
                    <p className="text-sm text-slate-500">עודכן לאחרונה: אפריל 2026</p>

                    <h2 className="text-xl font-bold">1. תקופת ניסיון (Trial)</h2>
                    <p>כל לקוח חדש זכאי ל-14 ימי ניסיון ללא חיוב. במהלך תקופה זו ניתן לבטל בכל עת ללא חיוב כלל. אם לא בוטל, המנוי יחודש אוטומטית בתשלום.</p>

                    <h2 className="text-xl font-bold">2. זכות ביטול עסקת מכר מרחוק</h2>
                    <p>בהתאם לחוק הגנת הצרכן, התשמ"א-1981 (סעיף 14ג), לצרכן הזכות לבטל עסקת מכר מרחוק תוך 14 ימים מיום ביצוע העסקה או מיום קבלת מסמך הגילוי, לפי המאוחר. ביטול במסגרת זכות זו ייעשה בכתב (דוא"ל) ויזכה בהחזר מלא, בניכוי דמי ביטול בסך 5% ממחיר העסקה או 100 ש"ח, הנמוך מביניהם.</p>

                    <h2 className="text-xl font-bold">3. ביטול מנוי לאחר תקופת הביטול</h2>
                    <p>ניתן לבטל את המנוי בכל עת דרך פורטל ניהול המנוי או בפנייה ל-billing@shiftswap.ai. הביטול ייכנס לתוקף בסוף מחזור החיוב הנוכחי ולא יינתן החזר יחסי על התקופה שנותרה.</p>

                    <h2 className="text-xl font-bold">4. מקרים חריגים להחזר</h2>
                    <p>החזר כספי מלא יינתן במקרים הבאים:</p>
                    <ul className="list-disc pr-6 space-y-1">
                        <li>טעות חיוב מצד המערכת (חיוב כפול, חיוב לאחר ביטול)</li>
                        <li>תקלה טכנית מהותית שמנעה שימוש בשירות למשך 7 ימים רצופים ומעלה</li>
                        <li>אי-עמידה של השירות בתנאים המפורטים בתיאור השירות</li>
                    </ul>

                    <h2 className="text-xl font-bold">5. אופן הגשת בקשת ביטול/החזר</h2>
                    <p>יש לפנות בדוא"ל ל-billing@shiftswap.ai עם הפרטים הבאים: שם מלא, כתובת דוא"ל הרשומה, ותיאור הסיבה. נענה תוך 5 ימי עסקים.</p>

                    <h2 className="text-xl font-bold">6. ספק התשלומים</h2>
                    <p>החיובים מעובדים באמצעות Paddle (paddle.com). במקרה של מחלוקת על חיוב, ניתן לפנות גם ישירות ל-Paddle.</p>
                </div>
            </main>
        </div>
    );
}
