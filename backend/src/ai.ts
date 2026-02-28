import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({});

import { getBusinessRules, getOpenShifts, saveNegotiationLog, saveAvailability, getCurrentWeekKey, resolveLidToPhone } from './firebase';

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
    const hasAvailabilityKeyword = [
        'פנוי', 'פנויה', 'זמינות',
        'יכול לעבוד', 'יכולה לעבוד',
        'יכול', 'יכולה',
        'תרשום', 'רשום', 'רשמי',
        'אפשר', 'לעבוד',
    ].some(kw => text.includes(kw));
    const days = extractAvailabilityDays(text);
    // Accept if: has keyword + at least 1 day, OR has 2+ day names (strong signal on its own)
    return (hasAvailabilityKeyword && days.length > 0) || days.length >= 2;
}

export async function processIncomingMessage(
    businessId: string,
    remoteJid: string,
    incomingText: string,
    senderName?: string   // WhatsApp pushName — used to resolve @lid to real phone
): Promise<string> {

    // Log the incoming message from the employee
    await saveNegotiationLog(businessId, remoteJid, incomingText, 'employee');

    const rulesConfig = await getBusinessRules(businessId);
    const openShifts = await getOpenShifts(businessId);

    const shiftsStr = openShifts.length > 0
        ? openShifts.map(s => `- ${s.date} (${s.role})`).join('\n')
        : 'No open shifts right now.';

    const systemInstruction = `
        You are ShiftSwap AI, an intelligent agent managing employee shifts for a restaurant.
        You communicate with employees in Hebrew via WhatsApp.
        Your goal is to parse user intents accurately. 
        
        The user might say things like "I am free all week except Tuesday after 7pm", or "I need to cancel my shift tomorrow".
        
        Current Rules:
        ${rulesConfig}
        
        Open Shifts:
        ${shiftsStr}
        
        CRITICAL INSTRUCTIONS: 
        1. If the user submits availability (e.g., "I can work Sunday and Monday", "I am free all week"), use the 'registerAvailability' tool. If they mention specific hours or conditions (e.g., "only after 19:00"), include them in the 'notes' field for that day.
        2. If they explicitly state they CANNOT work an upcoming shift they are already assigned to (e.g., they are sick, have an exam), use the 'registerShiftCancellation' tool.
        3. Do not just blindly say "Okay". You MUST use the tools to register the action in the database.
        
        Respond concisely, professionally, and naturally in Hebrew. End responses with a quick confirmation phrase like "סגרנו? 👍" to let the user know you've updated the system and they can close the chat.
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
                            name: 'registerAvailability',
                            description: 'Registers the days an employee is available to work next week. Use this when they submit or update their availability.',
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    days: {
                                        type: Type.ARRAY,
                                        description: 'List of Hebrew day names they are available (e.g., ["ראשון", "שני"]). If they say "all week", include all 7 days.',
                                        items: { type: Type.STRING }
                                    },
                                    notes: {
                                        type: Type.STRING,
                                        description: 'Any specific constraints or notes (e.g., "From 19:00", "Morning only", "Not sure about Saturday"). Keep it concise in Hebrew. Leave empty if no constraints.'
                                    }
                                },
                                required: ['days']
                            }
                        },
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
            const { registerSwapRequest, assignSwap, saveAvailability } = await import('./firebase');

            if (call.name === 'registerAvailability') {
                const args = call.args as { days: string[], notes?: string };
                console.log(`[AI] Availability submission detected: days=${args.days}, notes=${args.notes}`);

                const weekKey = getCurrentWeekKey();
                await saveAvailability(businessId, phone, weekKey, args.days, args.notes);

                const daysStr = args.days.join(', ');
                botReply = `מעולה, רשמתי! 📅\nימים פנויים: ${daysStr}`;
                if (args.notes) {
                    botReply += `\nהערות: ${args.notes}`;
                }
                botReply += `\nסגרנו? 👍`;

            } else if (call.name === 'registerShiftCancellation') {
                const args = call.args as { reason: string, date: string };
                console.log(`[AI] Shift cancellation detected: reason=${args.reason}, date=${args.date}`);
                await registerSwapRequest(businessId, phone, args.date, args.reason, senderName);
                botReply = `הבנתי, רשמתי שאת/ה לא יכול/ה להגיע ב-${args.date} בגלל: ${args.reason}. אני מחפש מחליף כרגע ואעדכן את המנהל. תרגיש/י טוב! סגרנו? 👍`;
            } else if (call.name === 'acceptShiftSwap') {
                console.log(`[AI] Swap acceptance detected from ${phone}`);
                const assignResult = await assignSwap(businessId, phone);
                if (assignResult.success) {
                    botReply = `מעולה! שיבצתי אותך למשמרת ב-${assignResult.date}. תודה רבה על העזרה! 🙏 סגרנו? 👍`;
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
