# DOITNOW — Anti-Procrastination Reminder App

Schedules recurring Google Calendar reminders every 1–2 hours for whatever you keep avoiding.

---

## Stack
- **Frontend:** React + Vite (static site)
- **Backend:** Vercel Serverless Functions (`/api/schedule`, `/api/cancel`)
- **Calendar:** Google Calendar API (direct OAuth) or Claude MCP fallback
- **AI:** Anthropic Claude API (server-side only)

---

## Setup & Deployment

### Step 1 — Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/doitnow.git
cd doitnow
npm install
```

### Step 2 — Get your Anthropic API key

1. Go to https://console.anthropic.com/account/keys
2. Create a new key
3. Copy it — you'll add it to Vercel in Step 4

### Step 3 — (Optional) Set up Google OAuth for direct Calendar access

Without this, the app falls back to Claude's MCP integration.

1. Go to https://console.cloud.google.com
2. Create a project (or select existing)
3. Go to **APIs & Services → Library** → Enable **Google Calendar API**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add your Vercel URL to **Authorized JavaScript origins** (e.g. `https://doitnow.vercel.app`)
7. Copy the **Client ID**

### Step 4 — Deploy to Vercel

```bash
npm install -g vercel   # if not installed
vercel login
vercel
```

When prompted, set these **Environment Variables** in the Vercel dashboard
(Project → Settings → Environment Variables):

| Variable | Value | Required? |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-xxxx` | ✅ Yes |
| `VITE_GOOGLE_CLIENT_ID` | `xxxx.apps.googleusercontent.com` | Optional |

Then redeploy:
```bash
vercel --prod
```

### Step 5 — Use it

1. Open your Vercel URL
2. Click **Connect Google Calendar** (or skip for MCP fallback)
3. Type whatever you're procrastinating on
4. Set interval + window → **Schedule It**
5. Your phone buzzes every 1–2 hours with a calendar popup

---

## Local Development

```bash
cp .env.example .env
# Fill in your ANTHROPIC_API_KEY in .env

npm run dev         # starts Vite on localhost:5173
vercel dev          # starts Vite + serverless functions on localhost:3000 (recommended)
```

Use `vercel dev` for local testing so the `/api/` routes work properly.

---

## File Structure

```
doitnow/
├── api/
│   ├── schedule.js      ← Vercel function: creates calendar events
│   └── cancel.js        ← Vercel function: deletes calendar events
├── src/
│   ├── main.jsx         ← React entry point
│   └── App.jsx          ← Full UI + logic
├── public/
├── index.html
├── vite.config.js
├── vercel.json
├── package.json
├── .env.example
└── .gitignore
```

---

## Notes

- Your `ANTHROPIC_API_KEY` never leaves the server — it's only used in `/api/` functions
- Google OAuth token lives in React state only (refreshed each session)
- Events have a random ±30min jitter so they don't feel mechanical
- Cancel is two-click (confirm required) to avoid accidents
