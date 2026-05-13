import { getGoogleClientConfig } from "@/lib/env/google";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DriveBrowser } from "./drive-browser";
import { GoogleDriveConnectButton } from "./google-drive-connect-button";

export async function DriveConnectSection() {
  const googleKeys = getGoogleClientConfig();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: raw, error: rowError } = await supabase
    .from("google_drive_accounts")
    .select("refresh_token, email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (rowError) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-red-900">Google Drive</h2>
        <p className="mt-2 text-sm text-red-800">
          Could not load your Google Drive connection. Try refreshing. If this
          keeps happening, contact support.
        </p>
      </section>
    );
  }

  const row = raw as { refresh_token: string; email: string | null } | null;

  if (!googleKeys) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-amber-950">Google Drive</h2>
        <p className="mt-2 text-sm text-amber-900">
          Google Drive isn&apos;t available on this workspace yet. Ask your
          administrator or try again later.
        </p>
      </section>
    );
  }

  if (!row?.refresh_token) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Google Drive</h2>
        <p className="mt-2 text-sm text-slate-600">
          Connect Drive to browse folders and choose images, videos, or GIFs.
          Only folders and media types are shown. Tokens stay on the server.
        </p>
        <GoogleDriveConnectButton />
      </section>
    );
  }

  return <DriveBrowser connectedAs={row.email} />;
}
