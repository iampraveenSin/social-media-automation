import { getGoogleClientConfig } from "@/lib/env/google";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DriveBrowser } from "./drive-browser";

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
          Google Drive isn&apos;t available on this site yet. If you manage this
          deployment, finish Google OAuth setup in your hosting console. Otherwise
          ask your administrator or try again later.
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
        <a
          href="/api/google/connect"
          className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          <svg className="mr-2 size-5" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Connect Google Drive
        </a>
      </section>
    );
  }

  return <DriveBrowser connectedAs={row.email} />;
}
