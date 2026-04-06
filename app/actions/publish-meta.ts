"use server";

import { revalidatePath } from "next/cache";
import type { PublishMetaItem } from "@/lib/composer/publish-media";
import { publishToFacebookPageForUser } from "@/lib/publish/facebook-publish-internal";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type { PublishMetaItem } from "@/lib/composer/publish-media";

export type PublishMetaResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function publishComposerToMetaPage(payload: {
  caption: string;
  items: PublishMetaItem[];
}): Promise<PublishMetaResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You need to be signed in." };
  }

  const result = await publishToFacebookPageForUser(supabase, user.id, {
    caption: payload.caption,
    items: Array.isArray(payload.items) ? payload.items : [],
  });

  if (result.ok) {
    revalidatePath("/dashboard/post");
  }
  return result;
}
