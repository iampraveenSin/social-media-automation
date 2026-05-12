import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Loads Drive refresh token and optional pick counter in two steps so that if the
 * `drive_pick_count` migration is not applied yet, random/auto pick still works.
 */
export async function loadDriveAccountForPick(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ refreshToken: string | null; pickCount: number }> {
  const { data: acc, error: accErr } = await supabase
    .from("google_drive_accounts")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (accErr || !acc?.refresh_token) {
    return { refreshToken: null, pickCount: 0 };
  }

  const { data: countRow, error: countErr } = await supabase
    .from("google_drive_accounts")
    .select("drive_pick_count")
    .eq("user_id", userId)
    .maybeSingle();

  const pickCount =
    !countErr && typeof countRow?.drive_pick_count === "number"
      ? countRow.drive_pick_count
      : 0;

  return { refreshToken: acc.refresh_token, pickCount };
}

export async function saveDrivePickCountAfterPick(
  supabase: SupabaseClient,
  userId: string,
  nextCount: number,
): Promise<void> {
  const { error } = await supabase
    .from("google_drive_accounts")
    .update({
      drive_pick_count: nextCount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) {
    console.error("[drive_pick_count] update:", error.message);
  }
}
