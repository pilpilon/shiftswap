import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20" dir="rtl">
            <header className="bg-white border-b border-slate-200 py-6">
                <div className="container mx-auto px-4 max-w-4xl flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-brand-blue">מדיניות פרטיות</h1>
                    <Link to="/" className="text-slate-500 hover:text-brand-blue flex items-center gap-2 transition-colors">
                        חזרה ראשי <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 max-w-4xl mt-10">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6 leading-relaxed">
                    <p className="text-sm text-slate-500">עודכן לאחרונה: אפריל 2026</p>

                    <h2 className="text-xl font-bold">1. מבוא</h2>
                    <p>ShiftSwap AI ("החברה", "אנחנו") מפעילה פלטפורמה לניהול משמרות באמצעות בינה מלאכותית ו-WhatsApp. מדיניות פרטיות זו חלה בהתאם לחוק הגנת הפרטיות, התשמ"א-1981 ותקנותיו, ומסדירה את אופן האיסוף, העיבוד והשמירה של מידע אישי.</p>

                    <h2 className="text-xl font-bold">2. מידע שאנו אוספים</h2>
                    <p><strong>ממנהלים (לקוחות):</strong> שם מלא, כתובת דוא"ל, מספר טלפון, שם העסק, פרטי תשלום (מעובדים דרך Paddle ולא נשמרים אצלנו).</p>
                    <p><strong>מעובדים (נמעני שירות):</strong> שם, מספר טלפון WhatsApp, זמינות למשמרות, והודעות WhatsApp שנשלחות לבוט במסגרת ניהול המשמרות.</p>
                    <p><strong>מידע טכני:</strong> כתובת IP, סוג דפדפן, ומידע שימוש כללי.</p>

                    <h2 className="text-xl font-bold">3. מטרות העיבוד</h2>
                    <ul className="list-disc pr-6 space-y-1">
                        <li>הפעלת שירות ניהול המשמרות האוטומטי</li>
                        <li>עיבוד הודעות WhatsApp באמצעות בינה מלאכותית לצורך ניהול זמינות, החלפות וביטולים</li>
                        <li>שליחת תזכורות והתראות לעובדים</li>
                        <li>ניהול חשבון, תשלומים ותמיכה</li>
                        <li>שיפור השירות ותיקון תקלות</li>
                    </ul>

                    <h2 className="text-xl font-bold">4. עיבוד בינה מלאכותית (AI)</h2>
                    <p>הודעות WhatsApp שנשלחות לבוט מעובדות באמצעות מודל שפה של Google (Gemini) לצורך הבנת בקשות העובדים וביצוע פעולות ניהול משמרות. ההודעות נשלחות לשרתי Google לצורך עיבוד בזמן אמת. אנו לא משתמשים בהודעות אלו לצורך אימון מודלים.</p>

                    <h2 className="text-xl font-bold">5. שמירת מידע ומחיקה</h2>
                    <p>לוגי שיחות (הודעות WhatsApp) נשמרים למשך 20 יום בלבד ונמחקים אוטומטית לאחר מכן. מידע על עובדים (שם, טלפון, זמינות) נשמר כל עוד חשבון המנהל פעיל. פרטי חשבון מנהל נשמרים עד למחיקת החשבון.</p>

                    <h2 className="text-xl font-bold">6. צדדים שלישיים ומעבדי משנה</h2>
                    <p>אנו משתמשים בשירותי צד שלישי הבאים:</p>
                    <ul className="list-disc pr-6 space-y-1">
                        <li><strong>Google Firebase</strong> (אחסון מידע ואימות משתמשים) - שרתים באירופה/ארה"ב</li>
                        <li><strong>Google Gemini AI</strong> (עיבוד הודעות) - שרתי Google Cloud</li>
                        <li><strong>Paddle</strong> (עיבוד תשלומים) - בריטניה</li>
                        <li><strong>Vercel</strong> (אירוח אתר) - ארה"ב</li>
                        <li><strong>Render</strong> (אירוח שרת) - ארה"ב</li>
                    </ul>

                    <h2 className="text-xl font-bold">7. העברת מידע מחוץ לישראל</h2>
                    <p>מידע עשוי להיות מעובד ומאוחסן בשרתים מחוץ לישראל (ארה"ב, אירופה). העברה זו מתבצעת בהתאם לסעיף 36 לתקנות הגנת הפרטיות (העברת מידע אל מאגרי מידע מחוץ לגבולות המדינה), תשס"א-2001, כאשר מעבדי המשנה עומדים ברמת הגנה נאותה.</p>

                    <h2 className="text-xl font-bold">8. זכויות נושאי מידע</h2>
                    <p>בהתאם לחוק הגנת הפרטיות, התשמ"א-1981, עומדות לך הזכויות הבאות:</p>
                    <ul className="list-disc pr-6 space-y-1">
                        <li><strong>זכות עיון:</strong> הזכות לעיין במידע שנשמר לגביך</li>
                        <li><strong>זכות תיקון:</strong> הזכות לבקש תיקון מידע שגוי</li>
                        <li><strong>זכות מחיקה:</strong> הזכות לבקש מחיקת המידע שלך</li>
                    </ul>
                    <p>לבקשות אלו, פנה/י אלינו בכתובת: privacy@shiftswap.ai</p>

                    <h2 className="text-xl font-bold">9. אבטחת מידע</h2>
                    <p>אנו מיישמים אמצעי אבטחה טכנולוגיים וארגוניים, לרבות: הצפנת תקשורת (SSL/TLS), אימות זהות רב-שלבי, הגבלת גישה לפי תפקיד, וגיבוי נתונים.</p>

                    <h2 className="text-xl font-bold">10. חובות המנהל כלפי עובדיו</h2>
                    <p>כמנהל המשתמש בשירות, אתה אחראי ליידע את העובדים שלך כי הודעות WhatsApp שנשלחות לבוט מעובדות באמצעות AI, ולקבל את הסכמתם לכך. מומלץ להוסיף הודעה ברורה בזמן הצירוף הראשוני של העובד.</p>

                    <h2 className="text-xl font-bold">11. שינויים במדיניות</h2>
                    <p>אנו רשאים לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באתר ו/או ישלחו בהודעה.</p>

                    <h2 className="text-xl font-bold">12. יצירת קשר</h2>
                    <p>לשאלות בנושא פרטיות: privacy@shiftswap.ai</p>
                    <p>דין חל: דיני מדינת ישראל. סמכות שיפוט: בתי המשפט המוסמכים בתל אביב-יפו.</p>
                </div>
            </main>
        </div>
    );
}
