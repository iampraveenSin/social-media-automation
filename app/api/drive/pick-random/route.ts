import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDriveAccount, saveDriveAccount, getDrivePostedRound, clearDrivePostedRound } from "@/lib/store";
import { refreshDriveAccessToken, listMediaInFolderRecursive } from "@/lib/drive";

/**
 * Pick one random media file from the entire connected Drive (folder + all subfolders),
 * using the same no-repeat-until-all-used logic as Auto Post.
 */
export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const account = await getDriveAccount(session.userId);
    if (!account) {
      return NextResponse.json({ error: "Drive not connected" }, { status: 401 });
    }

    let accessToken = account.accessToken;
    const fresh = await refreshDriveAccessToken(account.refreshToken);
    if (fresh) {
      accessToken = fresh;
      await saveDriveAccount(session.userId, { ...account, accessToken: fresh });
    }

    const body = await request.json().catch(() => ({}));
    const folderId = (body.folderId as string | null | undefined) ?? account.folderId ?? "root";

    const listResult = await listMediaInFolderRecursive(accessToken, folderId);
    if (listResult.error) {
      return NextResponse.json({ error: listResult.error }, { status: 502 });
    }
    const files = listResult.files?.filter((f) => f.id) ?? [];
    if (files.length === 0) {
      return NextResponse.json({ error: "No media in Drive folder" }, { status: 404 });
    }

    const posted = await getDrivePostedRound(session.userId, folderId);
    let candidates = files.filter((f) => !posted.includes(f.id));
    if (candidates.length === 0) {
      await clearDrivePostedRound(session.userId, folderId);
      candidates = files;
    }
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    if (!chosen) {
      return NextResponse.json({ error: "No media to pick" }, { status: 500 });
    }

    return NextResponse.json({ fileId: chosen.id });
  } catch (e) {
    console.error("Drive pick-random error:", e);
    return NextResponse.json({ error: "Failed to pick random from Drive" }, { status: 500 });
  }
}
