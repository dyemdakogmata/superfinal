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

  // ── ESP32: POST sensor data, GET back any pending command ──
  if (req.method === "POST") {
    const data = await req.json();

    // Read pending command + save sensor data in parallel
    const [cmd] = await Promise.all([
      redis.get("command"),
      redis.set("sensor", JSON.stringify({ ...data, updatedAt: Date.now() })),
    ]);

    let response = { ok: true, pending: false };

    if (cmd) {
      const cmdObj = typeof cmd === "string" ? JSON.parse(cmd) : cmd;
      if (!cmdObj.done) {
        // Mark done + return command atomically
        cmdObj.done = true;
        await redis.set("command", JSON.stringify(cmdObj));
        response = { ok: true, pending: true, ...cmdObj };
      }
    }

    return new Response(JSON.stringify(response), { status: 200, headers });
  }

  // ── Dashboard: GET latest sensor data ──
  if (req.method === "GET") {
    const raw = await redis.get("sensor");
    if (!raw) {
      return new Response(JSON.stringify({ ok: false, message: "No data yet" }), { status: 200, headers });
    }
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    return new Response(JSON.stringify(data), { status: 200, headers });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
}