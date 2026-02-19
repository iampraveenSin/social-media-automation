import { createHmac, timingSafeEqual, scryptSync, randomBytes } from "crypto";

const COOKIE_NAME = "automate_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const SESSION_VERSION = 2;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    return "default-dev-secret-change-in-production";
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export interface SessionPayload {
  userId: string;
}

/** Create a session token for the given app user id (multi-tenant). */
export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({ t: Date.now(), v: SESSION_VERSION, userId });
  const b64 = Buffer.from(payload).toString("base64url");
  return `${b64}.${sign(b64)}`;
}

/** Use in API routes / Node. Full HMAC verify. */
export function verifySessionToken(token: string): boolean {
  return decodeSessionPayload(token) !== null;
}

/** Decode and verify session; returns payload with userId or null. */
export function decodeSessionPayload(token: string): SessionPayload | null {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;
    const expected = sign(b64);
    if (expected.length !== sig.length) return null;
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (payload.v !== SESSION_VERSION || !payload.t || !payload.userId) return null;
    const max = MAX_AGE * 1000;
    if (Date.now() - payload.t > max) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

/** Hash password for storage. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

/** Verify password against stored hash. */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, keyHex] = stored.split(":");
    if (!salt || !keyHex) return false;
    const key = scryptSync(password, salt, 64);
    return timingSafeEqual(key, Buffer.from(keyHex, "hex"));
  } catch {
    return false;
  }
}

/** Use in Edge (middleware). Only checks format; no crypto. */
export function sessionCookieFormatValid(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  return parts.length === 2 && parts[0].length > 0 && /^[a-f0-9]+$/i.test(parts[1]);
}

export function getSessionCookieHeader(value: string, secure = false): string {
  const securePart = secure ? "; Secure" : "";
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${securePart}`;
}

export function getClearSessionHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function getTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1].trim() : null;
}

/** Get current session payload from request (API routes). Returns null if not logged in or invalid. */
export function getSessionFromRequest(request: { headers: { get: (name: string) => string | null } }): SessionPayload | null {
  const cookie = request.headers.get("cookie");
  const token = getTokenFromCookie(cookie);
  if (!token) return null;
  return decodeSessionPayload(token);
}

export { COOKIE_NAME };
