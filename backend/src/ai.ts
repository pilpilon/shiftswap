import { GoogleGenAI } from '@google/genai';

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
        
        Respond concisely, professionally, and naturally in Hebrew.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: incomingText,
            config: {
                systemInstruction,
                temperature: 0.7,
            }
        });

        const botReply = response.text || 'סליחה, לא הבנתי. תוכל לחזור שנית?';
        await saveNegotiationLog(businessId, remoteJid, botReply, 'ai');
        return botReply;
    } catch (error) {
        console.error('AI Generation Error: ', error);
        return 'מצטער, חלה שגיאה במערכת כרגע.';
    }
}
