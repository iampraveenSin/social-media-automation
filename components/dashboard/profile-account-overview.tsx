import Link from "next/link";
import type { ReactNode } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function Def({
  term,
  value,
}: {
  term: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-start sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {term}
      </dt>
      <dd className="text-sm text-slate-900">{value}</dd>
    </div>
  );
}

export async function ProfileAccountOverview() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <p className="text-sm text-slate-600">
        Sign in to see your connected accounts.
      </p>
    );
  }

  const { data: metaRaw, error: metaErr } = await supabase
    .from("meta_accounts")
    .select("selected_page_name, instagram_username")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: driveRaw, error: driveErr } = await supabase
    .from("google_drive_accounts")
    .select("email")
    .eq("user_id", user.id)
    .maybeSingle();

  const metaConnected = Boolean(metaRaw);

  const meta = metaRaw as {
    selected_page_name: string | null;
    instagram_username: string | null;
  } | null;

  const driveEmail =
    driveRaw && typeof driveRaw === "object" && "email" in driveRaw
      ? ((driveRaw as { email: string | null }).email ?? null)
      : null;

  return (
    <div className="space-y-6">
      {(metaErr || driveErr) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Some account data could not be loaded. Try refreshing the page. If it
          keeps happening, contact support.
        </div>
      )}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Prnit account</h2>
        <p className="mt-1 text-xs text-slate-500">
          The email you use to sign in to this dashboard.
        </p>
        <dl className="mt-4">
          <Def term="Email" value={user.email ?? "—"} />
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Facebook &amp; Instagram
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Page and Instagram Business account selected for publishing (read-only
          summary).
        </p>
        <dl className="mt-4">
          {!metaConnected ? (
            <Def
              term="Status"
              value={
                <span className="text-slate-600">
                  Not connected. Use{" "}
                  <Link
                    href="/dashboard/main"
                    className="font-medium text-indigo-600 underline"
                  >
                    Main
                  </Link>{" "}
                  to connect Facebook.
                </span>
              }
            />
          ) : (
            <>
              <Def
                term="Status"
                value={
                  <span className="font-medium text-emerald-800">Connected</span>
                }
              />
              <Def
                term="Facebook Page"
                value={
                  meta?.selected_page_name ? (
                    <span>{meta.selected_page_name}</span>
                  ) : (
                    <span className="text-amber-800">
                      Connected — choose a Page on{" "}
                      <Link
                        href="/dashboard/main"
                        className="font-medium text-indigo-600 underline"
                      >
                        Main
                      </Link>
                      .
                    </span>
                  )
                }
              />
              <Def
                term="Instagram"
                value={
                  meta?.instagram_username ? (
                    <span>@{meta.instagram_username.replace(/^@/, "")}</span>
                  ) : (
                    <span className="text-slate-600">
                      No Business/Creator account linked to this Page, or not
                      stored yet.
                    </span>
                  )
                }
              />
            </>
          )}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Google Drive</h2>
        <p className="mt-1 text-xs text-slate-500">
          Account used for the Drive picker in the composer.
        </p>
        <dl className="mt-4">
          <Def
            term="Status"
            value={
              driveEmail != null && driveEmail !== "" ? (
                <span className="font-medium text-emerald-800">Connected</span>
              ) : driveRaw ? (
                <span className="text-slate-600">Connected (no email on file)</span>
              ) : (
                <span className="text-slate-600">
                  Not connected. Connect on{" "}
                  <Link
                    href="/dashboard/main"
                    className="font-medium text-indigo-600 underline"
                  >
                    Main
                  </Link>
                  .
                </span>
              )
            }
          />
          {driveEmail ? <Def term="Google email" value={driveEmail} /> : null}
        </dl>
      </section>

      <p className="text-sm text-slate-600">
        To connect, disconnect, or switch Page: open{" "}
        <Link href="/dashboard/main" className="font-medium text-indigo-600 underline">
          Main workspace
        </Link>
        .
      </p>
    </div>
  );
}
