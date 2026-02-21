import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDriveAccount, saveDriveAccount } from "@/lib/store";
import { refreshDriveAccessToken, listFolderContents } from "@/lib/drive";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized", folders: [], files: [] }, { status: 401 });
  try {
    const account = await getDriveAccount(session.userId);
    if (!account) {
      return NextResponse.json({ error: "Drive not connected", folders: [], files: [] }, { status: 401 });
    }

    let accessToken = account.accessToken;
    const fresh = await refreshDriveAccessToken(account.refreshToken);
    if (fresh) {
      accessToken = fresh;
      await saveDriveAccount(session.userId, { ...account, accessToken: fresh });
    }

    const folderId = request.nextUrl.searchParams.get("folderId") ?? account.folderId ?? "root";
    const result = await listFolderContents(accessToken, folderId);
    if (result.error) {
      return NextResponse.json({ error: result.error, folders: [], files: [] }, { status: 502 });
    }
    return NextResponse.json({ folders: result.folders, files: result.files });
  } catch (e) {
    console.error("Drive browse error:", e);
    return NextResponse.json({ error: "Failed to list folder", folders: [], files: [] }, { status: 500 });
  }
}
