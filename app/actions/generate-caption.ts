"use server";

import OpenAI from "openai";
import {
  FALLBACK_SOCIAL_CAPTION,
  FALLBACK_SOCIAL_HASHTAGS,
} from "@/lib/ai/fallback-social-copy";
import { generateSocialCaptionAndHashtags } from "@/lib/ai/social-caption";
import {
  isCollageImageMime,
  isGifMime,
  isVideoMime,
} from "@/lib/composer/media-types";
import {
  loadMediaContextForUser,
  resolvePublishMediaItems,
  type PublishMetaItem,
} from "@/lib/composer/publish-media";
import { getOpenAIApiKey } from "@/lib/env/openai";

export type GenerateCaptionResult =
  | { ok: true; caption: string; hashtags: string; usedFallback?: boolean }
  | { ok: false; error: string };

export async function generateComposerCaption(payload: {
  items: PublishMetaItem[];
}): Promise<GenerateCaptionResult> {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) {
    return { ok: false, error: "Add media before generating a caption." };
  }

  const apiKey = getOpenAIApiKey();

  const ctx = await loadMediaContextForUser();
  if (!ctx.ok) {
    return { ok: false, error: ctx.error };
  }

  const resolvedResult = await resolvePublishMediaItems(
    ctx.supabase,
    ctx.userId,
    ctx.driveRefresh,
    items,
  );
  if (!resolvedResult.ok) {
    return { ok: false, error: resolvedResult.error };
  }

  const { resolved } = resolvedResult;
  const hasVideo = resolved.some((r) => isVideoMime(r.mimeType));
  const hasGif = resolved.some((r) => isGifMime(r.mimeType));

  if (hasVideo && resolved.length !== 1) {
    return { ok: false, error: "Only one video at a time for caption generation." };
  }
  if (hasGif && resolved.length !== 1) {
    return { ok: false, error: "Select a single GIF file for caption generation." };
  }
  if (!hasVideo && !hasGif) {
    const allStill = resolved.every((r) => isCollageImageMime(r.mimeType));
    if (!allStill) {
      return {
        ok: false,
        error: "Use still images only, a single GIF, or a single video.",
      };
    }
  }

  if (!apiKey) {
    return {
      ok: true,
      caption: FALLBACK_SOCIAL_CAPTION,
      hashtags: FALLBACK_SOCIAL_HASHTAGS,
      usedFallback: true,
    };
  }

  try {
    const openai = new OpenAI({ apiKey });
    const { caption, hashtags } = await generateSocialCaptionAndHashtags({
      openai,
      items,
      resolved,
      driveRefresh: ctx.driveRefresh,
    });
    return { ok: true, caption, hashtags };
  } catch {
    return {
      ok: true,
      caption: FALLBACK_SOCIAL_CAPTION,
      hashtags: FALLBACK_SOCIAL_HASHTAGS,
      usedFallback: true,
    };
  }
}
