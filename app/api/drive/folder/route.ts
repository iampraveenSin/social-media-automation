import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDriveAccount, saveDriveAccount } from "@/lib/store";
import { parseDriveFolderId } from "@/lib/drive";

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const account = await getDriveAccount(session.userId);
    if (!account) {
      return NextResponse.json({ error: "Drive not connected" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const raw = (body.folderId ?? body.folder ?? "").trim();
    const folderId = parseDriveFolderId(raw) ?? (raw || undefined);
    if (!folderId) {
      return NextResponse.json({ error: "Invalid folder ID or link" }, { status: 400 });
    }

    await saveDriveAccount(session.userId, { ...account, folderId });
    return NextResponse.json({ folderId });
  } catch (e) {
    console.error("Drive folder save error:", e);
    return NextResponse.json({ error: "Failed to save folder" }, { status: 500 });
  }
}
