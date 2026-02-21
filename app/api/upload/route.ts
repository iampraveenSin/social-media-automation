import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getSessionFromRequest } from "@/lib/auth";
import { saveMediaItem } from "@/lib/store";
import { uploadToSupabaseStorage } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { MediaItem } from "@/lib/types";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type === "video/mp4";
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Invalid file type. Use image or video/mp4." }, { status: 400 });
    }

    const ext = path.extname(file.name) || (isVideo ? ".mp4" : ".jpg");
    const id = uuidv4();
    const filename = `${id}${ext}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (isSupabaseConfigured()) {
      const result = await uploadToSupabaseStorage(filename, buffer, file.type);
      if (!result.url) {
        const msg = "error" in result ? result.error : "Upload failed";
        return NextResponse.json({ error: msg }, { status: 502 });
      }
      const item: MediaItem = {
        id,
        filename,
        path: result.url,
        url: result.url,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        userId: session.userId,
      };
      await saveMediaItem(item);
      return NextResponse.json(item);
    }

    await mkdir(UPLOADS_DIR, { recursive: true });
    const filepath = path.join(UPLOADS_DIR, filename);
    await writeFile(filepath, buffer);

    const item: MediaItem = {
      id,
      filename,
      path: filepath,
      url: `/uploads/${filename}`,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      userId: session.userId,
    };
    await saveMediaItem(item);

    return NextResponse.json(item);
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
