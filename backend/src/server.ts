import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { initWhatsAppSocket, activeSockets, qrCodes, pendingSockets, getPairingCode } from './whatsapp';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Auto-reconnect existing sessions
const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');
if (fs.existsSync(SESSIONS_DIR)) {
    const sessions = fs.readdirSync(SESSIONS_DIR);
    for (const sessionId of sessions) {
        if (fs.statSync(path.join(SESSIONS_DIR, sessionId)).isDirectory()) {
            console.log(`Auto-reconnecting existing session: ${sessionId}`);
            initWhatsAppSocket(sessionId);
        }
    }
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Endpoint to start a WhatsApp session and get the QR code
app.post('/api/whatsapp/connect', async (req, res) => {
    const { businessId } = req.body;

    if (!businessId) {
        return res.status(400).json({ error: 'businessId is required' });
    }

    if (activeSockets[businessId]) {
        return res.json({ status: 'connected', message: 'Already connected' });
    }

    // Start socket creation in background. 
    // It will populate qrCodes[businessId] when ready.
    if (!qrCodes[businessId] && !pendingSockets[businessId]) {
        initWhatsAppSocket(businessId);
    }

    // We delay slightly to give time for the QR to generate on first run.
    setTimeout(() => {
        if (qrCodes[businessId]) {
            res.json({ status: 'qr_ready', qr: qrCodes[businessId] });
        } else if (activeSockets[businessId]) {
            res.json({ status: 'connected' });
        } else {
            res.json({ status: 'pending', message: 'Generating QR...' });
        }
    }, 2000);
});

// Endpoint to get a pairing code
app.post('/api/whatsapp/pairing-code', async (req, res) => {
    const { businessId, phoneNumber } = req.body;

    if (!businessId || !phoneNumber) {
        return res.status(400).json({ error: 'businessId and phoneNumber are required' });
    }

    try {
        if (!qrCodes[businessId] && !pendingSockets[businessId] && !activeSockets[businessId]) {
            initWhatsAppSocket(businessId);
            await new Promise(resolve => setTimeout(resolve, 3000)); // wait a bit for connection update
        }

        const code = await getPairingCode(businessId, phoneNumber);
        res.json({ code });
    } catch (err: any) {
        console.error("Pairing code error:", err);
        res.status(500).json({ error: err.message || 'Failed to request pairing code' });
    }
});

// Polling endpoint for frontend to check connection status
app.get('/api/whatsapp/status/:businessId', (req, res) => {
    const { businessId } = req.params;

    if (activeSockets[businessId]) {
        return res.json({ status: 'connected' });
    }

    if (qrCodes[businessId]) {
        return res.json({ status: 'qr_ready', qr: qrCodes[businessId] });
    }

    return res.json({ status: 'disconnected' });
});

// Logout endpoint
app.post('/api/whatsapp/disconnect', async (req, res) => {
    const { businessId } = req.body;

    if (activeSockets[businessId]) {
        try {
            activeSockets[businessId].logout();
            delete activeSockets[businessId];
        } catch (e) {
            console.error("Error logging out", e);
        }
    }

    // Always force delete the session directory so they can get a fresh QR code
    const sessionDir = path.join(SESSIONS_DIR, businessId);
    if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log(`[WHATSAPP] Forcefully deleted session directory for ${businessId}`);
    }

    res.json({ status: 'logged_out' });
});


// ─── Publish Schedule: send real WhatsApp messages to assigned workers ───────
app.post('/api/whatsapp/publish-schedule', async (req, res) => {
    const { businessId, shifts, staff } = req.body as {
        businessId: string;
        shifts: Array<{
            date: string;
            title: string;
            roleRequirements: Array<{ role: string; assignedIds?: string[] }>;
        }>;
        staff: Array<{ id: string; name: string; phone: string }>;
    };

    if (!businessId || !shifts || !staff) {
        return res.status(400).json({ error: 'businessId, shifts and staff are required' });
    }

    const sock = activeSockets[businessId];
    if (!sock) {
        return res.status(503).json({ error: 'not_connected', message: 'WhatsApp לא מחובר. חבר את הוואטסאפ בהגדרות.' });
    }

    // Build a map of staffId → { name, phone }
    const staffById: Record<string, { name: string; phone: string }> = {};
    for (const s of staff) {
        if (s.id && s.phone) {
            staffById[s.id] = { name: s.name, phone: s.phone };
        }
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const shift of shifts) {
        // Track phones already messaged for this shift to avoid duplicates
        const sentThisShift = new Set<string>();

        for (const req of shift.roleRequirements) {
            for (const staffId of (req.assignedIds ?? [])) {
                const member = staffById[staffId];
                if (!member) continue;

                // Normalize Israeli phone to WhatsApp JID format (972XXXXXXXXX@s.whatsapp.net)
                let phone = member.phone.replace(/[^0-9]/g, '');
                if (phone.startsWith('0')) phone = '972' + phone.slice(1);
                const jid = `${phone}@s.whatsapp.net`;

                if (sentThisShift.has(jid)) continue;
                sentThisShift.add(jid);

                const [year, month, day] = shift.date.split('-');
                const dateHebrew = `${day}/${month}/${year}`;
                const message = `שלום ${member.name} 👋\n\nהסידור השבועי פורסם!\n\n📅 תאריך: ${dateHebrew}\n⏰ משמרת: ${shift.title}\n\nתגיב "אישור" לאישור קבלת ההודעה, או פנה לינה ישירות אם יש לך בקשה לשינוי.`;

                try {
                    await sock.sendMessage(jid, { text: message });
                    sentCount++;
                    console.log(`[PUBLISH] Sent to ${member.name} (${jid})`);
                } catch (err: any) {
                    console.error(`[PUBLISH] Failed to send to ${member.name}:`, err.message);
                    errors.push(`${member.name}: ${err.message}`);
                }
            }
        }
    }

    res.json({ sent: sentCount, errors });
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
