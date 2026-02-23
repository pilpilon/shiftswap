import { GoogleGenAI } from '@google/genai';

// Initialize the Google Gen AI SDK
// The SDK automatically picks up the GEMINI_API_KEY environment variable.
const ai = new GoogleGenAI({});

import { getBusinessRules, getOpenShifts } from './firebase';

export async function processIncomingMessage(businessId: string, remoteJid: string, incomingText: string): Promise<string> {

    // Fetch context from Firestore (or mocks if disconnected)
    const rulesConfig = await getBusinessRules(businessId);
    const openShifts = await getOpenShifts(businessId);

    const shiftsStr = openShifts.length > 0
        ? openShifts.map(s => `- ${s.date} (${s.role})`).join('\n')
        : "No open shifts right now.";

    const systemInstruction = `
        You are ShiftSwap AI, an intelligent agent managing employee shifts for a restaurant.
        You communicate with employees in Hebrew via WhatsApp.
        Your goal is to find coverage for open shifts, negotiate based on rules, and assist employees.
        
        Current Rules:
        ${rulesConfig}
        
        Open Shifts:
        ${shiftsStr}
        
        Respond concisely, professionally, and naturally.
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

        return response.text || "סליחה, לא הבנתי. תוכל לחזור שנית?";
    } catch (error) {
        console.error("AI Generation Error: ", error);
        return "מצטער, חלה שגיאה במערכת כרגע.";
    }
}
