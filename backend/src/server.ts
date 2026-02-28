import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initWhatsAppSocket, activeSockets, qrCodes, pendingSockets, getPairingCode } from './whatsapp';
import { getFirestore } from './firebase';
import { deleteFirestoreAuthState } from './firebaseAuthState';
import { startReminderScheduler } from './scheduler';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

startReminderScheduler();


// Auto-reconnect all businesses that have a stored Firestore session
async function reconnectStoredSessions() {
    const db = getFirestore();
    if (!db) {
        console.warn('[SERVER] Firestore not available — skipping auto-reconnect.');
        return;
    }
    try {
        const snap = await db.collection('whatsapp_sessions').listDocuments();
        for (const docRef of snap) {
            const businessId = docRef.id;
            console.log(`[SERVER] Auto-reconnecting Firestore session: ${businessId}`);
            initWhatsAppSocket(businessId);
        }
    } catch (err) {
        console.error('[SERVER] Failed to load Firestore sessions:', err);
    }
}

reconnectStoredSessions();

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
    } catch (error) {
        const err = error as Error;
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

    // Close the active socket if open
    if (activeSockets[businessId]) {
        try {
            await activeSockets[businessId].logout();
        } catch (e) {
            console.error("Error logging out socket", e);
        }
        delete activeSockets[businessId];
    }

    // Also clear any pending socket
    if (pendingSockets[businessId]) {
        try { pendingSockets[businessId].end(undefined); } catch { /* Ignore */ }
        delete pendingSockets[businessId];
    }
    delete qrCodes[businessId];

    // Delete Firestore session so the device is fully de-registered
    await deleteFirestoreAuthState(businessId);
    console.log(`[WHATSAPP] Firestore session deleted for ${businessId}`);

    res.json({ status: 'logged_out' });
});


// ─── Publish Schedule: one shared CSV sent to every assigned employee ────────
app.post('/api/whatsapp/publish-schedule', async (req, res) => {
    const { businessId, shifts, staff } = req.body as {
        businessId: string;
        shifts: Array<{
            date: string;
            title: string;
            roleRequirements: Array<{ role: string; assignedIds?: string[]; startTime?: string; endTime?: string }>;
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

    // Build lookup: staffId → { name, phone }
    const staffById: Record<string, { name: string; phone: string }> = {};
    for (const s of staff) {
        if (s.id && s.phone) staffById[s.id] = { name: s.name, phone: s.phone };
    }

    // ── Build ONE shared CSV (full schedule, all employees) ───────────────────
    const BOM = '\uFEFF';
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const csvHeaderParts = ['עובד', ...dayNames];

    const escapeCsv = (str: string) => {
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csvHeader = csvHeaderParts.map(escapeCsv).join(',');

    // Track all unique JIDs who appear in this schedule
    const recipientJids = new Map<string, string>(); // jid → name

    // For schedule querying
    const scheduleMap: Record<string, { date: string, hours: string, role: string }[]> = {}; // normalizedPhone -> shifts
    let weekKeyFromSchedule = '';

    const sortedShifts = [...shifts].sort((a, b) => a.date.localeCompare(b.date));

    // Map: staffId -> array of 7 strings (one for each day)
    const staffScheduleCsvMap = new Map<string, string[]>();

    for (const shift of sortedShifts) {
        const [year, month, day] = shift.date.split('-');
        const dateHe = `${day}/${month}/${year}`;
        if (!weekKeyFromSchedule) {
            // Rough week key based on first shift's date loosely mapped to currentWeekKey logic
            const d = new Date(`${year}-${month}-${day}T00:00:00Z`);
            const startOfYear = new Date(d.getFullYear(), 0, 1);
            const weekNo = Math.ceil((((d.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
            weekKeyFromSchedule = `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
        }

        const dayOfWeek = new Date(`${year}-${month}-${day}T00:00:00Z`).getDay(); // 0 is Sunday, 1 is Monday...

        for (const roleReq of shift.roleRequirements) {
            const hours = roleReq.startTime && roleReq.endTime
                ? `${roleReq.startTime}-${roleReq.endTime}`
                : shift.title;

            for (const staffId of (roleReq.assignedIds ?? [])) {
                const member = staffById[staffId];
                if (!member) continue;

                // For CSV Pivot
                if (!staffScheduleCsvMap.has(staffId)) {
                    staffScheduleCsvMap.set(staffId, ['', '', '', '', '', '', '']);
                }
                const schedArr = staffScheduleCsvMap.get(staffId)!;
                const entry = `${hours} (${roleReq.role})`;
                schedArr[dayOfWeek] = schedArr[dayOfWeek] ? `${schedArr[dayOfWeek]} | ${entry}` : entry;

                let phone = member.phone.replace(/[^0-9]/g, '');
                if (phone.startsWith('0')) phone = '972' + phone.slice(1);

                recipientJids.set(`${phone}@s.whatsapp.net`, member.name);

                if (!scheduleMap[phone]) scheduleMap[phone] = [];
                scheduleMap[phone].push({ date: dateHe, hours, role: roleReq.role });
            }
        }
    }

    const csvRows: string[] = [];
    const sortedStaffIds = Array.from(staffScheduleCsvMap.keys()).sort((a, b) => {
        return (staffById[a]?.name || '').localeCompare(staffById[b]?.name || '');
    });

    for (const staffId of sortedStaffIds) {
        const member = staffById[staffId];
        if (!member) continue;
        const daysArr = staffScheduleCsvMap.get(staffId)!;
        if (daysArr.some(d => d !== '')) {
            csvRows.push([member.name, ...daysArr].map(escapeCsv).join(','));
        }
    }

    const csvBuffer = Buffer.from(BOM + [csvHeader, ...csvRows].join('\n'), 'utf-8');

    // ── Save Published Schedule to Firestore ──────────────────────────────────
    if (weekKeyFromSchedule && Object.keys(scheduleMap).length > 0) {
        const { savePublishedSchedule } = await import('./firebase');
        await savePublishedSchedule(businessId, weekKeyFromSchedule, scheduleMap);
    }

    // ── Send the SAME CSV to every assigned employee ──────────────────────────
    let sentCount = 0;
    const errors: string[] = [];

    for (const [jid, name] of recipientJids.entries()) {
        const textMsg =
            `שלום ${name} 👋\n` +
            `הסידור לשבוע הבא פורסם!\n` +
            `הקובץ המצורף מכיל את הסידור המלא לכל הצוות.\n` +
            `אם לא תוכל להגיע למשמרת — שלח לי הודעה.`;

        try {
            await sock.sendMessage(jid, { text: textMsg });
            await sock.sendMessage(jid, {
                document: csvBuffer,
                mimetype: 'text/csv',
                fileName: 'סידור_עבודה.csv',
                caption: 'סידור עבודה שבועי',
            });
            sentCount++;
            console.log(`[PUBLISH] Sent shared schedule to ${name} (${jid})`);
        } catch (error) {
            const err = error as Error;
            console.error(`[PUBLISH] Failed to send to ${name}:`, err.message);
            errors.push(`${name}: ${err.message}`);
        }
    }

    res.json({ sent: sentCount, errors });
});


app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
