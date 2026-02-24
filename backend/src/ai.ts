import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({});

import { getBusinessRules, getOpenShifts, saveNegotiationLog, saveAvailability, getCurrentWeekKey } from './firebase';

// Hebrew day names for availability parsing
const HEBREW_DAYS: Record<string, string> = {
    'ראשון': 'ראשון', 'שני': 'שני', 'שלישי': 'שלישי',
    'רביעי': 'רביעי', 'חמישי': 'חמישי', 'שישי': 'שישי', 'שבת': 'שבת',
};

/** Returns an array of Hebrew day names found in the text */
function extractAvailabilityDays(text: string): string[] {
    return Object.keys(HEBREW_DAYS).filter(day => text.includes(day));
}

/** Returns true if the message appears to be an availability submission */
function isAvailabilityMessage(text: string): boolean {
    const hasAvailabilityKeyword = ['פנוי', 'פנויה', 'זמינות', 'יכול לעבוד', 'יכולה לעבוד'].some(kw => text.includes(kw));
    const hasDays = extractAvailabilityDays(text).length > 0;
    return hasAvailabilityKeyword && hasDays;
}

export async function processIncomingMessage(businessId: string, remoteJid: string, incomingText: string): Promise<string> {

    // Log the incoming message from the employee
    await saveNegotiationLog(businessId, remoteJid, incomingText, 'employee');

    // ── Intent: availability submission ──────────────────────────────────────
    if (isAvailabilityMessage(incomingText)) {
        const days = extractAvailabilityDays(incomingText);
        const phone = remoteJid.split('@')[0]; // normalized phone is the JID prefix
        const weekKey = getCurrentWeekKey();

        try {
            await saveAvailability(businessId, phone, weekKey, days);
            const daysStr = days.join(', ');
            const reply = `תודה! קיבלתי את הזמינות שלך לשבוע הבא 📅\nימים פנויים: ${daysStr}\nאם תרצה לעדכן — פשוט שלח שוב.`;
            await saveNegotiationLog(businessId, remoteJid, reply, 'ai');
            return reply;
        } catch (err) {
            console.error('[AI] Failed to save availability:', err);
        }
    }

    // ── Intent: Schedule Query ───────────────────────────────────────────────
    const scheduleKeywords = ['סידור', 'לו"ז', 'מתי אני עובד', 'משמרות של', 'שבוע הבא'];
    const isScheduleQuery = scheduleKeywords.some(kw => incomingText.includes(kw)) && incomingText.includes('?');

    if (isScheduleQuery) {
        const phone = remoteJid.split('@')[0];
        const weekKey = getCurrentWeekKey(); // Query current week
        try {
            const { getPublishedSchedule } = await import('./firebase');
            const shifts = await getPublishedSchedule(businessId, weekKey, phone);

            let reply: string;
            if (!shifts || shifts.length === 0) {
                reply = 'לא מצאתי משמרות שפורסמו עבורך לשבוע זה.';
            } else {
                const shiftLines = shifts.map(s => `- ${s.date}: ${s.role} (${s.hours})`).join('\n');
                reply = `הסידור שלך לשבוע הקרוב:\n${shiftLines}`;
            }

            await saveNegotiationLog(businessId, remoteJid, reply, 'ai');
            return reply;
        } catch (err) {
            console.error('[AI] Failed to fetch schedule:', err);
        }
    }

    // ── Default: conversational AI ────────────────────────────────────────────
    const rulesConfig = await getBusinessRules(businessId);
    const openShifts = await getOpenShifts(businessId);

    const shiftsStr = openShifts.length > 0
        ? openShifts.map(s => `- ${s.date} (${s.role})`).join('\n')
        : 'No open shifts right now.';

    const systemInstruction = `
        You are ShiftSwap AI, an intelligent agent managing employee shifts for a restaurant.
        You communicate with employees in Hebrew via WhatsApp.
        Your goal is to find coverage for open shifts, negotiate based on rules, and assist employees.
        
        Current Rules:
        ${rulesConfig}
        
        Open Shifts:
        ${shiftsStr}
        
        CRITICAL: If an employee explicitly states they cannot work an upcoming shift (e.g. they are sick, have an exam, etc.), you MUST use the 'registerShiftCancellation' tool. Do NOT just say "feel better", you must register it.
        
        Respond concisely, professionally, and naturally in Hebrew.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: incomingText,
            config: {
                systemInstruction,
                temperature: 0.7,
                tools: [{
                    functionDeclarations: [
                        {
                            name: 'registerShiftCancellation',
                            description: 'Registers that an employee cannot attend their upcoming shift. Use this WHEN the user clearly states they are cancelling or cannot attend a shift.',
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    reason: {
                                        type: Type.STRING,
                                        description: 'The reason the employee is cancelling (e.g., sick, exam, personal).'
                                    },
                                    date: {
                                        type: Type.STRING,
                                        description: 'The date of the shift they are cancelling, in DD/MM/YYYY format if possible, or relative days like "מחר".'
                                    }
                                },
                                required: ['reason', 'date']
                            }
                        },
                        {
                            name: 'acceptShiftSwap',
                            description: 'Registers that an employee has agreed to take over a shift that was offered to them. Use this when they reply yes/sure to an offer.',
                            parameters: {
                                type: Type.OBJECT,
                                properties: {},
                                required: []
                            }
                        }
                    ]
                }]
            }
        });

        let botReply = '';

        // Handle function calls if the AI decided to invoke one
        if (response.functionCalls && response.functionCalls.length > 0) {
            const call = response.functionCalls[0];
            const phone = remoteJid.split('@')[0];
            const { registerSwapRequest, assignSwap } = await import('./firebase');

            if (call.name === 'registerShiftCancellation') {
                const args = call.args as { reason: string, date: string };
                console.log(`[AI] Shift cancellation detected: reason=${args.reason}, date=${args.date}`);
                await registerSwapRequest(businessId, phone, args.date, args.reason);
                botReply = `הבנתי, רשמתי שאת/ה לא יכול/ה להגיע ב-${args.date} בגלל: ${args.reason}. אני מחפש מחליף כרגע ואעדכן את המנהל. תרגיש/י טוב!`;
            } else if (call.name === 'acceptShiftSwap') {
                console.log(`[AI] Swap acceptance detected from ${phone}`);
                const assignResult = await assignSwap(businessId, phone);
                if (assignResult.success) {
                    botReply = `מעולה! שיבצתי אותך למשמרת ב-${assignResult.date}. תודה רבה על העזרה! 🙏`;
                } else if (assignResult.error === 'self_replacement') {
                    botReply = `לא ניתן להחליף את עצמך. אני ממשיך לחפש מחליף מתאים.`;
                } else {
                    botReply = `תודה על הנכונות, אבל נראה שהמשמרת כבר אוישה על ידי מישהו אחר או שאין בקשות פתוחות כרגע.`;
                }
            }
        } else {
            botReply = response.text || 'סליחה, לא הבנתי. תוכל לחזור שנית?';
        }

        await saveNegotiationLog(businessId, remoteJid, botReply, 'ai');
        return botReply;
    } catch (error) {
        console.error('AI Generation Error: ', error);
        return 'מצטער, חלה שגיאה במערכת כרגע.';
    }
}
