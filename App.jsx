import { useState, useRef } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";

function loadGoogleScript() {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = resolve;
    document.head.appendChild(s);
  });
}
async function getGoogleToken(clientId) {
  await loadGoogleScript();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GCAL_SCOPE,
      callback: (resp) => resp.error ? reject(new Error(resp.error)) : resolve(resp.access_token),
    });
    client.requestAccessToken();
  });
}

function buildSlots(intervalMinutes, durationHours) {
  const now = Date.now();
  const slots = [];
  let cursor = now + intervalMinutes * 60 * 1000;
  const end = now + durationHours * 60 * 60 * 1000;
  while (cursor <= end) {
    slots.push(cursor);
    cursor += (intervalMinutes + Math.floor(Math.random() * 30)) * 60 * 1000;
  }
  return slots;
}

async function apiSchedule({ task, intervalMinutes, durationHours, gcalToken }) {
  const slots = buildSlots(intervalMinutes, durationHours);
  if (!slots.length) return { success: false, error: "No slots in this window." };
  const res = await fetch("/api/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, slots, gcalToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Server error");
  const first = new Date(slots[0]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const last = new Date(slots[slots.length - 1]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return { ...data, firstSlot: first, lastSlot: last, slotCount: slots.length };
}

async function apiCancel({ task, eventIds, gcalToken }) {
  const res = await fetch("/api/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, eventIds, gcalToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Server error");
  return data;
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

  :root {
    --bg: #070b12;
    --bg2: #0c1220;
    --bg3: #111827;
    --border: rgba(255,255,255,0.06);
    --border-hi: rgba(255,255,255,0.12);
    --amber: #f59e0b;
    --amber-dim: rgba(245,158,11,0.10);
    --amber-glow: rgba(245,158,11,0.22);
    --blue: #3b82f6;
    --green: #10b981;
    --green-dim: rgba(16,185,129,0.10);
    --red: #ef4444;
    --text: #f1f5f9;
    --muted: #64748b;
    --dim: #1e293b;
    --fD: 'Syne', sans-serif;
    --fM: 'JetBrains Mono', monospace;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body { background: var(--bg); font-family: var(--fM); color: var(--text); overflow-x: hidden; }

  .bg-grid {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(245,158,11,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,158,11,0.025) 1px, transparent 1px);
    background-size: 64px 64px;
  }
  .orb1 {
    position: fixed; width: 700px; height: 700px; border-radius: 50%;
    background: radial-gradient(circle, rgba(245,158,11,0.055) 0%, transparent 65%);
    top: -250px; right: -250px; pointer-events: none; z-index: 0;
    animation: float1 14s ease-in-out infinite;
  }
  .orb2 {
    position: fixed; width: 600px; height: 600px; border-radius: 50%;
    background: radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 65%);
    bottom: -200px; left: -200px; pointer-events: none; z-index: 0;
    animation: float1 18s ease-in-out infinite reverse;
  }
  @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(25px,-25px)} }

  /* ─── Setup ─── */
  .setup {
    position: relative; z-index: 1;
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
  }
  .setup-card {
    width: 100%; max-width: 500px;
    background: var(--bg2);
    border: 1px solid var(--border-hi);
    border-radius: 20px;
    padding: 52px 48px;
    position: relative;
    box-shadow: 0 0 100px rgba(245,158,11,0.06), 0 40px 80px rgba(0,0,0,0.6);
    animation: rise 0.7s cubic-bezier(0.16,1,0.3,1);
  }
  @keyframes rise { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
  .setup-card::before {
    content: '';
    position: absolute; top: 0; left: 60px; right: 60px; height: 1px;
    background: linear-gradient(90deg, transparent, var(--amber), transparent);
    opacity: 0.5; border-radius: 99px;
  }

  .badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--amber-dim);
    border: 1px solid rgba(245,158,11,0.18);
    border-radius: 99px; padding: 5px 16px;
    font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase;
    color: var(--amber); margin-bottom: 28px;
  }
  .badge-pulse {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--amber);
    animation: p 1.5s infinite;
  }
  @keyframes p { 0%,100%{opacity:1} 50%{opacity:0.2} }

  .headline {
    font-family: var(--fD);
    font-size: 50px; font-weight: 800; line-height: 1.05;
    letter-spacing: -1.5px; margin-bottom: 14px;
  }
  .headline em { font-style: normal; color: var(--amber); }
  .subline {
    font-size: 12px; color: var(--muted); line-height: 1.7;
    margin-bottom: 44px; letter-spacing: 0.2px;
  }

  .step-row { margin-bottom: 22px; }
  .step-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .step-num {
    width: 26px; height: 26px; border-radius: 50%;
    background: var(--amber-dim); border: 1px solid rgba(245,158,11,0.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; color: var(--amber); font-weight: 500; flex-shrink: 0;
  }
  .step-name {
    font-family: var(--fD); font-size: 13px; font-weight: 700; letter-spacing: 0.3px;
  }
  .step-note {
    font-size: 11px; color: var(--muted); line-height: 1.7; padding-left: 38px;
  }
  .step-note a { color: var(--amber); text-decoration: none; }

  .hr { height: 1px; background: var(--border); margin: 28px 0; }

  .gcal-btn {
    width: 100%; padding: 15px 20px; border-radius: 12px;
    border: 1px solid rgba(16,185,129,0.28);
    background: var(--green-dim); color: var(--green);
    font-family: var(--fD); font-size: 14px; font-weight: 700; letter-spacing: 0.5px;
    cursor: pointer; transition: all 0.22s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .gcal-btn:hover:not(:disabled) {
    background: rgba(16,185,129,0.16);
    box-shadow: 0 0 28px rgba(16,185,129,0.14);
    transform: translateY(-1px);
  }
  .gcal-btn.done { opacity: 0.6; cursor: default; }
  .gcal-btn.skipped { border-color: var(--border-hi); background: transparent; color: var(--muted); font-size: 12px; }

  .launch {
    width: 100%; margin-top: 32px; padding: 20px;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--amber) 0%, #d97706 100%);
    border: none; color: #000;
    font-family: var(--fD); font-size: 16px; font-weight: 800;
    letter-spacing: 2px; text-transform: uppercase;
    cursor: pointer; transition: all 0.22s;
    box-shadow: 0 6px 28px rgba(245,158,11,0.28);
    position: relative; overflow: hidden;
  }
  .launch::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.18), transparent);
  }
  .launch:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(245,158,11,0.38); }
  .launch:disabled { opacity: 0.25; cursor: not-allowed; box-shadow: none; transform: none; }

  /* ─── App ─── */
  .appw { position: relative; z-index: 1; min-height: 100vh; }

  .nav {
    height: 66px; padding: 0 36px;
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid var(--border);
    background: rgba(7,11,18,0.85);
    backdrop-filter: blur(16px);
    position: sticky; top: 0; z-index: 100;
  }
  .nav-logo { font-family: var(--fD); font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
  .nav-logo span { color: var(--amber); }
  .nav-mid { display: flex; align-items: center; gap: 8px; }
  .pill {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--bg3); border: 1px solid var(--border-hi);
    border-radius: 99px; padding: 5px 16px;
    font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted);
  }
  .pd { width: 6px; height: 6px; border-radius: 50%; }
  .pd.g { background: var(--green); box-shadow: 0 0 7px var(--green); animation: p 2s infinite; }
  .pd.a { background: var(--amber); animation: p 2s infinite; }
  .back {
    background: none; border: 1px solid var(--border-hi); border-radius: 9px;
    color: var(--muted); font-family: var(--fM); font-size: 11px;
    padding: 7px 16px; cursor: pointer; transition: all 0.2s; letter-spacing: 0.3px;
  }
  .back:hover { color: var(--text); background: var(--bg3); }

  .layout {
    display: grid; grid-template-columns: 1fr 340px;
    min-height: calc(100vh - 66px);
  }
  .lp { padding: 32px 36px; }
  .rp { padding: 32px 28px; border-left: 1px solid var(--border); background: var(--bg2); }

  /* Input card */
  .icard {
    background: var(--bg2); border: 1px solid var(--border-hi);
    border-radius: 16px; padding: 28px 30px;
    margin-bottom: 16px; position: relative; overflow: hidden;
    transition: border-color 0.3s, box-shadow 0.3s;
  }
  .icard:focus-within {
    border-color: rgba(245,158,11,0.32);
    box-shadow: 0 0 48px rgba(245,158,11,0.06);
  }
  .icard::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--amber), transparent);
    opacity: 0; transition: opacity 0.3s;
  }
  .icard:focus-within::after { opacity: 0.5; }

  .ilabel {
    font-family: var(--fD); font-size: 10px; font-weight: 700;
    letter-spacing: 2.5px; text-transform: uppercase; color: var(--muted);
    margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
  }
  .ilabel-icon { color: var(--amber); }

  .itextarea {
    width: 100%; background: transparent; border: none; outline: none;
    color: var(--text); font-family: var(--fD);
    font-size: 19px; font-weight: 600; line-height: 1.45;
    resize: none; min-height: 82px; letter-spacing: -0.4px;
  }
  .itextarea::placeholder { color: var(--dim); }

  .ifooter {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border);
    flex-wrap: wrap; gap: 8px;
  }
  .ihint { font-size: 10px; color: var(--dim); letter-spacing: 0.5px; }
  .ihint kbd {
    background: var(--bg3); border: 1px solid var(--border-hi);
    border-radius: 4px; padding: 1px 7px; font-size: 9px;
  }

  /* Controls */
  .cgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .ccard {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: 12px; padding: 16px 18px;
    transition: border-color 0.2s;
  }
  .ccard:hover { border-color: var(--border-hi); }
  .clabel {
    font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--muted); margin-bottom: 8px;
  }
  .csel {
    width: 100%; background: transparent; border: none;
    color: var(--text); font-family: var(--fD);
    font-size: 13px; font-weight: 600; outline: none;
    cursor: pointer; appearance: none;
  }
  .csel option { background: #111827; }

  /* Schedule btn */
  .sbtn {
    width: 100%; padding: 18px; border-radius: 13px;
    background: linear-gradient(135deg, var(--amber), #d97706);
    border: none; color: #000;
    font-family: var(--fD); font-size: 15px; font-weight: 800;
    letter-spacing: 2px; text-transform: uppercase;
    cursor: pointer; transition: all 0.22s;
    box-shadow: 0 4px 24px rgba(245,158,11,0.22);
    display: flex; align-items: center; justify-content: center; gap: 10px;
    position: relative; overflow: hidden;
  }
  .sbtn::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.18), transparent);
  }
  .sbtn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(245,158,11,0.32); }
  .sbtn:disabled { opacity: 0.32; cursor: not-allowed; box-shadow: none; transform: none; }
  .spin { width: 16px; height: 16px; border: 2px solid rgba(0,0,0,0.25); border-top-color: #000; border-radius: 50%; animation: sp 0.7s linear infinite; flex-shrink: 0; }
  @keyframes sp { to{transform:rotate(360deg)} }

  /* Tasks */
  .tsec { margin-top: 28px; }
  .sec-title {
    font-family: var(--fD); font-size: 10px; font-weight: 700;
    letter-spacing: 2.5px; text-transform: uppercase; color: var(--muted);
    margin-bottom: 14px; display: flex; align-items: center; gap: 10px;
  }
  .sec-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  .tcard {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: 13px; padding: 18px 20px;
    margin-bottom: 10px; position: relative;
    animation: tin 0.38s cubic-bezier(0.16,1,0.3,1);
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .tcard:hover { border-color: var(--border-hi); box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
  .tcard.gone { opacity: 0.35; pointer-events: none; }
  @keyframes tin { from{opacity:0;transform:translateX(-14px)} to{opacity:1;transform:translateX(0)} }

  .tbar {
    position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, var(--amber), #d97706);
  }

  .ttxt {
    font-family: var(--fD); font-size: 14px; font-weight: 600;
    line-height: 1.45; padding-right: 72px; margin-left: 14px;
    margin-bottom: 12px; color: var(--text);
  }

  .tchips { display: flex; flex-wrap: wrap; gap: 6px; margin-left: 14px; }
  .chip {
    font-size: 9px; letter-spacing: 1px; text-transform: uppercase;
    padding: 3px 10px; border-radius: 99px;
    border: 1px solid var(--border-hi); color: var(--muted);
  }
  .chip.g { border-color: rgba(16,185,129,0.3); color: var(--green); background: var(--green-dim); }

  .xbtn {
    position: absolute; top: 14px; right: 14px;
    background: none; border: 1px solid transparent;
    border-radius: 8px; color: var(--dim);
    font-family: var(--fM); font-size: 10px; letter-spacing: 1px;
    padding: 4px 11px; cursor: pointer; transition: all 0.2s; text-transform: uppercase;
  }
  .xbtn:hover:not(:disabled) { border-color: rgba(239,68,68,0.3); color: var(--red); background: rgba(239,68,68,0.06); }
  .xbtn.cfm { border-color: rgba(245,158,11,0.4); color: var(--amber); background: var(--amber-dim); animation: cfm 0.8s infinite alternate; }
  .xbtn.cling { color: var(--muted); cursor: not-allowed; }
  @keyframes cfm { from{opacity:1} to{opacity:0.45} }

  /* Empty */
  .empty { text-align: center; padding: 52px 24px; }
  .empty-ico { font-size: 42px; display: block; margin-bottom: 16px; opacity: 0.15; }
  .empty-h { font-family: var(--fD); font-size: 14px; font-weight: 700; color: var(--muted); margin-bottom: 6px; }
  .empty-s { font-size: 11px; color: var(--dim); }

  /* Right panel */
  .sgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 26px; }
  .scard {
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 13px; padding: 20px 16px; text-align: center;
    transition: border-color 0.2s;
  }
  .scard:hover { border-color: var(--border-hi); }
  .sval {
    font-family: var(--fD); font-size: 44px; font-weight: 800;
    color: var(--amber); line-height: 1; margin-bottom: 5px;
  }
  .slbl { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); }

  .hcard {
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 13px; padding: 22px 20px; margin-bottom: 14px;
  }
  .htitle { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--amber); margin-bottom: 18px; font-weight: 500; }
  .hrow { display: flex; gap: 12px; margin-bottom: 14px; align-items: flex-start; }
  .hrow:last-child { margin-bottom: 0; }
  .hnum {
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--amber-dim); border: 1px solid rgba(245,158,11,0.22);
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; color: var(--amber); font-weight: 600; flex-shrink: 0; margin-top: 1px;
  }
  .htxt { font-size: 11px; color: var(--muted); line-height: 1.65; }
  .htxt strong { color: var(--text); font-weight: 500; }

  .lcard {
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 13px; padding: 18px 20px;
  }
  .lhead {
    font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--dim); margin-bottom: 10px;
    display: flex; align-items: center; gap: 7px;
  }
  .ldot { width: 5px; height: 5px; border-radius: 50%; background: var(--green); animation: p 2s infinite; }
  .ltext { font-size: 10px; color: var(--dim); line-height: 1.85; white-space: pre-wrap; word-break: break-all; min-height: 44px; }

  /* Toast */
  .toast {
    position: fixed; bottom: 28px; right: 28px; z-index: 9999;
    background: var(--bg3); border: 1px solid var(--border-hi);
    border-radius: 14px; padding: 14px 20px;
    font-size: 12px; letter-spacing: 0.3px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.45);
    animation: tin2 0.32s cubic-bezier(0.16,1,0.3,1);
    display: flex; align-items: center; gap: 10px; max-width: 310px;
  }
  .toast::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--green); flex-shrink: 0; }
  .toast.err::before { background: var(--red); }
  .toast.err { border-color: rgba(239,68,68,0.18); }
  @keyframes tin2 { from{opacity:0;transform:translateY(12px) scale(0.94)} to{opacity:1;transform:translateY(0) scale(1)} }

  @media (max-width: 768px) {
    .layout { grid-template-columns: 1fr; }
    .rp { border-left: none; border-top: 1px solid var(--border); }
    .nav, .lp, .rp { padding-left: 20px; padding-right: 20px; }
    .nav-mid { display: none; }
    .setup-card { padding: 36px 28px; }
    .headline { font-size: 38px; }
  }
`;

function SetupScreen({ onComplete }) {
  const [status, setStatus] = useState("idle");
  const [token, setToken] = useState("");
  const hasId = !!GOOGLE_CLIENT_ID;

  const connect = async () => {
    if (!hasId) { setStatus("skipped"); return; }
    try {
      const t = await getGoogleToken(GOOGLE_CLIENT_ID);
      setToken(t); setStatus("done");
    } catch (e) { alert("Google sign-in failed: " + e.message); }
  };

  return (
    <div className="setup">
      <div className="setup-card">
        <div className="badge"><span className="badge-pulse"/>Productivity System</div>

        <div className="headline">Stop <em>waiting.</em><br/>Start doing.</div>
        <div className="subline">
          DOITNOW fires aggressive calendar reminders every 1–2 hours for whatever you keep putting off. No excuses. No mercy.
        </div>

        <div className="step-row">
          <div className="step-head">
            <div className="step-num">1</div>
            <div className="step-name">Connect Google Calendar</div>
          </div>
          <button
            className={`gcal-btn ${status === "done" ? "done" : status === "skipped" ? "skipped" : ""}`}
            onClick={connect} disabled={status === "done"}
          >
            {status === "done" ? "✓ Calendar Connected" : status === "skipped" ? "Skipped — MCP fallback active" : "→ Sign in with Google"}
          </button>
          {!hasId && status === "idle" && (
            <p className="step-note" style={{marginTop:10}}>
              No Google Client ID set. <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer">Create one here</a> — or skip to use Claude MCP fallback.
            </p>
          )}
          {status === "done" && <p className="step-note" style={{marginTop:8,color:"var(--green)"}}>✓ Events will be created & deleted directly via Google Calendar API.</p>}
        </div>

        <div className="hr"/>

        <div className="step-row">
          <div className="step-head">
            <div className="step-num">2</div>
            <div className="step-name">Backend Secured</div>
          </div>
          <p className="step-note">Your Anthropic API key lives in Vercel server-side — never exposed to the browser. Scheduling happens securely.</p>
        </div>

        <button className="launch" onClick={() => onComplete(token || null)} disabled={status === "idle"}>
          {status === "idle" ? "Connect Google Calendar First" : "Launch Command Center →"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [gcalToken, setGcalToken] = useState(null);
  const [task, setTask] = useState("");
  const [intv, setIntv] = useState("60");
  const [dur, setDur] = useState("8");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [toast, setToast] = useState(null);
  const [log, setLog] = useState("// System ready. Awaiting input.");
  const [cfmId, setCfmId] = useState(null);
  const [clingId, setClingId] = useState(null);
  const timers = useRef({});

  const toast_ = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4200);
  };

  const schedule = async () => {
    if (!task.trim()) return toast_("Enter a task first.", "err");
    setLoading(true);
    setLog("// Connecting...\n// Building time slots...");
    try {
      const mins = parseInt(intv), hrs = parseInt(dur);
      const r = await apiSchedule({ task: task.trim(), intervalMinutes: mins, durationHours: hrs, gcalToken });
      if (r.success) {
        setTasks(p => [{
          id: Date.now(), text: task.trim(),
          iL: mins >= 60 ? `Every ${mins/60}h` : `Every ${mins}m`,
          dL: `${hrs}h window`,
          events: r.eventsCreated || r.slotCount,
          eventIds: r.eventIds || [],
          from: r.firstSlot, to: r.lastSlot,
        }, ...p]);
        setTask("");
        setLog(`// ✓ ${r.eventsCreated || r.slotCount} events scheduled\n// ${r.firstSlot} → ${r.lastSlot}\n// via ${r.method || "api"}`);
        toast_(`✓ ${r.eventsCreated || r.slotCount} reminders live on your calendar`);
      } else {
        setLog(`// ERROR: ${r.error}`);
        toast_(r.error, "err");
      }
    } catch (e) {
      setLog(`// ERROR: ${e.message}`);
      toast_(e.message, "err");
    } finally { setLoading(false); }
  };

  const clickX = (t) => {
    if (clingId === t.id) return;
    if (cfmId === t.id) {
      clearTimeout(timers.current[t.id]);
      setCfmId(null); doCancel(t);
    } else {
      setCfmId(t.id);
      timers.current[t.id] = setTimeout(() => setCfmId(p => p === t.id ? null : p), 3000);
    }
  };

  const doCancel = async (t) => {
    setClingId(t.id);
    setLog(`// Removing ${t.events} events...`);
    try {
      const r = await apiCancel({ task: t.text, eventIds: t.eventIds, gcalToken });
      setTasks(p => p.filter(x => x.id !== t.id));
      setLog(`// ✓ Removed ${r.deleted} calendar events`);
      toast_(`✓ ${r.deleted} reminders cancelled`);
    } catch (e) {
      setLog(`// ERROR: ${e.message}`);
      toast_(e.message, "err");
    } finally { setClingId(null); }
  };

  const total = tasks.reduce((a, t) => a + (t.events || 0), 0);

  if (!ready) return (
    <>
      <style>{css}</style>
      <div><div className="bg-grid"/><div className="orb1"/><div className="orb2"/>
        <SetupScreen onComplete={(tok) => { setGcalToken(tok); setReady(true); }}/>
      </div>
    </>
  );

  return (
    <>
      <style>{css}</style>
      <div>
        <div className="bg-grid"/><div className="orb1"/><div className="orb2"/>
        {toast && <div className={`toast ${toast.type === "err" ? "err" : ""}`}>{toast.msg}</div>}

        <div className="appw">
          <nav className="nav">
            <div className="nav-logo">DO<span>IT</span>NOW</div>
            <div className="nav-mid">
              <div className="pill">
                <span className={`pd ${gcalToken ? "g" : "a"}`}/>
                {gcalToken ? "Google Calendar Live" : "MCP Fallback Mode"}
              </div>
            </div>
            <button className="back" onClick={() => { setReady(false); setGcalToken(null); setTasks([]); }}>← Setup</button>
          </nav>

          <div className="layout">
            <div className="lp">
              {/* Input */}
              <div className="icard">
                <div className="ilabel"><span className="ilabel-icon">⚡</span>What are you avoiding right now?</div>
                <textarea className="itextarea" value={task}
                  onChange={e => setTask(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && e.ctrlKey && schedule()}
                  placeholder="Be specific. Vague tasks get ignored..."
                  rows={3}
                />
                <div className="ifooter">
                  <span className="ihint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> to schedule instantly</span>
                  <span className="ihint">{task.length} chars</span>
                </div>
              </div>

              {/* Controls */}
              <div className="cgrid">
                <div className="ccard">
                  <div className="clabel">Ping Interval</div>
                  <select className="csel" value={intv} onChange={e => setIntv(e.target.value)}>
                    <option value="45">Every 45 min</option>
                    <option value="60">Every 1 hour</option>
                    <option value="90">Every 1.5 hrs</option>
                    <option value="120">Every 2 hours</option>
                  </select>
                </div>
                <div className="ccard">
                  <div className="clabel">Active Window</div>
                  <select className="csel" value={dur} onChange={e => setDur(e.target.value)}>
                    <option value="4">Next 4 hours</option>
                    <option value="8">Next 8 hours</option>
                    <option value="12">Next 12 hours</option>
                    <option value="24">Full day (24h)</option>
                    <option value="48">Two days</option>
                  </select>
                </div>
              </div>

              <button className="sbtn" onClick={schedule} disabled={loading || !task.trim()}>
                {loading ? <><span className="spin"/>Scheduling...</> : "⚡ Schedule Reminders"}
              </button>

              {/* Task list */}
              <div className="tsec">
                <div className="sec-title">Active Reminders</div>
                {tasks.length === 0 ? (
                  <div className="empty">
                    <span className="empty-ico">📅</span>
                    <div className="empty-h">No active reminders</div>
                    <div className="empty-s">Type a task above and hit schedule</div>
                  </div>
                ) : tasks.map(t => {
                  const iC = cfmId === t.id, iX = clingId === t.id;
                  return (
                    <div key={t.id} className={`tcard ${iX ? "gone" : ""}`}>
                      <div className="tbar"/>
                      <div className="ttxt">{t.text}</div>
                      <button className={`xbtn ${iC ? "cfm" : ""} ${iX ? "cling" : ""}`}
                        onClick={() => clickX(t)} disabled={iX}>
                        {iX ? "..." : iC ? "Confirm?" : "Cancel"}
                      </button>
                      <div className="tchips">
                        <span className="chip g">✓ {t.events} events</span>
                        <span className="chip">{t.iL}</span>
                        <span className="chip">{t.from} → {t.to}</span>
                        <span className="chip">{t.dL}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right panel */}
            <div className="rp">
              <div className="sec-title">Dashboard</div>

              <div className="sgrid">
                <div className="scard"><div className="sval">{tasks.length}</div><div className="slbl">Active Tasks</div></div>
                <div className="scard"><div className="sval">{total}</div><div className="slbl">Reminders Set</div></div>
              </div>

              <div className="hcard">
                <div className="htitle">How it works</div>
                <div className="hrow"><div className="hnum">1</div><div className="htxt">Type what you've been <strong>putting off.</strong> Be brutally specific.</div></div>
                <div className="hrow"><div className="hnum">2</div><div className="htxt">Set your <strong>ping frequency</strong> and how long to stay active.</div></div>
                <div className="hrow"><div className="hnum">3</div><div className="htxt"><strong>Popup notifications</strong> fire on your phone every 1–2 hours.</div></div>
                <div className="hrow"><div className="hnum">4</div><div className="htxt">Done? Hit <strong>Cancel → Confirm</strong> to wipe all events.</div></div>
              </div>

              <div className="lcard">
                <div className="lhead"><span className="ldot"/>Activity Log</div>
                <div className="ltext">{log}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
