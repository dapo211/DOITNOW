import { useState, useEffect, useRef } from "react";

// ─── Config ──────────────────────────────────────────────────────────────────
// Google OAuth Client ID from your .env (VITE_GOOGLE_CLIENT_ID)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";

// ─── Styles ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0a0a", surface: "#111111", border: "#1e1e1e",
  accent: "#ff3c3c", accentDim: "#7a1a1a", accentGlow: "rgba(255,60,60,0.15)",
  text: "#f0f0f0", muted: "#555", success: "#1ecc6e", warn: "#f5a623",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${C.bg}}
  .app{min-height:100vh;background:${C.bg};font-family:'Space Mono',monospace;color:${C.text};position:relative;overflow-x:hidden}
  .scanline{pointer-events:none;position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px);z-index:9999}

  /* ── Setup Screen ── */
  .setup{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .setup-card{border:1px solid ${C.border};padding:40px;max-width:480px;width:100%;position:relative}
  .setup-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:${C.accent}}
  .setup-title{font-family:'Bebas Neue',sans-serif;font-size:40px;letter-spacing:4px;margin-bottom:6px}
  .setup-title span{color:${C.accent}}
  .setup-sub{font-size:11px;color:${C.muted};letter-spacing:2px;text-transform:uppercase;margin-bottom:32px}
  .setup-step{margin-bottom:24px}
  .setup-step-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};margin-bottom:8px;display:flex;align-items:center;gap:8px}
  .setup-step-num{color:${C.accent};font-weight:700}
  .setup-note{font-size:11px;color:#2a2a2a;margin-top:6px;line-height:1.6}
  .setup-note a{color:${C.muted};text-decoration:underline}
  .connect-btn{width:100%;background:transparent;border:1px solid ${C.success};color:${C.success};font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:3px;padding:14px;cursor:pointer;transition:all 0.2s;margin-top:8px}
  .connect-btn:hover{background:rgba(30,204,110,0.08);box-shadow:0 0 16px rgba(30,204,110,0.15)}
  .connect-btn.connected{border-color:${C.success};color:${C.success};cursor:default;opacity:0.7}
  .connect-btn.skipped{border-color:${C.border};color:${C.muted}}
  .proceed-btn{width:100%;background:${C.accent};color:#fff;font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:4px;padding:18px;border:none;cursor:pointer;transition:all 0.15s;margin-top:24px}
  .proceed-btn:hover{background:#ff5555;box-shadow:0 0 24px ${C.accentGlow}}
  .proceed-btn:disabled{opacity:0.3;cursor:not-allowed}

  /* ── Main App ── */
  .header{border-bottom:1px solid ${C.border};padding:20px 32px;display:flex;align-items:center;justify-content:space-between;position:relative}
  .header::after{content:'';position:absolute;bottom:-1px;left:0;width:120px;height:1px;background:${C.accent}}
  .logo{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:4px;line-height:1}
  .logo span{color:${C.accent}}
  .header-right{display:flex;align-items:center;gap:16px}
  .status-label{font-size:10px;color:${C.muted};letter-spacing:2px;text-transform:uppercase;display:flex;align-items:center;gap:6px}
  .dot{width:7px;height:7px;border-radius:50%;display:inline-block}
  .dot.green{background:${C.success};box-shadow:0 0 6px ${C.success};animation:pulse 2s infinite}
  .dot.yellow{background:${C.warn}}
  .dot.red{background:${C.accent}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
  .signout-btn{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#333;background:none;border:1px solid #1a1a1a;padding:4px 10px;cursor:pointer;font-family:'Space Mono',monospace;transition:all 0.2s}
  .signout-btn:hover{color:${C.muted};border-color:${C.border}}

  .main{display:grid;grid-template-columns:1fr 360px;min-height:calc(100vh - 65px)}
  .left-panel{padding:28px 32px;border-right:1px solid ${C.border}}
  .right-panel{padding:28px 24px;background:${C.surface}}

  .section-label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${C.muted};margin-bottom:18px;display:flex;align-items:center;gap:8px}
  .section-label::after{content:'';flex:1;height:1px;background:${C.border}}

  .input-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};margin-bottom:7px;display:block}
  .task-input{width:100%;background:transparent;border:1px solid ${C.border};color:${C.text};font-family:'Space Mono',monospace;font-size:13px;padding:12px 14px;outline:none;resize:vertical;min-height:76px;transition:border-color 0.2s;line-height:1.6;margin-bottom:16px}
  .task-input:focus{border-color:${C.accent};box-shadow:inset 0 0 0 1px ${C.accentDim}}
  .task-input::placeholder{color:#282828}

  .controls-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
  .select-wrap{position:relative}
  .styled-select{width:100%;background:transparent;border:1px solid ${C.border};color:${C.text};font-family:'Space Mono',monospace;font-size:11px;padding:11px 12px;outline:none;appearance:none;cursor:pointer;transition:border-color 0.2s}
  .styled-select:focus{border-color:${C.accent}}
  .styled-select option{background:#111}
  .sel-arrow{position:absolute;right:10px;top:50%;transform:translateY(-50%);color:${C.muted};pointer-events:none;font-size:9px}

  .schedule-btn{width:100%;background:${C.accent};color:#fff;font-family:'Bebas Neue',sans-serif;font-size:21px;letter-spacing:4px;padding:15px;border:none;cursor:pointer;transition:all 0.15s;position:relative;overflow:hidden}
  .schedule-btn:hover:not(:disabled){background:#ff5555;box-shadow:0 0 24px ${C.accentGlow}}
  .schedule-btn:disabled{opacity:0.4;cursor:not-allowed}
  .loading-bar{position:absolute;bottom:0;left:0;height:3px;background:rgba(255,255,255,0.4);animation:loadbar 1.5s infinite}
  @keyframes loadbar{0%{width:0}100%{width:100%}}

  .tasks-list{display:flex;flex-direction:column;gap:10px;margin-top:28px}
  .task-card{border:1px solid ${C.border};padding:14px;position:relative;animation:slideIn 0.3s ease;transition:border-color 0.2s}
  .task-card:hover{border-color:#222}
  .task-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:${C.accent}}
  .task-card.success::before{background:${C.success}}
  .task-card.cancelling-card{opacity:0.4;pointer-events:none}
  .task-card.cancelling-card::before{background:${C.muted}}
  @keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}

  .task-card-text{font-size:12px;line-height:1.5;margin-bottom:9px;color:${C.text};padding-right:64px}
  .task-meta{display:flex;gap:8px;flex-wrap:wrap}
  .tag{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;padding:2px 7px;border:1px solid ${C.border};color:${C.muted}}
  .tag.success{border-color:${C.success};color:${C.success}}

  .delete-btn{position:absolute;top:10px;right:10px;background:none;border:1px solid transparent;color:#2a2a2a;cursor:pointer;font-size:10px;padding:3px 8px;transition:all 0.2s;font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:1px}
  .delete-btn:hover:not(:disabled){color:${C.accent};border-color:${C.accentDim}}
  .delete-btn.confirming{color:${C.warn};border-color:${C.warn};background:rgba(245,166,35,0.07);animation:confirmPulse 0.8s infinite alternate}
  @keyframes confirmPulse{from{opacity:1}to{opacity:0.5}}
  .delete-btn.cancelling{color:${C.muted};cursor:not-allowed}

  .empty-state{text-align:center;padding:44px 0;color:#222;font-size:11px;letter-spacing:2px;text-transform:uppercase}
  .empty-icon{font-size:36px;display:block;margin-bottom:14px;filter:grayscale(1) opacity(0.1)}

  .stat-row{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:${C.border};margin-bottom:28px}
  .stat-cell{background:${C.surface};padding:14px;text-align:center}
  .stat-value{font-family:'Bebas Neue',sans-serif;font-size:34px;color:${C.accent};line-height:1;margin-bottom:3px}
  .stat-name{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:${C.muted}}

  .info-box{border:1px solid ${C.border};padding:14px;margin-bottom:22px;font-size:10px;line-height:1.7;color:${C.muted};position:relative}
  .info-box::before{content:'HOW IT WORKS';position:absolute;top:-7px;left:10px;background:${C.surface};padding:0 6px;font-size:8px;letter-spacing:2px;color:#2a2a2a}
  .info-step{display:flex;gap:8px;margin-bottom:5px}
  .info-step-num{color:${C.accent};font-weight:700;flex-shrink:0}

  .log-area{font-size:10px;color:#2a2a2a;line-height:1.8;min-height:50px;font-family:'Space Mono',monospace;white-space:pre-wrap;word-break:break-all}

  .toast{position:fixed;bottom:28px;right:28px;padding:12px 18px;border-left:3px solid ${C.success};background:#0f1f14;font-size:11px;letter-spacing:1px;animation:toastIn 0.3s ease;z-index:10000;max-width:300px}
  .toast.error{border-color:${C.accent};background:#1a0a0a;color:#ff9999}
  @keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

  @media(max-width:768px){
    .main{grid-template-columns:1fr}
    .right-panel{border-top:1px solid ${C.border}}
    .header,.left-panel,.right-panel{padding:18px 20px}
  }
`;

// ─── Google OAuth helper ──────────────────────────────────────────────────────
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
      callback: (resp) => {
        if (resp.error) return reject(new Error(resp.error));
        resolve(resp.access_token);
      },
    });
    client.requestAccessToken();
  });
}

// ─── API calls (to your Vercel serverless functions) ─────────────────────────
function buildSlots(intervalMinutes, durationHours) {
  const now = Date.now();
  const slots = [];
  let cursor = now + intervalMinutes * 60 * 1000;
  const end = now + durationHours * 60 * 60 * 1000;
  while (cursor <= end) {
    slots.push(cursor);
    const jitter = Math.floor(Math.random() * 30) * 60 * 1000;
    cursor += intervalMinutes * 60 * 1000 + jitter;
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
  const last  = new Date(slots[slots.length - 1]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return { ...data, firstSlot: first, lastSlot: last };
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

// ─── Setup Screen ─────────────────────────────────────────────────────────────
function SetupScreen({ onComplete }) {
  const [gcalStatus, setGcalStatus] = useState("idle"); // idle | connected | skipped
  const [gcalToken, setGcalToken] = useState("");
  const hasClientId = !!GOOGLE_CLIENT_ID;

  const handleGoogleConnect = async () => {
    if (!hasClientId) {
      setGcalStatus("skipped");
      return;
    }
    try {
      const token = await getGoogleToken(GOOGLE_CLIENT_ID);
      setGcalToken(token);
      setGcalStatus("connected");
    } catch (err) {
      alert("Google sign-in failed: " + err.message);
    }
  };

  const canProceed = gcalStatus !== "idle";

  return (
    <div className="setup">
      <div className="setup-card">
        <div className="setup-title">DO<span>IT</span>NOW</div>
        <div className="setup-sub">Anti-Procrastination Setup</div>

        <div className="setup-step">
          <div className="setup-step-label">
            <span className="setup-step-num">01</span> Connect Google Calendar
          </div>
          <button
            className={`connect-btn ${gcalStatus === "connected" ? "connected" : gcalStatus === "skipped" ? "skipped" : ""}`}
            onClick={handleGoogleConnect}
            disabled={gcalStatus === "connected"}
          >
            {gcalStatus === "connected"
              ? "✓ GOOGLE CALENDAR CONNECTED"
              : gcalStatus === "skipped"
              ? "SKIPPED (Claude MCP fallback)"
              : "CONNECT GOOGLE CALENDAR"}
          </button>
          {!hasClientId && gcalStatus === "idle" && (
            <p className="setup-note">
              No <code>VITE_GOOGLE_CLIENT_ID</code> set → will use Claude MCP fallback.<br />
              <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer">Get one from Google Cloud Console</a> for direct calendar access.
            </p>
          )}
          {gcalStatus === "connected" && (
            <p className="setup-note" style={{ color: C.success }}>
              ✓ Calendar events will be created & deleted directly via Google Calendar API.
            </p>
          )}
          {gcalStatus === "idle" && hasClientId && (
            <p className="setup-note">Sign in with Google to allow reading & writing your calendar.</p>
          )}
        </div>

        <div className="setup-step">
          <div className="setup-step-label">
            <span className="setup-step-num">02</span> Backend ready
          </div>
          <p className="setup-note">
            Your <code>ANTHROPIC_API_KEY</code> lives in Vercel environment variables — never exposed to the browser.
            The <code>/api/schedule</code> and <code>/api/cancel</code> serverless functions handle all API calls.
          </p>
        </div>

        <button
          className="proceed-btn"
          onClick={() => onComplete(gcalToken || null)}
          disabled={!canProceed}
        >
          {canProceed ? "LAUNCH APP →" : "CONNECT GOOGLE CALENDAR FIRST"}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [ready, setReady] = useState(false);
  const [gcalToken, setGcalToken] = useState(null);

  const [task, setTask] = useState("");
  const [interval, setIntervalVal] = useState("60");
  const [duration, setDuration] = useState("8");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [toast, setToast] = useState(null);
  const [log, setLog] = useState("// Ready. Add a task to begin.");
  const [confirmingId, setConfirmingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const confirmTimers = useRef({});

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSchedule = async () => {
    if (!task.trim()) return showToast("Enter a task first.", "error");
    setLoading(true);
    setLog("// Scheduling on Google Calendar...");
    try {
      const intervalMinutes = parseInt(interval);
      const durationHours = parseInt(duration);
      const result = await apiSchedule({ task: task.trim(), intervalMinutes, durationHours, gcalToken });

      if (result.success) {
        setTasks(prev => [{
          id: Date.now(),
          text: task.trim(),
          interval: `Every ~${intervalMinutes >= 60 ? intervalMinutes / 60 + "h" : intervalMinutes + "m"}`,
          duration: `${durationHours}h window`,
          events: result.eventsCreated,
          eventIds: result.eventIds || [],
          from: result.firstSlot,
          to: result.lastSlot,
          status: "scheduled",
        }, ...prev]);
        setTask("");
        const idNote = result.eventIds?.length
          ? `// ${result.eventIds.length} event IDs captured\n`
          : `// ⚠ No IDs captured — cancel removes from app only\n`;
        setLog(`// ✓ ${result.eventsCreated} events created [${result.method}]\n// ${result.firstSlot} → ${result.lastSlot}\n${idNote}`);
        showToast(`✓ ${result.eventsCreated} reminders scheduled`);
      } else {
        setLog(`// ERROR: ${result.error}`);
        showToast(result.error, "error");
      }
    } catch (err) {
      setLog(`// ERROR: ${err.message}`);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (t) => {
    if (cancellingId === t.id) return;
    if (confirmingId === t.id) {
      clearTimeout(confirmTimers.current[t.id]);
      setConfirmingId(null);
      executeCancel(t);
    } else {
      setConfirmingId(t.id);
      confirmTimers.current[t.id] = setTimeout(() => {
        setConfirmingId(prev => prev === t.id ? null : prev);
      }, 3000);
    }
  };

  const executeCancel = async (t) => {
    setCancellingId(t.id);
    setLog(`// Cancelling ${t.events} events for "${t.text.slice(0, 28)}..."...`);
    try {
      const result = await apiCancel({ task: t.text, eventIds: t.eventIds, gcalToken });
      setTasks(prev => prev.filter(x => x.id !== t.id));
      const note = result.note ? `\n// ${result.note}` : "";
      setLog(`// ✓ Cancelled ${result.deleted} events [${result.method || "app"}]${note}`);
      showToast(`✓ ${result.deleted} reminders removed from calendar`);
    } catch (err) {
      setLog(`// ERROR during cancel: ${err.message}`);
      showToast(`Cancel failed: ${err.message}`, "error");
    } finally {
      setCancellingId(null);
    }
  };

  const scheduledTotal = tasks.reduce((acc, t) => acc + (t.events || 0), 0);
  const calStatus = gcalToken ? "green" : "yellow";
  const calLabel = gcalToken ? "Google Calendar Connected" : "MCP Fallback Mode";

  if (!ready) {
    return (
      <>
        <style>{css}</style>
        <div className="app">
          <div className="scanline" />
          <SetupScreen onComplete={(token) => { setGcalToken(token); setReady(true); }} />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="scanline" />
        {toast && <div className={`toast ${toast.type === "error" ? "error" : ""}`}>{toast.msg}</div>}

        <div className="header">
          <div className="logo">DO<span>IT</span>NOW</div>
          <div className="header-right">
            <div className="status-label">
              <span className={`dot ${calStatus}`} />
              {calLabel}
            </div>
            <button className="signout-btn" onClick={() => { setReady(false); setGcalToken(null); setTasks([]); }}>
              ⟵ setup
            </button>
          </div>
        </div>

        <div className="main">
          <div className="left-panel">
            <div className="section-label">New Reminder</div>

            <label className="input-label">What do you keep avoiding?</label>
            <textarea
              className="task-input"
              value={task}
              onChange={e => setTask(e.target.value)}
              placeholder="e.g. Work on my grad school application..."
              onKeyDown={e => e.key === "Enter" && e.ctrlKey && handleSchedule()}
            />

            <div className="controls-row">
              <div>
                <label className="input-label">Ping Interval</label>
                <div className="select-wrap">
                  <select className="styled-select" value={interval} onChange={e => setIntervalVal(e.target.value)}>
                    <option value="45">Every 45 mins</option>
                    <option value="60">Every 1 hour</option>
                    <option value="90">Every 1.5 hours</option>
                    <option value="120">Every 2 hours</option>
                  </select>
                  <span className="sel-arrow">▾</span>
                </div>
              </div>
              <div>
                <label className="input-label">Schedule Window</label>
                <div className="select-wrap">
                  <select className="styled-select" value={duration} onChange={e => setDuration(e.target.value)}>
                    <option value="4">Next 4 hours</option>
                    <option value="8">Next 8 hours</option>
                    <option value="12">Next 12 hours</option>
                    <option value="24">Today (24h)</option>
                    <option value="48">Next 2 days</option>
                  </select>
                  <span className="sel-arrow">▾</span>
                </div>
              </div>
            </div>

            <button className="schedule-btn" onClick={handleSchedule} disabled={loading || !task.trim()}>
              {loading ? "SCHEDULING..." : "⚡ SCHEDULE IT"}
              {loading && <div className="loading-bar" />}
            </button>

            <div className="tasks-list">
              {tasks.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📅</span>
                  No reminders yet. Add one above.
                </div>
              ) : tasks.map(t => {
                const isConfirming = confirmingId === t.id;
                const isCancelling = cancellingId === t.id;
                return (
                  <div key={t.id} className={`task-card ${t.status === "scheduled" ? "success" : ""} ${isCancelling ? "cancelling-card" : ""}`}>
                    <div className="task-card-text">{t.text}</div>
                    <button
                      className={`delete-btn ${isConfirming ? "confirming" : ""} ${isCancelling ? "cancelling" : ""}`}
                      onClick={() => handleDeleteClick(t)}
                      disabled={isCancelling}
                      title={isConfirming ? "Click again to confirm" : "Cancel all calendar events"}
                    >
                      {isCancelling ? "..." : isConfirming ? "confirm?" : "cancel"}
                    </button>
                    <div className="task-meta">
                      <span className="tag success">✓ {t.events} events</span>
                      <span className="tag">{t.interval}</span>
                      <span className="tag">{t.from} → {t.to}</span>
                      <span className="tag">{t.duration}</span>
                      {t.eventIds?.length > 0 && (
                        <span className="tag" style={{ borderColor: "#1a3a2a", color: "#2a5a3a" }}>
                          {t.eventIds.length} IDs
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="right-panel">
            <div className="section-label">Stats</div>
            <div className="stat-row">
              <div className="stat-cell">
                <div className="stat-value">{tasks.length}</div>
                <div className="stat-name">Tasks Active</div>
              </div>
              <div className="stat-cell">
                <div className="stat-value">{scheduledTotal}</div>
                <div className="stat-name">Events Scheduled</div>
              </div>
            </div>

            <div className="info-box">
              <div className="info-step"><span className="info-step-num">01</span><span>Type the thing you keep avoiding.</span></div>
              <div className="info-step"><span className="info-step-num">02</span><span>Pick interval & window. Hit schedule.</span></div>
              <div className="info-step"><span className="info-step-num">03</span><span>Calendar events fire with popup notifications every 1–2h.</span></div>
              <div className="info-step"><span className="info-step-num">04</span><span>Done early? Hit <strong style={{color:C.muted}}>cancel → confirm</strong> to delete all events.</span></div>
            </div>

            <div className="section-label">Activity Log</div>
            <div className="log-area">{log}</div>
          </div>
        </div>
      </div>
    </>
  );
}
