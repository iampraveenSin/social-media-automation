import OpenAI from "openai";
import {
  isCollageImageMime,
  isGifMime,
  isImageMime,
  isVideoMime,
} from "@/lib/composer/media-types";
import type {
  PublishMetaItem,
  ResolvedMedia,
} from "@/lib/composer/publish-media";
import {
  fetchDriveThumbnailBuffer,
  getDriveFileMeta,
  sanitizeDriveFileId,
} from "@/lib/google/drive-file";

const VISION_MODEL = "gpt-4o-mini";

function bufferToDataUrl(buffer: ArrayBuffer, mime: string): string {
  const base64 = Buffer.from(buffer).toString("base64");
  const safeMime = mime.startsWith("image/") ? mime : "image/jpeg";
  return `data:${safeMime};base64,${base64}`;
}

function parseCaptionJson(raw: string): {
  caption: string;
  hashtags: string[];
} | null {
  try {
    const data = JSON.parse(raw) as {
      caption?: unknown;
      hashtags?: unknown;
    };
    const caption =
      typeof data.caption === "string" ? data.caption.trim() : "";
    let hashtags: string[] = [];
    if (Array.isArray(data.hashtags)) {
      hashtags = data.hashtags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter(Boolean);
    } else if (typeof data.hashtags === "string") {
      hashtags = data.hashtags
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter(Boolean);
    }
    if (!caption && hashtags.length === 0) return null;
    return { caption, hashtags };
  } catch {
    return null;
  }
}

/**
 * Builds vision + text prompt from composer media, then returns caption + hashtags.
 */
export async function generateSocialCaptionAndHashtags(args: {
  openai: OpenAI;
  items: PublishMetaItem[];
  resolved: ResolvedMedia[];
  driveRefresh: string | null | undefined;
}): Promise<{ caption: string; hashtags: string }> {
  const { openai, items, resolved, driveRefresh } = args;

  if (items.length !== resolved.length) {
    throw new Error("Media list mismatch.");
  }

  const system = `You are an expert social media copywriter for Facebook and Instagram.
Analyze the provided media and write in clear, natural English.
Output ONLY valid JSON with this exact shape, no markdown:
{"caption":"engaging post text without hashtags, can use line breaks as \\n","hashtags":["#tagOne","#tagTwo"]}
Rules:
- caption: 1–4 short lines, friendly professional tone, no hashtag characters inside the caption text.
- hashtags: 8–14 relevant hashtags starting with #, mix of broader and niche tags, tied to what appears in the media.
- If multiple images are provided, reflect the combined story or theme of the carousel.
- If the media is unclear, still suggest sensible hashtags for the most likely category.`;

  const userParts: OpenAI.Chat.ChatCompletionContentPart[] = [];

  const hasVideo = resolved.some((r) => isVideoMime(r.mimeType));
  const hasGif = resolved.some((r) => isGifMime(r.mimeType));
  const stillImages = resolved.filter(
    (r) => isImageMime(r.mimeType) && !isVideoMime(r.mimeType),
  );

  if (hasVideo && resolved.length === 1) {
    const r = resolved[0]!;
    const item = items[0]!;
    let visionBuffer: ArrayBuffer | null = null;
    const visionMime = "image/jpeg";

    if (item.kind === "drive" && driveRefresh) {
      const id = sanitizeDriveFileId(item.fileId);
      if (id) {
        try {
          const meta = await getDriveFileMeta(driveRefresh, id);
          if (meta.thumbnailLink) {
            visionBuffer = await fetchDriveThumbnailBuffer(
              driveRefresh,
              meta.thumbnailLink,
            );
          }
        } catch {
          /* fall through to text-only */
        }
      }
    }

    if (visionBuffer && visionBuffer.byteLength > 0) {
      userParts.push({
        type: "text",
        text: "This is a preview frame / thumbnail from a video. Infer the likely subject and vibe of the full video, then write caption and hashtags as specified.",
      });
      userParts.push({
        type: "image_url",
        image_url: {
          url: bufferToDataUrl(visionBuffer, visionMime),
          detail: "low",
        },
      });
    } else {
      userParts.push({
        type: "text",
        text: `No video frame is available. The file is named "${r.filenameBase}" (${r.mimeType}). Suggest an engaging caption and hashtags suitable for a short social video in the same niche implied by the filename (or generic lifestyle if unknown).`,
      });
    }
  } else if (hasGif && resolved.length === 1) {
    const r = resolved[0]!;
    userParts.push({
      type: "text",
      text: "Analyze this GIF (first frame / animation) for subject and mood.",
    });
    userParts.push({
      type: "image_url",
      image_url: {
        url: bufferToDataUrl(r.buffer, r.mimeType || "image/gif"),
        detail: "low",
      },
    });
  } else if (
    stillImages.length === resolved.length &&
    stillImages.every((r) => isCollageImageMime(r.mimeType))
  ) {
    userParts.push({
      type: "text",
      text:
        stillImages.length > 1
          ? `These ${stillImages.length} images are one carousel / album post. Understand the common theme and write one cohesive caption and hashtags.`
          : "Analyze this image for subject, mood, and audience.",
    });
    const max = Math.min(stillImages.length, 4);
    for (let i = 0; i < max; i++) {
      const r = stillImages[i]!;
      userParts.push({
        type: "image_url",
        image_url: {
          url: bufferToDataUrl(r.buffer, r.mimeType),
          detail: "low",
        },
      });
    }
    if (stillImages.length > 4) {
      userParts.push({
        type: "text",
        text: `Note: ${stillImages.length - 4} more similar images exist in the set; keep the caption broad enough to cover the full carousel.`,
      });
    }
  } else {
    throw new Error("Unsupported media mix for caption generation.");
  }

  const completion = await openai.chat.completions.create({
    model: VISION_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: userParts },
    ],
    max_tokens: 600,
    temperature: 0.85,
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("Empty response from caption model.");
  }

  const parsed = parseCaptionJson(raw);
  if (!parsed) {
    throw new Error("Could not parse caption response.");
  }

  const hashtagLine = parsed.hashtags.join(" ");
  return {
    caption: parsed.caption,
    hashtags: hashtagLine,
  };
}
