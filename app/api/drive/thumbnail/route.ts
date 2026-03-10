import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDriveAccount, saveDriveAccount } from "@/lib/store";
import { refreshDriveAccessToken, getDriveThumbnail } from "@/lib/drive";

/**
 * Proxy Drive thumbnails so the browser can show previews (Drive thumbnailLink
 * requires auth and fails in img src). Uses the session's Drive token to fetch
 * the thumbnail and stream it back.
 */
export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return new NextResponse(null, { status: 401 });
  const fileId = request.nextUrl.searchParams.get("fileId");
  if (!fileId) return new NextResponse(null, { status: 400 });
  try {
    const account = await getDriveAccount(session.userId);
    if (!account) return new NextResponse(null, { status: 401 });
    let accessToken = account.accessToken;
    const fresh = await refreshDriveAccessToken(account.refreshToken);
    if (fresh) {
      accessToken = fresh;
      await saveDriveAccount(session.userId, { ...account, accessToken: fresh });
    }
    const result = await getDriveThumbnail(accessToken, fileId);
    if (!result) return new NextResponse(null, { status: 404 });
    const body = new Uint8Array(result.buffer);
    return new NextResponse(body, {
      headers: {
        "Content-Type": result.mimeType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
