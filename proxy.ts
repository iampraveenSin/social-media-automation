import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  isAuthEntryPath,
  isPublicPath,
  normalizePathname,
} from "@/lib/auth/public-paths";
import { sanitizeRedirectPath } from "@/lib/auth/safe-next";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

function redirectToLogin(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const pathname = normalizePathname(request.nextUrl.pathname);

  if (isPublicPath(pathname) && !isAuthEntryPath(pathname)) {
    return NextResponse.next();
  }

  const config = getSupabasePublicConfig();

  if (!config) {
    if (isPublicPath(pathname)) {
      return NextResponse.next();
    }
    return redirectToLogin(request, pathname);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const isAuthed = !error && Boolean(data?.claims?.sub);

  if (isAuthEntryPath(pathname)) {
    if (isAuthed) {
      const nextPath = sanitizeRedirectPath(
        request.nextUrl.searchParams.get("next"),
      );
      const url = new URL(nextPath, request.url);
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (!isPublicPath(pathname) && !isAuthed) {
    return redirectToLogin(request, pathname);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
