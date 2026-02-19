import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDriveAccount } from "@/lib/store";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ connected: false, folderId: null }, { status: 401 });
  try {
    const account = await getDriveAccount(session.userId);
    return NextResponse.json({
      connected: !!account,
      folderId: account?.folderId ?? null,
    });
  } catch {
    return NextResponse.json({ connected: false, folderId: null });
  }
}
