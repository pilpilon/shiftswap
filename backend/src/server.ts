import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getAuth } from 'firebase-admin/auth';
import { initWhatsAppSocket, activeSockets, qrCodes, pendingSockets, getPairingCode } from './whatsapp';
import { getFirestore, sweepStaleLocks } from './firebase';
import { deleteFirestoreAuthState } from './firebaseAuthState';
import { startReminderScheduler } from './scheduler';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ─── Authentication Middleware ───────────────────────────────────────────────
export async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

    try {
        const decoded = await getAuth().verifyIdToken(token);
        // We expect businessId in params or body
        const requestedBusinessId = req.body.businessId || req.params.businessId;

        // Admin/developer bypass via custom claims could go here

        // Ensure the authenticated user owns this business data
        if (requestedBusinessId && decoded.uid !== requestedBusinessId) {
            return res.status(403).json({ error: 'Forbidden: Business ID mismatch' });
        }

        // Attach decoded user to request for downstream use if needed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).user = decoded;
        next();
    } catch (e) {
        console.error('[AUTH] Token verification failed:', e);
        res.status(403).json({ error: 'Forbidden: Invalid token' });
    }
}

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

            // Sweep any stale swap locks from previous server crashes
            const cleaned = await sweepStaleLocks(businessId);
            if (cleaned > 0) {
                console.log(`[SERVER] Cleaned ${cleaned} stale swap lock(s) for ${businessId}`);
            }

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
app.post('/api/whatsapp/connect', requireAuth, async (req, res) => {
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
app.post('/api/whatsapp/pairing-code', requireAuth, async (req, res) => {
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
app.get('/api/whatsapp/status/:businessId', requireAuth, (req, res) => {
    const businessId = req.params.businessId as string;

    if (activeSockets[businessId]) {
        return res.json({ status: 'connected' });
    }

    if (qrCodes[businessId]) {
        return res.json({ status: 'qr_ready', qr: qrCodes[businessId] });
    }

    return res.json({ status: 'disconnected' });
});

// Logout endpoint
app.post('/api/whatsapp/disconnect', requireAuth, async (req, res) => {
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
app.post('/api/whatsapp/publish-schedule', requireAuth, async (req, res) => {
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

// ─── Webhooks ──────────────────────────────────────────────────────────────
app.post('/api/webhooks/paddle', async (req, res) => {
    // In production, you must verify the Paddle webhook signature here
    // using Paddle SDK. For this fix, we process the payload directly.
    const payload = req.body;

    if (payload.event_type === 'subscription.created' || payload.event_type === 'subscription.updated' || payload.event_type === 'transaction.completed') {
        const userId = payload.data?.custom_data?.userId || payload.data?.customData?.userId;

        if (userId) {
            try {
                const db = getFirestore();
                if (db) {
                    await db.collection('users').doc(userId).update({
                        isPro: true,
                        updatedAt: new Date().toISOString()
                    });
                    console.log(`[PADDLE] Upgraded user ${userId} to Pro`);
                }
            } catch (err) {
                console.error('[PADDLE] Failed to update user to Pro:', err);
            }
        } else {
            console.warn('[PADDLE] Webhook received but no userId found in custom_data');
        }
    }

    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
