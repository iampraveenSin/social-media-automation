import { AutoPostSettingsForm } from "@/components/dashboard/auto-post-settings-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function AutoPostPanel() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <p className="text-sm text-slate-600">Sign in to configure auto posting.</p>
    );
  }

  const [{ data, error }, driveCheck] = await Promise.all([
    supabase
      .from("auto_post_settings")
      .select(
        "enabled, cadence, use_ai_caption, next_run_at, drive_folder_id, last_error",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("google_drive_accounts")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (error) {
    const missing =
      error.message.includes("does not exist") ||
      error.code === "42P01" ||
      error.message.includes("schema cache");
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {missing ? (
          <>
            Automatic posting isn&apos;t fully set up on this site yet. Ask your
            administrator to finish setup, or try again later.
          </>
        ) : (
          <>Could not load auto post settings: {error.message}</>
        )}
      </div>
    );
  }

  const row = data as {
    enabled: boolean;
    cadence: string;
    use_ai_caption: boolean;
    next_run_at: string | null;
    drive_folder_id: string | null;
    last_error: string | null;
  } | null;

  const initial = {
    enabled: row?.enabled ?? false,
    cadence: row?.cadence ?? "daily",
    useAiCaption: row?.use_ai_caption ?? true,
    nextRunAtIso: row?.next_run_at ?? null,
    driveFolderId: row?.drive_folder_id ?? "",
    lastError: row?.last_error ?? null,
  };

  return (
    <AutoPostSettingsForm
      initial={initial}
      driveConnected={Boolean(driveCheck.data)}
    />
  );
}
