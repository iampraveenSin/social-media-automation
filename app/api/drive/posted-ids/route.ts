import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDriveAccount, getDrivePostedRound } from "@/lib/store";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized", postedIds: [] }, { status: 401 });
  try {
    const account = await getDriveAccount(session.userId);
    if (!account) {
      return NextResponse.json({ error: "Drive not connected", postedIds: [] }, { status: 401 });
    }
    const folderId = request.nextUrl.searchParams.get("folderId") ?? account.folderId ?? null;
    const postedIds = await getDrivePostedRound(session.userId, folderId);
    return NextResponse.json({ postedIds });
  } catch (e) {
    console.error("Drive posted-ids error:", e);
    return NextResponse.json({ error: "Failed to get posted ids", postedIds: [] }, { status: 500 });
  }
}
