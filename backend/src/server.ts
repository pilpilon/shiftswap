import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { initWhatsAppSocket, activeSockets, qrCodes } from './whatsapp';

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
    if (!qrCodes[businessId]) {
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


app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
