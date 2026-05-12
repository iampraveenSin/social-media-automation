import type { SupabaseClient } from "@supabase/supabase-js";

/** Drive file ids already used in successful publishes (stored in `media_summary.drive_file_ids`). */
export async function fetchPublishedDriveFileIdsSet(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("published_posts")
    .select("media_summary")
    .eq("user_id", userId)
    .eq("status", "published");

  if (error || !data) return new Set();

  const set = new Set<string>();
  for (const row of data) {
    const ms = row.media_summary as { drive_file_ids?: unknown } | null;
    if (ms && Array.isArray(ms.drive_file_ids)) {
      for (const id of ms.drive_file_ids) {
        if (typeof id === "string" && id.length > 0) set.add(id);
      }
    }
  }
  return set;
}
