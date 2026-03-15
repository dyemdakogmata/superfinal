import { Redis } from "@upstash/redis";

export const config = { runtime: "edge" };

const redis = Redis.fromEnv();
const HISTORY_KEY  = "history";
const INTERVAL_MS  = 15 * 60 * 1000; // 15 minutes
const MAX_STORED   = 2000;            // keep up to 2000 points (~20 days)

export default async function handler(req) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers });

  // ── POST: ESP32 pushes a new datapoint ──
  if (req.method === "POST") {
    const body = await req.json();
    const now  = Date.now();

    // Load existing history
    let history = [];
    try {
      const raw = await redis.get(HISTORY_KEY);
      if (raw) history = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (_) {}

    // Only store if 15 min have passed since last entry
    const last = history[history.length - 1];
    if (last && now - last.ts < INTERVAL_MS) {
      return new Response(JSON.stringify({ ok: true, stored: false, next: Math.ceil((last.ts + INTERVAL_MS - now) / 1000) }), { status: 200, headers });
    }

    // Append new point
    history.push({
      ts:   now,
      temp: Math.round(body.temperature * 100) / 100,
      hum:  Math.round(body.humidity * 100) / 100,
    });

    // Trim to MAX_STORED
    if (history.length > MAX_STORED) history = history.slice(-MAX_STORED);

    await redis.set(HISTORY_KEY, JSON.stringify(history));
    return new Response(JSON.stringify({ ok: true, stored: true, total: history.length }), { status: 200, headers });
  }

  // ── GET: Dashboard reads history ──
  // ?limit=20  → last 20 points (for log table)
  // ?limit=all → full history (for full history page)
  if (req.method === "GET") {
    let history = [];
    try {
      const raw = await redis.get(HISTORY_KEY);
      if (raw) history = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (_) {}

    const url    = new URL(req.url);
    const limit  = url.searchParams.get("limit");

    const data = limit === "all" ? history : history.slice(-20);
    return new Response(JSON.stringify({ ok: true, count: history.length, data }), { status: 200, headers });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
}