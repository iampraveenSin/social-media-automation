import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * GET /api/auth/instagram/pages
 * Returns the list of Facebook Pages (with linked Instagram accounts)
 * stored in cookies during the OAuth callback. Uses the public cookie
 * (no access tokens exposed to the client).
 */
export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const cookieStore = await cookies();
  const raw = cookieStore.get("ig_pending_pages_public")?.value;
  if (!raw) {
    return NextResponse.json({ pages: [] });
  }

  try {
    const pages = JSON.parse(decodeURIComponent(raw));
    return NextResponse.json({ pages });
  } catch {
    return NextResponse.json({ pages: [] });
  }
}
