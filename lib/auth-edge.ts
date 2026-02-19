/**
 * Edge-safe auth helpers (no Node.js crypto). Use in middleware only.
 * Full token creation/verification is in lib/auth.ts (API routes / Node).
 */

export const COOKIE_NAME = "automate_session";

export function getTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1].trim() : null;
}

/** Only checks format; no crypto. */
export function sessionCookieFormatValid(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  return parts.length === 2 && parts[0].length > 0 && /^[a-f0-9]+$/i.test(parts[1]);
}
