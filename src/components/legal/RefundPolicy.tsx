import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RefundPolicy() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            <header className="bg-white border-b border-slate-200 py-6">
                <div className="container mx-auto px-4 max-w-4xl flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-brand-blue">מדיניות ביטולים והחזרים</h1>
                    <Link to="/" className="text-slate-500 hover:text-brand-blue flex items-center gap-2 transition-colors">
                        חזרה ראשי <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 max-w-4xl mt-10">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
                    <p className="text-sm text-slate-500">עודכן לאחרונה: פברואר 2026</p>

                    <h2 className="text-xl font-bold">1. ביטול מנוי</h2>
                    <p>באפשרותך לבטל את המנוי בכל עת דרך אזור הניהול האישי או באמצעות פנייה לשירות הלקוחות. הביטול ייכנס לתוקף בסוף מחזור החיוב הנוכחי.</p>

                    <h2 className="text-xl font-bold">2. מדיניות החזרים</h2>
                    <p>מאחר ומדובר בשירות דיגיטלי מסוג SaaS המחויב על בסיס חודשי, ככלל איננו מספקים החזרים כספיים על חודשים שכבר שולמו, למעט מקרים בהם חלה טעות חיוב מצדנו או במקרי קיצון הנבחנים לגופם.</p>

                    <h2 className="text-xl font-bold">3. תקופת היכרות (Trial)</h2>
                    <p>אם נרשמת למערכת במסגרת תקופת התנסות חינמית, לא תחויב כל עוד תבטל לפני תום תקופת הניסיון.</p>

                    <h2 className="text-xl font-bold">4. יצירת קשר לביטולים</h2>
                    <p>לכל בקשת ביטול חריגה או שאלה לגבי חיובים, יש לפנות לדוא"ל: billing@shiftswap.ai או לספק התשלומים שממנו בוצע החיוב (Paddle.com).</p>
                </div>
            </main>
        </div>
    );
}
