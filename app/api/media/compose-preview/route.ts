import { NextResponse } from "next/server";
import {
  fetchDriveFileBuffer,
  sanitizeDriveFileId,
} from "@/lib/google/drive-file";
import { inferMimeFromFilename } from "@/lib/composer/infer-mime-from-filename";
import { normalizeStillBufferForMeta } from "@/lib/media/normalize-still-for-meta";
import { needsRasterPreviewConversion } from "@/lib/composer/needs-browser-preview";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Prefer extension when the browser mislabels HEIC (common). */
function effectiveUploadMime(file: File): string {
  const inferred = inferMimeFromFilename(file.name);
  if (inferred && /\.(heic|heif)$/i.test(file.name)) {
    return inferred;
  }
  return file.type?.trim() || inferred || "application/octet-stream";
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const mime = effectiveUploadMime(file);
  const buf = await file.arrayBuffer();

  if (!needsRasterPreviewConversion(mime, file.name)) {
    const ct =
      mime.startsWith("image/") || mime.startsWith("video/")
        ? mime
        : "application/octet-stream";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "no-store",
      },
    });
  }

  try {
    const out = await normalizeStillBufferForMeta(buf, mime, file.name);
    return new NextResponse(out.buffer, {
      headers: {
        "Content-Type": out.mimeType,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Conversion failed";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = sanitizeDriveFileId(url.searchParams.get("id"));
  const name = url.searchParams.get("name")?.trim() || "image";

  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data: row } = await supabase
    .from("google_drive_accounts")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row?.refresh_token) {
    return NextResponse.json({ error: "Drive not connected" }, { status: 400 });
  }

  let buffer: ArrayBuffer;
  let contentType: string;
  try {
    const fetched = await fetchDriveFileBuffer(row.refresh_token, id);
    buffer = fetched.buffer;
    contentType = fetched.contentType;
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Could not download from Drive.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const inferred = inferMimeFromFilename(name);
  const mime =
    inferred && /\.(heic|heif)$/i.test(name)
      ? inferred
      : contentType.split(";")[0]?.trim() || "application/octet-stream";

  if (!needsRasterPreviewConversion(mime, name)) {
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=120",
      },
    });
  }

  try {
    const out = await normalizeStillBufferForMeta(buffer, mime, name);
    return new NextResponse(out.buffer, {
      headers: {
        "Content-Type": out.mimeType,
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Conversion failed";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
