import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { useFirestoreAuthState, deleteFirestoreAuthState } from './firebaseAuthState';

// Store active sockets
export const activeSockets: Record<string, any> = {};
export const pendingSockets: Record<string, any> = {};
export const qrCodes: Record<string, string> = {};

// ── Conversation tracking ────────────────────────────────────────────────────
// Each active conversation stores two timers:
//  - expiryTimer : hard close after 5 min of total inactivity (sliding window)
//  - nudgeTimer  : send "סגרנו? 👍" 60 seconds after the bot's last reply
const CONVERSATION_TTL_MS = 5 * 60 * 1000;  // 5 min
const NUDGE_DELAY_MS = 1 * 60 * 1000;  // 1 min

interface ConvState {
    expiryTimer: ReturnType<typeof setTimeout>;
    nudgeTimer: ReturnType<typeof setTimeout> | null;
}
const activeConversations: Record<string, Map<string, ConvState>> = {};

/** Completely remove a JID from tracking and cancel all its timers. */
function closeConversation(businessId: string, jid: string) {
    const state = activeConversations[businessId]?.get(jid);
    if (!state) return;
    clearTimeout(state.expiryTimer);
    if (state.nudgeTimer) clearTimeout(state.nudgeTimer);
    activeConversations[businessId].delete(jid);
    console.log(`[WHATSAPP] Conversation closed: ${jid}`);
}

/** Open/refresh a conversation after the bot sends a reply. */
function refreshConversation(businessId: string, jid: string, sock: any) {
    // Cancel any existing timers first
    closeConversation(businessId, jid);

    if (!activeConversations[businessId]) {
        activeConversations[businessId] = new Map();
    }

    // 1-min nudge: "סגרנו? 👍"
    const nudgeTimer = setTimeout(async () => {
        try {
            await sock.sendMessage(jid, { text: 'סגרנו? 👍' });
            console.log(`[WHATSAPP] Nudge sent to ${jid}`);
        } catch { /* socket may be gone */ }
    }, NUDGE_DELAY_MS);

    // 5-min hard expiry (sliding, resets on every bot reply)
    const expiryTimer = setTimeout(() => {
        closeConversation(businessId, jid);
        console.log(`[WHATSAPP] Conversation expired (idle 5m): ${jid}`);
    }, CONVERSATION_TTL_MS);

    activeConversations[businessId].set(jid, { expiryTimer, nudgeTimer });
}

// ── Socket init ──────────────────────────────────────────────────────────────
export const initWhatsAppSocket = async (businessId: string) => {
    console.log(`[WHATSAPP] Starting socket for business ${businessId}`);

    const { state, saveCreds } = await useFirestoreAuthState(businessId);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        getMessage: async () => {
            return { conversation: 'placeholder' };
        },
    });

    pendingSockets[businessId] = sock;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`[WHATSAPP] Generated QR for ${businessId}`);
            try {
                const qrDataUri = await QRCode.toDataURL(qr);
                qrCodes[businessId] = qrDataUri;
            } catch (err) {
                console.error('Failed to generate QR code', err);
            }
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`[WHATSAPP] Connection closed for ${businessId} — status ${statusCode}, reconnecting: ${shouldReconnect}`);

            delete activeSockets[businessId];
            delete pendingSockets[businessId];
            delete qrCodes[businessId];

            if (shouldReconnect) {
                setTimeout(() => initWhatsAppSocket(businessId), 3000);
            } else {
                console.log(`[WHATSAPP] User logged out natively. Deleting Firestore session for ${businessId}`);
                await deleteFirestoreAuthState(businessId);
            }
        } else if (connection === 'open') {
            console.log(`[WHATSAPP] Connected! Socket ready for ${businessId}`);
            activeSockets[businessId] = sock;
            delete pendingSockets[businessId];
            delete qrCodes[businessId];
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        console.log(`[WHATSAPP MSG] type=${m.type} count=${m.messages.length}`);

        const msg = m.messages[0];

        if (msg.key.fromMe) return;
        if (msg.key.remoteJid === 'status@broadcast') return;
        if (msg.key.remoteJid?.endsWith('@g.us')) return;
        if (m.type !== 'notify' && m.type !== 'append') {
            console.log(`[WHATSAPP] Ignoring message type: ${m.type}`);
            return;
        }

        const jid = msg.key.remoteJid!;

        // ── Thumbs-up REACTION ────────────────────────────────────────────────
        // Employee reacted 👍 to any message → treat as "confirmed/closed"
        const reaction = msg.message?.reactionMessage?.text;
        if (reaction === '👍' && activeConversations[businessId]?.has(jid)) {
            closeConversation(businessId, jid);
            await sock.sendMessage(jid, { text: 'בסדר, תודה! 🙏' });
            return;
        }

        const incomingText = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
        if (!incomingText) {
            console.log(`[WHATSAPP] No text content in message from ${jid}`);
            return;
        }

        console.log(`[WHATSAPP] Received message from ${jid}: ${incomingText}`);

        // ── Thumbs-up as TEXT or confirmation phrase ─────────────────────────
        const CLOSE_PHRASES = ['👍', 'כן', 'סגרנו', 'יאפ', 'בדוק', 'ברור', 'אוקי', 'אוקיי', 'ok', 'okay', 'yep', 'yes'];
        const trimmedLower = incomingText.trim().toLowerCase();
        const isCloseConfirm = CLOSE_PHRASES.some(p => trimmedLower === p);
        if (isCloseConfirm && activeConversations[businessId]?.has(jid)) {
            closeConversation(businessId, jid);
            await sock.sendMessage(jid, { text: 'בסדר, תודה! 🙏' });
            return;
        }

        // ── Keyword filter ───────────────────────────────────────────────────
        const SHIFT_KEYWORDS = [
            'משמרת', 'משמרות', 'פנוי', 'פנויה', 'זמינות', 'סידור',
            'תורנות', 'החלפה', 'אישור', 'ביטול', 'לא יכול', 'לא אוכל',
            'שיבוץ', 'עבודה', 'לעבוד', 'יכול', 'יכולה', 'תרשום', 'רשום',
            'כן', 'לא', 'חולה', 'חירום'
        ];
        const lowerText = incomingText.toLowerCase();
        const isShiftRelated = SHIFT_KEYWORDS.some(kw => lowerText.includes(kw));
        const isActiveConversation = !!activeConversations[businessId]?.has(jid);

        if (!isShiftRelated && !isActiveConversation) {
            console.log(`[WHATSAPP] Ignoring non-shift message from ${jid}`);
            return;
        }

        // ── Cancel nudge on employee reply (they're still talking) ───────────
        const convState = activeConversations[businessId]?.get(jid);
        if (convState?.nudgeTimer) {
            clearTimeout(convState.nudgeTimer);
            convState.nudgeTimer = null;
        }

        try {
            const { isEmployeePhone } = await import('./firebase');
            const isEmployee = await isEmployeePhone(businessId, jid);
            if (!isEmployee) {
                console.log(`[WHATSAPP] Ignoring message from unauthorized number: ${jid}`);
                return;
            }

            const { processIncomingMessage } = await import('./ai');
            const aiResponse = await processIncomingMessage(businessId, jid, incomingText, msg.pushName ?? undefined);

            await sock.sendMessage(jid, { text: aiResponse });
            console.log(`[WHATSAPP] AI replied to ${jid}`);

            // Refresh conversation window + schedule next nudge
            refreshConversation(businessId, jid, sock);
        } catch (err) {
            console.error("[WHATSAPP] Error processing AI response:", err);
        }
    });

    return sock;
};

export const getPairingCode = async (businessId: string, phoneNumber: string) => {
    const sock = pendingSockets[businessId] || activeSockets[businessId];
    if (!sock) {
        throw new Error("WhatsApp socket not initialized for this business. Please initiate connection first.");
    }
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const code = await sock.requestPairingCode(cleanPhone);
    return code;
};
