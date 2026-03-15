import { getRedis } from "./_redis.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const redis = await getRedis();

  if (req.method === "POST") {
    const cmd = { ...req.body, sentAt: Date.now(), done: false };
    await redis.set("command", JSON.stringify(cmd));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}