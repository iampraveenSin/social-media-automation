"use server";

import { revalidatePath } from "next/cache";
import { isAutoCadence } from "@/lib/auto-post/cadence";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MIN_LEAD_MS = 60_000;

export type SaveAutoPostPayload = {
  enabled: boolean;
  cadence: string;
  useAiCaption: boolean;
  /** ISO string when enabled; ignored when disabled */
  nextRunAtIso: string | null;
  driveFolderId: string;
};

export async function saveAutoPostSettings(
  payload: SaveAutoPostPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cadence = payload.cadence.trim();
  if (!isAutoCadence(cadence)) {
    return { ok: false, error: "Invalid cadence." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You need to be signed in." };
  }

  if (payload.enabled) {
    const iso = payload.nextRunAtIso?.trim();
    if (!iso) {
      return { ok: false, error: "Choose when the first automatic post should run." };
    }
    const when = Date.parse(iso);
    if (Number.isNaN(when)) {
      return { ok: false, error: "Invalid date or time." };
    }
    if (when < Date.now() + MIN_LEAD_MS) {
      return {
        ok: false,
        error: "Next run must be at least 1 minute in the future.",
      };
    }

    const { data: meta } = await supabase
      .from("meta_accounts")
      .select("selected_page_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!meta?.selected_page_id) {
      return {
        ok: false,
        error: "Connect Facebook and select a Page on Main before enabling auto posts.",
      };
    }

    const { data: drive } = await supabase
      .from("google_drive_accounts")
      .select("refresh_token")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!drive?.refresh_token) {
      return {
        ok: false,
        error: "Connect Google Drive on Main before enabling auto posts.",
      };
    }
  }

  const folder = payload.driveFolderId.trim();
  const row = {
    user_id: user.id,
    enabled: payload.enabled,
    cadence,
    use_ai_caption: payload.useAiCaption,
    next_run_at: payload.enabled ? payload.nextRunAtIso!.trim() : null,
    drive_folder_id: folder.length > 0 ? folder : null,
    last_error: null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("auto_post_settings").upsert(row, {
    onConflict: "user_id",
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("relation") || error.message.includes("does not exist")
          ? "Automatic posting isn’t set up on this site yet. Try again later or contact support."
          : error.message,
    };
  }

  revalidatePath("/dashboard/auto");
  revalidatePath("/dashboard/post");
  return { ok: true };
}
