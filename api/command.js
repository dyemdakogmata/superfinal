import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ── POST: Dashboard sends a command ──
  // Body: { type: "fan"|"heater"|"turner", ...params }
  if (req.method === "POST") {
    const cmd = { ...req.body, sentAt: Date.now(), done: false };
    await redis.set("command", JSON.stringify(cmd));
    return res.status(200).json({ ok: true });
  }

  // ── GET: ESP32 polls for pending command ──
  if (req.method === "GET") {
    const raw = await redis.get("command");
    if (!raw) return res.status(200).json({ pending: false });
    const cmd = typeof raw === "string" ? JSON.parse(raw) : raw;

    // Only return if not yet executed
    if (cmd.done) return res.status(200).json({ pending: false });

    // Mark as done so ESP32 doesn't repeat it
    cmd.done = true;
    await redis.set("command", JSON.stringify(cmd));

    return res.status(200).json({ pending: true, ...cmd });
  }

  return res.status(405).json({ error: "Method not allowed" });
}