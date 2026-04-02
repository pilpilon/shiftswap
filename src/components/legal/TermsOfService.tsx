import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20" dir="rtl">
            <header className="bg-white border-b border-slate-200 py-6">
                <div className="container mx-auto px-4 max-w-4xl flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-brand-blue">תנאי שימוש</h1>
                    <Link to="/" className="text-slate-500 hover:text-brand-blue flex items-center gap-2 transition-colors">
                        חזרה ראשי <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 max-w-4xl mt-10">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6 leading-relaxed">
                    <p className="text-sm text-slate-500">עודכן לאחרונה: אפריל 2026</p>

                    <h2 className="text-xl font-bold">1. קבלת התנאים</h2>
                    <p>בעת שימוש במערכת ShiftSwap AI ("השירות"), אתה מסכים לתנאי שימוש אלו במלואם. אם אינך מסכים לתנאים, אנא הימנע משימוש בשירות.</p>

                    <h2 className="text-xl font-bold">2. תיאור השירות</h2>
                    <p>ShiftSwap AI היא פלטפורמה לניהול משמרות עובדים באמצעות בינה מלאכותית וממשק WhatsApp. השירות מאפשר למנהלים לבנות סידורי עבודה, לשלוח אותם לעובדים, ולנהל שינויים, ביטולים והחלפות באופן אוטומטי.</p>

                    <h2 className="text-xl font-bold">3. שימוש בבינה מלאכותית</h2>
                    <p>השירות משתמש בבינה מלאכותית (Google Gemini) לעיבוד הודעות עובדים וניהול משא ומתן על משמרות. תוצאות ה-AI הן המלצות ואין להסתמך עליהן כתחליף לשיקול דעת ניהולי. האחריות הסופית על החלטות כוח אדם נותרת אצל המנהל.</p>

                    <h2 className="text-xl font-bold">4. אינטגרציית WhatsApp וצדדים שלישיים</h2>
                    <p>השירות מתממשק עם WhatsApp לצורך תקשורת עם עובדים. החברה אינה מסונפת לחברת Meta ואינה אחראית לשינויים, הגבלות או חסימות מצד WhatsApp/Meta. השימוש ב-WhatsApp כפוף לתנאי השימוש של Meta. למנהל מומלץ לשקול שימוש ב-WhatsApp Business API הרשמי לשימוש עסקי בהיקף גדול.</p>

                    <h2 className="text-xl font-bold">5. חובות המשתמש</h2>
                    <ul className="list-disc pr-6 space-y-1">
                        <li>ליידע את העובדים כי תקשורת WhatsApp מעובדת על ידי מערכת AI אוטומטית</li>
                        <li>לקבל הסכמה מעובדים לעיבוד המידע שלהם, בהתאם לחוקי הגנת הפרטיות</li>
                        <li>לא להשתמש בשירות למטרות לא חוקיות או בניגוד לדיני עבודה</li>
                        <li>לוודא שמידע העובדים מדויק ומעודכן</li>
                        <li>לציית לכל דיני העבודה הרלוונטיים לרבות חוק שעות עבודה ומנוחה</li>
                    </ul>

                    <h2 className="text-xl font-bold">6. תשלומים ומנויים</h2>
                    <p>השירות מוצע במודל מנוי חודשי. חיובים מעובדים באמצעות Paddle. מחיר המנוי הנוכחי הוא 120 ש"ח לחודש לסניף. תקופת ניסיון של 14 ימים ניתנת ללא חיוב. ניתן לבטל את המנוי בכל עת; הביטול ייכנס לתוקף בסוף מחזור החיוב הנוכחי.</p>

                    <h2 className="text-xl font-bold">7. קניין רוחני</h2>
                    <p>כל הזכויות בשירות, כולל קוד, עיצוב, אלגוריתמים ותוכן, שייכות ל-ShiftSwap AI. המידע שתזין (רשימות עובדים, סידורי עבודה) נותר בבעלותך.</p>

                    <h2 className="text-xl font-bold">8. הגבלת אחריות</h2>
                    <p>השירות מסופק "כמות שהוא" (AS IS). החברה אינה מתחייבת לזמינות רציפה ולא תישא באחריות לנזק עקיף, מיוחד, אגבי או תוצאתי כתוצאה מהשימוש בשירות, לרבות אובדן הכנסה, נזק עקב אי-איוש משמרת, או חסימת חשבון WhatsApp. סך האחריות המרבי של החברה מוגבל לסכום ששולם על ידיך בשלושת החודשים שקדמו לאירוע.</p>

                    <h2 className="text-xl font-bold">9. ביטול והפסקת שירות</h2>
                    <p>החברה רשאית להפסיק את השירות או לסיים חשבון משתמש בהתראה סבירה. במקרה של הפרת תנאים, ייתכן ביטול מיידי. בעת ביטול, מידע העובדים שלך יימחק תוך 30 יום.</p>

                    <h2 className="text-xl font-bold">10. שינויים בתנאים</h2>
                    <p>החברה רשאית לעדכן תנאים אלו. שינויים מהותיים יפורסמו באתר לפחות 14 ימים מראש. המשך השימוש לאחר הפרסום מהווה הסכמה לתנאים המעודכנים.</p>

                    <h2 className="text-xl font-bold">11. דין חל וסמכות שיפוט</h2>
                    <p>על תנאי שימוש אלו יחולו דיני מדינת ישראל בלבד. סמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים בתל אביב-יפו.</p>

                    <h2 className="text-xl font-bold">12. יצירת קשר</h2>
                    <p>לשאלות: legal@shiftswap.ai</p>
                </div>
            </main>
        </div>
    );
}
