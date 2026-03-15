import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ── POST: ESP32 pushes sensor data ──
  if (req.method === "POST") {
    const data = req.body;
    await redis.set("sensor", JSON.stringify({ ...data, updatedAt: Date.now() }));
    return res.status(200).json({ ok: true });
  }

  // ── GET: Dashboard reads sensor data ──
  if (req.method === "GET") {
    const raw = await redis.get("sensor");
    if (!raw) return res.status(200).json({ ok: false, message: "No data yet" });
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: "Method not allowed" });
}