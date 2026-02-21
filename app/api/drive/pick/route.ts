import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getSessionFromRequest } from "@/lib/auth";
import { getDriveAccount, saveDriveAccount, saveMediaItem } from "@/lib/store";
import { refreshDriveAccessToken, downloadDriveFile } from "@/lib/drive";
import { uploadToSupabaseStorage } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { MediaItem } from "@/lib/types";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

function mimeToExt(mimeType: string): string {
  if (mimeType.includes("png")) return ".png";
  if (mimeType.includes("gif")) return ".gif";
  if (mimeType.includes("webp")) return ".webp";
  if (mimeType.includes("mp4") || mimeType === "video/mp4") return ".mp4";
  if (mimeType.includes("quicktime") || mimeType.includes("mov")) return ".mov";
  if (mimeType.includes("webm")) return ".webm";
  return ".jpg";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const fileId = body.fileId as string | undefined;
    if (!fileId) {
      return NextResponse.json({ error: "fileId required" }, { status: 400 });
    }

    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const downloaded = await downloadDriveFile(accessToken, fileId);
    if (!downloaded) {
      return NextResponse.json({ error: "Failed to download file from Drive" }, { status: 502 });
    }

    const ext = path.extname(downloaded.name) || mimeToExt(downloaded.mimeType);
    const id = uuidv4();
    const filename = `${id}${ext}`;

    if (isSupabaseConfigured()) {
      const result = await uploadToSupabaseStorage(filename, downloaded.buffer, downloaded.mimeType);
      if (!result.url) {
        const msg = "error" in result ? result.error : "Failed to store media";
        return NextResponse.json({ error: msg }, { status: 502 });
      }
      const item: MediaItem = {
        id,
        filename,
        path: result.url,
        url: result.url,
        mimeType: downloaded.mimeType,
        uploadedAt: new Date().toISOString(),
        userId: session.userId,
        driveFileId: fileId,
      };
      await saveMediaItem(item);
      return NextResponse.json(item);
    }

    await mkdir(UPLOADS_DIR, { recursive: true });
    const filepath = path.join(UPLOADS_DIR, filename);
    await writeFile(filepath, downloaded.buffer);

    const item: MediaItem = {
      id,
      filename,
      path: filepath,
      url: `/uploads/${filename}`,
      mimeType: downloaded.mimeType,
      uploadedAt: new Date().toISOString(),
      userId: session.userId,
      driveFileId: fileId,
    };
    await saveMediaItem(item);

    return NextResponse.json(item);
  } catch (e) {
    console.error("Drive pick error:", e);
    return NextResponse.json({ error: "Failed to use media from Drive" }, { status: 500 });
  }
}
