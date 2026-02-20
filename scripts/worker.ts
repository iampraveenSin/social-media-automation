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

startWorker();
console.log("[worker] Queue worker started. Waiting for scheduled jobs...");
