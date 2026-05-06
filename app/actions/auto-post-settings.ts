"use server";

import { revalidatePath } from "next/cache";
import { isAutoCadence } from "@/lib/auto-post/cadence";
import { isAutoPostChannel, type AutoPostChannel } from "@/lib/auto-post/channel";
import {
  isAutoPostNextRunTimeMode,
  type AutoPostNextRunTimeMode,
} from "@/lib/auto-post/next-run-time-mode";
import { pickNextSmartRunUtc } from "@/lib/auto-post/smart-run-time";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MIN_LEAD_MS = 60_000;

const TZ_RE = /^[A-Za-z0-9_+/\-]+$/;

export type SaveAutoPostPayload = {
  enabled: boolean;
  cadence: string;
  useAiCaption: boolean;
  /** ISO string when enabled; ignored when disabled */
  nextRunAtIso: string | null;
  driveFolderId: string;
  channel: AutoPostChannel;
  nextRunTimeMode: AutoPostNextRunTimeMode;
  /** IANA zone from the browser; required when auto-post is enabled (cadence uses this). */
  scheduleTimezone: string | null;
};

export async function saveAutoPostSettings(
  payload: SaveAutoPostPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cadence = payload.cadence.trim();
  if (!isAutoCadence(cadence)) {
    return { ok: false, error: "Invalid cadence." };
  }
  if (!isAutoPostChannel(payload.channel)) {
    return { ok: false, error: "Invalid post target." };
  }
  if (!isAutoPostNextRunTimeMode(payload.nextRunTimeMode)) {
    return { ok: false, error: "Invalid schedule time mode." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You need to be signed in." };
  }

  let resolvedNextRunIso: string | null = null;

  if (payload.enabled) {
    const tzRaw = payload.scheduleTimezone?.trim() ?? "";
    if (!tzRaw || !TZ_RE.test(tzRaw) || tzRaw.length > 120) {
      return {
        ok: false,
        error:
          "Could not read your device timezone. Try again or reload the page.",
      };
    }

    let iso = payload.nextRunAtIso?.trim() ?? "";
    if (!iso && payload.nextRunTimeMode === "smart") {
      iso = pickNextSmartRunUtc({
        channel: payload.channel,
        earliest: new Date(Date.now() + MIN_LEAD_MS),
        timeZone: tzRaw,
      }).toISOString();
    }
    if (!iso) {
      return { ok: false, error: "Choose when the first automatic post should run." };
    }
    let when = Date.parse(iso);
    if (Number.isNaN(when)) {
      return { ok: false, error: "Invalid date or time." };
    }
    if (when < Date.now() + MIN_LEAD_MS) {
      if (payload.nextRunTimeMode === "smart") {
        iso = pickNextSmartRunUtc({
          channel: payload.channel,
          earliest: new Date(Date.now() + MIN_LEAD_MS),
          timeZone: tzRaw,
        }).toISOString();
        when = Date.parse(iso);
      }
      if (Number.isNaN(when) || when < Date.now() + MIN_LEAD_MS) {
        return {
          ok: false,
          error:
            "Next run must be at least 1 minute in the future. Past dates and times aren’t allowed.",
        };
      }
    }

    resolvedNextRunIso = iso;

    const { data: meta } = await supabase
      .from("meta_accounts")
      .select("selected_page_id, instagram_account_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!meta?.selected_page_id) {
      return {
        ok: false,
        error: "Connect Facebook and select a Page on Main before enabling auto posts.",
      };
    }
    if (
      (payload.channel === "instagram" || payload.channel === "both") &&
      !meta.instagram_account_id
    ) {
      return {
        ok: false,
        error:
          "Instagram is not linked to this Page yet. Link Instagram on Main first, or choose Facebook only.",
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
  const tzForRow = payload.enabled
    ? (payload.scheduleTimezone?.trim() ?? null)
    : null;

  const row = {
    user_id: user.id,
    enabled: payload.enabled,
    cadence,
    channel: payload.channel,
    next_run_time_mode: payload.nextRunTimeMode,
    schedule_timezone: tzForRow,
    use_ai_caption: payload.useAiCaption,
    next_run_at: resolvedNextRunIso,
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
