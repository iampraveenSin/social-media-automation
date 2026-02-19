import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDriveAccount, clearDrivePostedRound } from "@/lib/store";

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const account = await getDriveAccount(session.userId);
    if (!account) {
      return NextResponse.json({ error: "Drive not connected" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const folderId = (body.folderId as string) ?? account.folderId ?? null;
    await clearDrivePostedRound(session.userId, folderId);
    return NextResponse.json({ cleared: true });
  } catch (e) {
    console.error("Drive clear-round error:", e);
    return NextResponse.json({ error: "Failed to clear round" }, { status: 500 });
  }
}
