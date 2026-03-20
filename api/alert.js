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

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { type } = req.body;
  const redis = await getRedis();

  // Debounce — only send alert once every 5 minutes
  const lastKey = `alert_last_${type}`;
  const last = await redis.get(lastKey);
  if (last && Date.now() - parseInt(last) < 5 * 60 * 1000) {
    return res.status(200).json({ ok: true, skipped: true, reason: "debounced" });
  }
  await redis.set(lastKey, Date.now().toString());

  const TOKEN   = process.env.TELEGRAM_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TOKEN || !CHAT_ID) {
    return res.status(200).json({ ok: false, error: "TELEGRAM_TOKEN or TELEGRAM_CHAT_ID not set" });
  }

  const isOffline = type === "offline";
  const time = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });

  const message = isOffline
    ? `🔴 *Incubator OFFLINE*\n\nYour egg incubator lost connection at *${time}*.\n\nThe heater and turner may not be functioning. Please check the device.\n\n[Open Dashboard](https://superfinal-sandy.vercel.app)`
    : `🟢 *Incubator ONLINE*\n\nYour egg incubator is back online at *${time}*.\n\n[Open Dashboard](https://superfinal-sandy.vercel.app)`;

  const teleRes = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: false
    })
  });

  const teleData = await teleRes.json();
  if (!teleRes.ok) {
    return res.status(200).json({ ok: false, error: teleData });
  }

  return res.status(200).json({ ok: true, sent: true });
};