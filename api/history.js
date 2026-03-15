const { createClient } = require("redis");

let client = null;
async function getRedis() {
  if (client && client.isOpen) return client;
  client = createClient({
    socket: { host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT) },
    password: process.env.REDIS_PASSWORD,
  });
  await client.connect();
  return client;
}

const INTERVAL_MS = 15 * 60 * 1000;
const MAX_STORED  = 2000;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const redis = await getRedis();

  if (req.method === "POST") {
    const body = req.body;
    const now  = Date.now();
    let history = [];
    const raw = await redis.get("history");
    if (raw) history = JSON.parse(raw);
    const last = history[history.length - 1];
    if (last && now - last.ts < INTERVAL_MS) {
      return res.status(200).json({ ok: true, stored: false, next: Math.ceil((last.ts + INTERVAL_MS - now) / 1000) });
    }
    history.push({ ts: now, temp: Math.round(body.temperature * 100) / 100, hum: Math.round(body.humidity * 100) / 100 });
    if (history.length > MAX_STORED) history = history.slice(-MAX_STORED);
    await redis.set("history", JSON.stringify(history));
    return res.status(200).json({ ok: true, stored: true, total: history.length });
  }

  if (req.method === "GET") {
    let history = [];
    const raw = await redis.get("history");
    if (raw) history = JSON.parse(raw);
    const limit = req.query.limit;
    const data  = limit === "all" ? history : history.slice(-20);
    return res.status(200).json({ ok: true, count: history.length, data });
  }

  return res.status(405).json({ error: "Method not allowed" });
};