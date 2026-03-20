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

const MAX_EVENTS = 500;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const redis = await getRedis();

  // ESP32 POSTs a turner event
  if (req.method === "POST") {
    const { state, mode } = req.body;
    const now = Date.now();

    let events = [];
    const raw = await redis.get("events");
    if (raw) events = JSON.parse(raw);

    events.push({
      ts:    now,
      type:  "turner",
      state: state,   // "ON" or "OFF"
      mode:  mode,    // "auto" or "manual"
    });

    if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);
    await redis.set("events", JSON.stringify(events));
    return res.status(200).json({ ok: true, total: events.length });
  }

  // Dashboard GETs events
  if (req.method === "GET") {
    let events = [];
    const raw = await redis.get("events");
    if (raw) events = JSON.parse(raw);
    const limit = req.query.limit;
    const data  = limit === "all" ? events : events.slice(-20);
    return res.status(200).json({ ok: true, count: events.length, data });
  }

  return res.status(405).json({ error: "Method not allowed" });
};