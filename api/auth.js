module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) return res.status(500).json({ ok: false, error: "ADMIN_PASSWORD not set" });
    if (password === adminPassword) return res.status(200).json({ ok: true, role: "admin" });
    return res.status(401).json({ ok: false, error: "Wrong password" });
  }

  return res.status(405).json({ error: "Method not allowed" });
};