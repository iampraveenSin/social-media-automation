/** Paths reachable without a Supabase session (exact match after normalize). */
const PUBLIC_PATHS = new Set([
  "/",
  "/privacy",
  "/terms",
  "/data-deletion",
  "/login",
  "/signup",
  "/auth/callback",
]);

export function normalizePathname(pathname: string): string {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(normalizePathname(pathname));
}

/** Login or signup entry routes — signed-in users are sent to the dashboard. */
export function isAuthEntryPath(pathname: string): boolean {
  const p = normalizePathname(pathname);
  return p === "/login" || p === "/signup";
}
