# ShiftSwap AI for WhatsApp

**Automated WhatsApp bot that manages last-minute shift changes and staff negotiations.**

> Shift managers at restaurants, hotels, and event halls spend 2+ hours/day texting staff to fill last-minute gaps. ShiftSwap AI automates the entire process via WhatsApp — no new app for staff to install.

---

## 🏗️ Project Structure

```
shiftswap/
├── src/                   # React Frontend (Vite + Tailwind)
│   ├── components/        # Dashboard, LandingPage, Onboarding
│   ├── context/           # Auth context (local persistence)
│   └── hooks/             # useStorage reusable hook
│
├── backend/               # Node.js Backend
│   ├── src/
│   │   ├── server.ts      # Express API server (port 4000)
│   │   ├── whatsapp.ts    # Baileys multi-tenant socket manager
│   │   ├── ai.ts          # Gemini LLM integration
│   │   └── firebase.ts    # Firebase Admin SDK layer
│   └── sessions/          # WhatsApp auth credentials (gitignored)
│
├── vercel.json            # Frontend SPA routing for Vercel
└── FEATURES_LIST.md       # Feature tracking
```

---

## 🚀 Running Locally

### Frontend
```bash
npm install
npm run dev         # Starts on http://localhost:5173
```

### Backend
```bash
cd backend
cp .env.example .env
# Fill in GEMINI_API_KEY in .env
npm install
npm run dev         # Starts on http://localhost:4000
```

---

## 🌐 How the WhatsApp Connection Works

1. Manager opens the **הגדרות** (Settings) tab in the dashboard.
2. Clicks **"קשר מכשיר (QR)"**.
3. The frontend calls `POST /api/whatsapp/connect` on the backend.
4. The backend spins up a Baileys (WhatsApp Web) socket, generates a QR code, and returns it.
5. Manager scans the QR with their phone (exactly like WhatsApp Web).
6. The session is saved in `backend/sessions/{businessId}/`.
7. From now on, **every WhatsApp message** received by that number is auto-routed through the Gemini AI, which responds in Hebrew based on the manager's configured rules.

> **No WhatsApp Business Account required.** Works with any personal or business WhatsApp number.

---

## 🤖 AI Flow

```
Employee texts number → Baileys listener fired
  → ai.ts pulls rules from Firebase
  → Gemini 2.5 Flash generates response in Hebrew
  → Reply sent back via Baileys socket
```

---

## ☁️ Deployment

| Layer | Platform | Notes |
|:---|:---|:---|
| Frontend | **Vercel** | `vercel.json` included for SPA routing |
| Backend | **Render** | `render.yaml` included. Must set `GEMINI_API_KEY` env var. |
| Database | **Firebase Firestore** | For rules, shifts, and employee data. |

---

## 💰 Monetization

`$40/month per location`. Integrate Paddle or Stripe at Phase G checkout.
