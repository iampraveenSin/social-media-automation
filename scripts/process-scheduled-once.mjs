/**
 * Runs the scheduled-post queue once (same work as production cron).
 * Use while `npm run dev` is running: `npm run cron:once`
 *
 * Requires in .env.local: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

const secret = process.env.CRON_SECRET?.trim();
if (!secret) {
  console.error(
    "Missing CRON_SECRET. Add it to .env.local (same value your host uses for the scheduler).",
  );
  process.exit(1);
}

const base = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");
const url = `${base}/api/cron/process-scheduled`;

const res = await fetch(url, {
  headers: { Authorization: `Bearer ${secret}` },
});

const body = await res.text();
console.log(res.status, body);
if (!res.ok) {
  try {
    const j = JSON.parse(body);
    if (j.hint) console.error("\nHint:", j.hint);
  } catch {
    /* plain text body */
  }
  process.exit(1);
}
