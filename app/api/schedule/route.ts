import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getSessionFromRequest } from "@/lib/auth";
import { savePost, getMediaItem, getAccounts, addDrivePostedRound } from "@/lib/store";
import { schedulePost } from "@/lib/queue";
import { addLogoToImage } from "@/lib/sharp-logo";
import { uploadToSupabaseStorage } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { ScheduledPost } from "@/lib/types";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const { mediaId, caption, hashtags, topic, vibe, audience, scheduledAt, logoConfig, mediaUrl, driveFileIds, driveFolderId } = body as {
      mediaId?: string;
      caption?: string;
      hashtags?: string[];
      topic?: string;
      vibe?: string;
      audience?: string;
      scheduledAt?: string;
      logoConfig?: ScheduledPost["logoConfig"];
      mediaUrl?: string;
      driveFileIds?: string[];
      driveFolderId?: string | null;
    };

    if (!mediaId && !mediaUrl) {
      return NextResponse.json({ error: "mediaId or mediaUrl required" }, { status: 400 });
    }

    let finalMediaUrl = mediaUrl;
    let imageSource: string | null = null;
    if (mediaId) {
      const media = await getMediaItem(mediaId, session.userId);
      if (!media) return NextResponse.json({ error: "Media not found" }, { status: 404 });
      if (!media.url?.startsWith("http://") && !media.url?.startsWith("https://")) {
        return NextResponse.json(
          { error: "Image does not have a public URL. Re-upload or re-pick the image so it is stored in Supabase (public URL)." },
          { status: 400 }
        );
      }
      finalMediaUrl = media.url;
      imageSource = media.url;
    }
    if (!finalMediaUrl) {
      return NextResponse.json({ error: "Could not resolve media URL" }, { status: 400 });
    }
    if (!finalMediaUrl.startsWith("http://") && !finalMediaUrl.startsWith("https://")) {
      return NextResponse.json(
        { error: "Image does not have a public URL. Re-upload or re-pick the image so it is stored in Supabase (public URL)." },
        { status: 400 }
      );
    }
    if (logoConfig?.url && !imageSource) imageSource = finalMediaUrl;

    if (logoConfig?.url && imageSource) {
      let buffer: Buffer;
      try {
        const looksLikeUrl = typeof logoConfig.url === "string" && (logoConfig.url.startsWith("http") || logoConfig.url.includes("://"));
        const logoPathOrBuffer: string | Buffer = looksLikeUrl
          ? Buffer.from(await (await fetch(logoConfig.url)).arrayBuffer())
          : path.join(process.cwd(), "public", logoConfig.url.replace(/^\//, ""));
        buffer = await addLogoToImage(imageSource, logoPathOrBuffer, logoConfig);
      } catch (logoErr) {
        const msg = logoErr instanceof Error ? logoErr.message : String(logoErr);
        console.error("Schedule logo error:", logoErr);
        return NextResponse.json({ error: `Logo failed: ${msg}` }, { status: 400 });
      }
      const outFilename = `with-logo-${uuidv4()}.jpg`;
      const uploadResult = isSupabaseConfigured()
        ? await uploadToSupabaseStorage(outFilename, buffer, "image/jpeg")
        : { url: null as string | null };
      if (uploadResult.url) {
        finalMediaUrl = uploadResult.url;
      } else {
        await mkdir(UPLOADS_DIR, { recursive: true });
        const outPath = path.join(UPLOADS_DIR, outFilename);
        await writeFile(outPath, buffer);
        finalMediaUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/uploads/${outFilename}`;
      }
    }

    const id = uuidv4();
    const at = scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 60 * 60 * 1000);

    const accounts = await getAccounts(session.userId);
    const resolvedMetaUserId = accounts[0]?.userId ?? "default";

    const post: ScheduledPost = {
      id,
      mediaId: mediaId ?? "",
      mediaUrl: finalMediaUrl,
      caption: caption ?? "",
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      topic: (topic as string)?.trim() || undefined,
      vibe: (vibe as string)?.trim() || undefined,
      audience: (audience as string)?.trim() || undefined,
      logoConfig: logoConfig ?? null,
      scheduledAt: at.toISOString(),
      status: "scheduled",
      userId: resolvedMetaUserId,
      appUserId: session.userId,
      createdAt: new Date().toISOString(),
    };

    await savePost(post);
    if (Array.isArray(driveFileIds) && driveFileIds.length > 0) {
      await addDrivePostedRound(session.userId, driveFolderId ?? null, driveFileIds);
    }
    const jobId = await schedulePost(post, at);
    if (jobId == null) {
      return NextResponse.json(
        {
          error:
            "Scheduling requires Redis. Set REDIS_URL in the app environment and run the worker (npm run worker) on an always-on machine.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      post: { ...post, id },
      jobId,
      scheduledAt: post.scheduledAt,
    });
  } catch (e) {
    console.error("Schedule error:", e);
    return NextResponse.json({ error: "Schedule failed" }, { status: 500 });
  }
}
