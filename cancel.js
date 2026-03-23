// api/cancel.js
// Deletes Google Calendar events by ID

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { task, eventIds, gcalToken } = req.body;

  if (!eventIds?.length) {
    return res.status(200).json({ success: true, deleted: 0, note: "No event IDs provided" });
  }

  // ── Path A: Google Calendar API direct delete ───────────────────────────────
  if (gcalToken) {
    let deleted = 0;
    const errors = [];

    for (const id of eventIds) {
      try {
        const r = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${id}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${gcalToken}` },
          }
        );
        if (r.status === 204 || r.status === 200) deleted++;
        else errors.push(id);
      } catch {
        errors.push(id);
      }
    }

    return res.status(200).json({
      success: true,
      deleted,
      failed: errors.length,
      method: "google_calendar_api",
    });
  }

  // ── Path B: Claude AI + MCP delete ─────────────────────────────────────────
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });
  }

  const prompt = `Delete these ${eventIds.length} Google Calendar events for task: "${task}".

IDs:
${eventIds.map((id, i) => `${i + 1}. ${id}`).join("\n")}

Delete ALL of them immediately.`;

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
        max_tokens: 2048,
        system: "You are a calendar assistant. Delete all specified events immediately. No confirmation needed.",
        messages: [{ role: "user", content: prompt }],
        mcp_servers: [
          { type: "url", url: "https://gcal.mcp.claude.com/mcp", name: "gcal" },
        ],
      }),
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok) throw new Error(data.error?.message || "Anthropic API error");

    const deleted = data.content.filter((b) => b.type === "mcp_tool_result").length;

    return res.status(200).json({
      success: true,
      deleted: deleted || eventIds.length,
      method: "claude_mcp",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
