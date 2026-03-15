import { getRedis } from "./_redis.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const redis = await getRedis();

  if (req.method === "POST") {
    const data = req.body;
    const [cmdRaw] = await Promise.all([
      redis.get("command"),
      redis.set("sensor", JSON.stringify({ ...data, updatedAt: Date.now() })),
    ]);

    let response = { ok: true, pending: false };
    if (cmdRaw) {
      const cmd = JSON.parse(cmdRaw);
      if (!cmd.done) {
        cmd.done = true;
        await redis.set("command", JSON.stringify(cmd));
        response = { ok: true, pending: true, ...cmd };
      }
    }
    return res.status(200).json(response);
  }

  if (req.method === "GET") {
    const raw = await redis.get("sensor");
    if (!raw) return res.status(200).json({ ok: false, message: "No data yet" });
    return res.status(200).json(JSON.parse(raw));
  }

  return res.status(405).json({ error: "Method not allowed" });
}