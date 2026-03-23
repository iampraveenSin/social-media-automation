import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import {
  INSTAGRAM_PENDING_COOKIE,
  decodePendingInstagramConnect,
  fetchFacebookPages,
} from "@/lib/instagram-connect-flow";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pendingRaw = request.cookies.get(INSTAGRAM_PENDING_COOKIE)?.value ?? null;
  const pending = decodePendingInstagramConnect(pendingRaw);
  if (!pending) return NextResponse.json({ error: "No pending Instagram connection" }, { status: 400 });

  const { pages, error } = await fetchFacebookPages(pending.accessToken);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({
    pages: pages.map((p) => ({ id: p.id, name: p.name })),
  });
}

