import { Redis } from "@upstash/redis";

export const config = { runtime: "edge" };

const redis = Redis.fromEnv();

export default async function handler(req) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  // ── Dashboard POSTs a command ──
  if (req.method === "POST") {
    const body = await req.json();
    const cmd = { ...body, sentAt: Date.now(), done: false };
    await redis.set("command", JSON.stringify(cmd));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
}