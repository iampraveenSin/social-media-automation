/**
 * Run this script with: npm run worker
 * Requires REDIS_URL (same as the app). Run on an always-on machine.
 * Loads .env.local / .env so REDIS_URL, SUPABASE_*, META_*, etc. are available.
 */
import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const redisUrl = process.env.REDIS_URL?.trim();
if (!redisUrl) {
  console.error(
    "[worker] REDIS_URL is required. Set REDIS_URL in .env or .env.local (same URL as the app)."
  );
  process.exit(1);
}

import { startWorker } from "../lib/queue";
import { processRecurrence } from "../lib/recurrence";

startWorker();
console.log("[worker] Queue worker started. Waiting for scheduled jobs...");

const RECURRENCE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
setInterval(() => {
  processRecurrence().catch((err) => console.error("[worker] Recurrence run error:", err));
}, RECURRENCE_INTERVAL_MS);
setTimeout(() => {
  processRecurrence().catch((err) => console.error("[worker] Recurrence run error:", err));
}, 30_000);
console.log("[worker] Recurring posts check every 10 minutes.");
