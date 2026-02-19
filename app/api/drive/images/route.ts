import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDriveAccount, saveDriveAccount } from "@/lib/store";
import { refreshDriveAccessToken } from "@/lib/drive";
import { listImagesInFolder } from "@/lib/drive";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized", files: [] }, { status: 401 });
  try {
    const account = await getDriveAccount(session.userId);
    if (!account) {
      return NextResponse.json({ error: "Drive not connected", files: [] }, { status: 401 });
    }

    let accessToken = account.accessToken;
    const fresh = await refreshDriveAccessToken(account.refreshToken);
    if (fresh) {
      accessToken = fresh;
      await saveDriveAccount(session.userId, { ...account, accessToken: fresh });
    }

    const folderId = request.nextUrl.searchParams.get("folderId") ?? account.folderId ?? "root";
    const result = await listImagesInFolder(accessToken, folderId);
    if (result.error) {
      return NextResponse.json({ error: result.error, files: [] }, { status: 502 });
    }
    return NextResponse.json({ files: result.files });
  } catch (e) {
    console.error("Drive list images error:", e);
    return NextResponse.json({ error: "Failed to list images" }, { status: 500 });
  }
}
