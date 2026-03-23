// api/schedule.js
// Vercel serverless function — proxies Anthropic API + Google Calendar
// Your ANTHROPIC_API_KEY lives here on the server, never exposed to the browser.

export default async function handler(req, res) {
  // CORS headers so your frontend can call this
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { task, slots, gcalToken } = req.body;

  if (!task || !slots?.length) {
    return res.status(400).json({ error: "Missing task or slots" });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in environment variables" });
  }

  // ── Path A: Google Calendar API (if user passed their OAuth token) ──────────
  if (gcalToken) {
    try {
      const eventIds = [];
      for (const slot of slots) {
        const start = new Date(slot);
        const end = new Date(start.getTime() + 5 * 60 * 1000); // 5-min event

        const body = {
          summary: `⚡ REMINDER: ${task.slice(0, 50)}`,
          description: `Anti-procrastination reminder. Stop scrolling. Do the thing: ${task}`,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          reminders: {
            useDefault: false,
            overrides: [{ method: "popup", minutes: 0 }],
          },
        };

        const gcalRes = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${gcalToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );

        const gcalData = await gcalRes.json();
        if (gcalData.id) eventIds.push(gcalData.id);
      }

      return res.status(200).json({
        success: true,
        eventsCreated: eventIds.length,
        eventIds,
        method: "google_calendar_api",
      });
    } catch (err) {
      return res.status(500).json({ error: `Google Calendar error: ${err.message}` });
    }
  }

  // ── Path B: Claude AI + Google Calendar MCP (fallback) ─────────────────────
  const slotsDesc = slots.map((s, i) => `Event ${i + 1}: ${new Date(s).toISOString()}`).join("\n");

  const prompt = `Create ${slots.length} Google Calendar reminder events for this anti-procrastination task: "${task}"

Schedule them at these exact times:
${slotsDesc}

For each event:
- Title: "⚡ REMINDER: ${task.slice(0, 40)}"
- Duration: 5 minutes
- Add a popup notification 0 minutes before
- Add a brief motivational description

Create ALL ${slots.length} events now. Return each event's ID.`;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system:
          "You are a productivity assistant. Create all calendar events immediately using Google Calendar tools. No confirmation needed.",
        messages: [{ role: "user", content: prompt }],
        mcp_servers: [
          { type: "url", url: "https://gcal.mcp.claude.com/mcp", name: "gcal" },
        ],
      }),
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok) throw new Error(data.error?.message || "Anthropic API error");

    // Extract event IDs from MCP tool results
    const eventIds = [];
    for (const block of data.content) {
      if (block.type === "mcp_tool_result") {
        const text = Array.isArray(block.content)
          ? block.content.map((c) => (typeof c === "string" ? c : c?.text || "")).join(" ")
          : String(block.content || "");
        try {
          const parsed = JSON.parse(text);
          if (parsed?.id) eventIds.push(parsed.id);
          if (parsed?.event?.id) eventIds.push(parsed.event.id);
        } catch {
          const matches = text.match(/"id"\s*:\s*"([^"]+)"/g) || [];
          matches.forEach((m) => {
            const id = m.match(/"id"\s*:\s*"([^"]+)"/)?.[1];
            if (id) eventIds.push(id);
          });
        }
      }
    }

    const textLog = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .slice(0, 300);

    return res.status(200).json({
      success: true,
      eventsCreated: slots.length,
      eventIds: [...new Set(eventIds)],
      log: textLog,
      method: "claude_mcp",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
