import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, getTokenFromCookie, sessionCookieFormatValid } from "./lib/auth-edge";

/** Base URL for redirects. Use NEXT_PUBLIC_APP_URL when set (e.g. production) so we don't send users to localhost when behind a proxy. */
function getBaseUrl(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  return request.nextUrl.origin;
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/auth/login") || path.startsWith("/api/auth/signup") || path.startsWith("/api/auth/logout") || path.startsWith("/api/auth/instagram")) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value ?? getTokenFromCookie(request.headers.get("cookie"));
  const loggedIn = !!cookie && sessionCookieFormatValid(cookie);

  const base = getBaseUrl(request);

  if (path.startsWith("/dashboard") && !loggedIn) {
    return NextResponse.redirect(`${base}/login`);
  }

  if ((path === "/login" || path === "/signup") && loggedIn) {
    return NextResponse.redirect(`${base}/dashboard`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
