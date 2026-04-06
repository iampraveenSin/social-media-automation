"use server";

import { revalidatePath } from "next/cache";
import type { PublishMetaItem } from "@/lib/composer/publish-media";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_IMAGES = 10;
const MIN_LEAD_MS = 60_000;
const MAX_LEAD_DAYS = 90;

function isValidPublishItem(x: unknown): x is PublishMetaItem {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (o.kind === "drive") {
    return typeof o.fileId === "string" && o.fileId.length > 0;
  }
  if (o.kind === "upload") {
    return typeof o.storagePath === "string" && o.storagePath.length > 0;
  }
  return false;
}

function normalizeItems(raw: unknown): PublishMetaItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  if (raw.length > MAX_IMAGES) return null;
  if (!raw.every(isValidPublishItem)) return null;
  return raw as PublishMetaItem[];
}

export type SchedulePostResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type ScheduledPostChannel = "facebook" | "instagram" | "both";

function isScheduledPostChannel(x: unknown): x is ScheduledPostChannel {
  return x === "facebook" || x === "instagram" || x === "both";
}

export async function scheduleComposerPost(payload: {
  caption: string;
  items: PublishMetaItem[];
  scheduledAtIso: string;
  channel: ScheduledPostChannel;
}): Promise<SchedulePostResult> {
  const caption =
    typeof payload.caption === "string" ? payload.caption.trim() : "";
  const items = normalizeItems(payload.items);
  if (!items) {
    return { ok: false, error: "Invalid or empty media payload." };
  }
  if (!caption) {
    return { ok: false, error: "Caption is required for scheduled posts." };
  }
  if (caption.length > 8000) {
    return { ok: false, error: "Caption must be 8,000 characters or fewer." };
  }

  const when = Date.parse(payload.scheduledAtIso);
  if (Number.isNaN(when)) {
    return { ok: false, error: "Invalid schedule time." };
  }
  const now = Date.now();
  if (when < now + MIN_LEAD_MS) {
    return {
      ok: false,
      error: "Schedule at least 1 minute in the future.",
    };
  }
  if (when > now + MAX_LEAD_DAYS * 24 * 60 * 60 * 1000) {
    return {
      ok: false,
      error: `Schedule within the next ${MAX_LEAD_DAYS} days.`,
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You need to be signed in." };
  }

  if (!isScheduledPostChannel(payload.channel)) {
    return { ok: false, error: "Invalid schedule target." };
  }

  const { data: metaRow } = await supabase
    .from("meta_accounts")
    .select("selected_page_id, instagram_account_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!metaRow?.selected_page_id) {
    return {
      ok: false,
      error: "Connect Facebook and select a Page before scheduling.",
    };
  }
  if (
    (payload.channel === "instagram" || payload.channel === "both") &&
    !metaRow.instagram_account_id
  ) {
    return {
      ok: false,
      error:
        "Instagram is not connected to this Page yet. Link Instagram first, then schedule.",
    };
  }

  const { data: row, error } = await supabase
    .from("scheduled_posts")
    .insert({
      user_id: user.id,
      caption,
      items,
      scheduled_at: new Date(when).toISOString(),
      channel: payload.channel,
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !row?.id) {
    return {
      ok: false,
      error: error?.message ?? "Could not save scheduled post.",
    };
  }

  revalidatePath("/dashboard/post");
  revalidatePath("/dashboard/main");
  return { ok: true, id: row.id as string };
}

export async function cancelScheduledPost(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("scheduled_posts")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending");

  revalidatePath("/dashboard/post");
  revalidatePath("/dashboard/main");
}
