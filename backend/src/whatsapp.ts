import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

// Store active sockets
export const activeSockets: Record<string, any> = {};
export const qrCodes: Record<string, string> = {};

// We store sessions locally for now. Later we will move this to Firebase.
const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR);
}

export const initWhatsAppSocket = async (businessId: string) => {
    const sessionDir = path.join(SESSIONS_DIR, businessId);

    // Auth state hook provided by Baileys
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    let qrcodeCallback: ((qr: string) => void) | null = null;

    console.log(`[WHATSAPP] Starting socket for business ${businessId}`);

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`[WHATSAPP] Generated QR for ${businessId}`);
            // Generate Data URI from QR
            try {
                const qrDataUri = await QRCode.toDataURL(qr);
                qrCodes[businessId] = qrDataUri;
            } catch (err) {
                console.error('Failed to generate QR code', err);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[WHATSAPP] Connection closed for ${businessId} due to ${lastDisconnect?.error}, reconnecting: ${shouldReconnect}`);

            delete activeSockets[businessId];
            delete qrCodes[businessId];

            if (shouldReconnect) {
                initWhatsAppSocket(businessId);
            } else {
                console.log(`[WHATSAPP] User logged out natively. Deleting session ${businessId}`);
                // If logged out, we should clear the session dir
                fs.rmSync(sessionDir, { recursive: true, force: true });
            }
        } else if (connection === 'open') {
            console.log(`[WHATSAPP] Connected! Socket ready for ${businessId}`);
            activeSockets[businessId] = sock;
            delete qrCodes[businessId]; // Clear the QR once connected
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        // console.log(`[WHATSAPP MSG - ${businessId}]`, JSON.stringify(m, undefined, 2));

        // This is where we will route the message to the AI handler
        // AI Webhook Handler logic will go here

        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === 'notify' && msg.message) {
            const incomingText = msg.message.conversation || msg.message.extendedTextMessage?.text;

            if (incomingText) {
                console.log(`Received message from ${msg.key.remoteJid}: `, incomingText);

                try {
                    // Route to AI
                    const { processIncomingMessage } = await import('./ai');
                    const aiResponse = await processIncomingMessage(businessId, msg.key.remoteJid!, incomingText);

                    // Reply
                    await sock.sendMessage(msg.key.remoteJid!, { text: aiResponse });
                } catch (err) {
                    console.error("Error processing AI response:", err);
                }
            }
        }
    });

    return sock;
};
