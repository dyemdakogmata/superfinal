export const config = { runtime: "edge" };

export default async function handler(req) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers });

  if (req.method === "POST") {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return new Response(JSON.stringify({ ok: false, error: "ADMIN_PASSWORD not set in Vercel env vars" }), { status: 500, headers });
    }

    if (password === adminPassword) {
      return new Response(JSON.stringify({ ok: true, role: "admin" }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ ok: false, error: "Wrong password" }), { status: 401, headers });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
}