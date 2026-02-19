import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getSessionFromRequest } from "@/lib/auth";
import { savePost, getMediaItem, getAccounts, addDrivePostedRound } from "@/lib/store";
import { publishToInstagram, publishToFacebookPage, isPublicImageUrl, LOCALHOST_MEDIA_MESSAGE } from "@/lib/instagram";
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
    const { mediaId, caption, hashtags, logoConfig, driveFileIds, driveFolderId } = body as {
      mediaId?: string;
      caption?: string;
      hashtags?: string[];
      logoConfig?: ScheduledPost["logoConfig"];
      driveFileIds?: string[];
      driveFolderId?: string | null;
    };

    if (!mediaId) {
      return NextResponse.json({ error: "mediaId required" }, { status: 400 });
    }

    const media = await getMediaItem(mediaId, session.userId);
    if (!media) return NextResponse.json({ error: "Media not found" }, { status: 404 });

    if (!media.url?.startsWith("http://") && !media.url?.startsWith("https://")) {
      return NextResponse.json(
        { error: "Image does not have a public URL. Re-Upload or re-pick the image so it is stored in Supabase (public URL)." },
        { status: 400 }
      );
    }
    let finalMediaUrl = media.url;
    const imageSource = media.url;

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
        console.error("Publish now logo error:", logoErr);
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

    const accounts = await getAccounts(session.userId);
    const account = accounts[0];
    if (!account) {
      return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });
    }

    if (!isPublicImageUrl(finalMediaUrl)) {
      return NextResponse.json({ error: LOCALHOST_MEDIA_MESSAGE }, { status: 400 });
    }

    const captionText = [caption ?? "", ...(Array.isArray(hashtags) ? hashtags : [])].filter(Boolean).join("\n\n");
    const result = await publishToInstagram(
      account.instagramBusinessAccountId,
      account.accessToken,
      finalMediaUrl,
      captionText
    );

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (account.facebookPageId) {
      const fbResult = await publishToFacebookPage(
        account.facebookPageId,
        account.accessToken,
        finalMediaUrl,
        captionText
      );
      if ("error" in fbResult) {
        console.warn("Facebook Page post failed:", fbResult.error);
      }
    }

    const id = uuidv4();
    const post: ScheduledPost = {
      id,
      mediaId,
      mediaUrl: finalMediaUrl,
      caption: caption ?? "",
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      logoConfig: logoConfig ?? null,
      scheduledAt: new Date().toISOString(),
      status: "published",
      publishedAt: new Date().toISOString(),
      userId: account.userId,
      appUserId: session.userId,
      createdAt: new Date().toISOString(),
      instagramMediaId: result.id,
    };
    await savePost(post);
    if (Array.isArray(driveFileIds) && driveFileIds.length > 0) {
      await addDrivePostedRound(session.userId, driveFolderId ?? null, driveFileIds);
    }

    return NextResponse.json({ post, published: true });
  } catch (e) {
    console.error("Publish now error:", e);
    return NextResponse.json({ error: "Publish failed" }, { status: 500 });
  }
}
