import OpenAI from "openai";
import { generateSocialCaptionAndHashtags } from "@/lib/ai/social-caption";
import {
  FALLBACK_SOCIAL_CAPTION,
  FALLBACK_SOCIAL_HASHTAGS,
} from "@/lib/ai/fallback-social-copy";
import type { PublishMetaItem } from "@/lib/composer/publish-media";
import { resolvePublishMediaItems } from "@/lib/composer/publish-media";
import { getOpenAIApiKey } from "@/lib/env/openai";
import type { SupabaseClient } from "@supabase/supabase-js";

function fullCaption(caption: string, hashtags: string) {
  const c = caption.trim();
  const h = hashtags.trim();
  if (!h) return c;
  if (!c) return h;
  return `${c}\n\n${h}`;
}

export async function buildAutoPostCaption(
  supabase: SupabaseClient,
  userId: string,
  driveRefresh: string,
  fileId: string,
  useAi: boolean,
): Promise<string> {
  const items: PublishMetaItem[] = [{ kind: "drive", fileId }];
  const resolvedResult = await resolvePublishMediaItems(
    supabase,
    userId,
    driveRefresh,
    items,
  );
  if (!resolvedResult.ok) {
    return fullCaption(FALLBACK_SOCIAL_CAPTION, FALLBACK_SOCIAL_HASHTAGS);
  }
  const { resolved } = resolvedResult;

  if (!useAi) {
    return fullCaption(FALLBACK_SOCIAL_CAPTION, FALLBACK_SOCIAL_HASHTAGS);
  }

  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return fullCaption(FALLBACK_SOCIAL_CAPTION, FALLBACK_SOCIAL_HASHTAGS);
  }

  try {
    const openai = new OpenAI({ apiKey });
    const { caption, hashtags } = await generateSocialCaptionAndHashtags({
      openai,
      items,
      resolved,
      driveRefresh,
    });
    const combined = fullCaption(caption, hashtags);
    if (combined.length > 8000) {
      return fullCaption(FALLBACK_SOCIAL_CAPTION, FALLBACK_SOCIAL_HASHTAGS);
    }
    return combined;
  } catch {
    return fullCaption(FALLBACK_SOCIAL_CAPTION, FALLBACK_SOCIAL_HASHTAGS);
  }
}
