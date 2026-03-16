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

const DEFAULTS = {
  minTemp: 36.5,
  maxTemp: 37.5,
  turnsPerDay: 3,
  turnDurationHours: 1.0,
  firstTurnMinutes: 360,
  fanState: 0,
  heaterManual: 0,
  turnerManual: 0,
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const redis = await getRedis();

  // ESP32 GETs settings on boot
  if (req.method === "GET") {
    const raw = await redis.get("settings");
    const settings = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    return res.status(200).json({ ok: true, settings });
  }

  // ESP32 POSTs settings whenever they change
  if (req.method === "POST") {
    const body = req.body;
    const raw  = await redis.get("settings");
    const current = raw ? JSON.parse(raw) : {};
    const merged  = { ...DEFAULTS, ...current, ...body };
    await redis.set("settings", JSON.stringify(merged));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
};