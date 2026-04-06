/** Prevent open redirects: only same-origin paths. */
export function sanitizeNextParam(
  next: string | string[] | undefined | null,
): string | null {
  const v = Array.isArray(next) ? next[0] : next;
  if (!v || typeof v !== "string") return null;
  if (!v.startsWith("/") || v.startsWith("//")) return null;
  return v;
}

export function authHref(
  pathname: "/login" | "/signup",
  opts: { mode?: "login" | "signup" | "forgot"; next?: string | null },
): string {
  const params = new URLSearchParams();
  if (opts.mode && opts.mode !== "login") params.set("mode", opts.mode);
  if (opts.next) params.set("next", opts.next);
  const q = params.toString();
  return q ? `${pathname}?${q}` : pathname;
}

/** For OAuth / magic-link `next` — only same-origin paths. */
export function sanitizeRedirectPath(path: string | null | undefined): string {
  if (!path || typeof path !== "string") return "/dashboard/main";
  if (!path.startsWith("/") || path.startsWith("//")) return "/dashboard/main";
  if (path === "/dashboard" || path === "/dashboard/") return "/dashboard/main";
  return path;
}
