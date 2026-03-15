import { createClient } from "redis";

let client = null;

export async function getRedis() {
  if (client && client.isOpen) return client;
  client = createClient({
    socket: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    },
    password: process.env.REDIS_PASSWORD,
  });
  client.on("error", (e) => console.error("Redis error:", e));
  await client.connect();
  return client;
}