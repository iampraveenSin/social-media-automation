/**
 * Run this script with: npm run worker
 * Requires Redis (REDIS_URL or default localhost:6379).
 * Loads .env.local so META_*, NEXT_PUBLIC_APP_URL, etc. are available.
 */
import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

import { startWorker } from "../lib/queue";

startWorker();
console.log("Queue worker started. Waiting for scheduled jobs...");
