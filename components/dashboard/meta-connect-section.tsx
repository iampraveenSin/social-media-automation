import { disconnectMeta, selectMetaPage } from "@/app/actions/meta";
import { getMetaAppConfig } from "@/lib/env/meta";
import { fetchManagedPages } from "@/lib/meta/graph";
import type { MetaAccountRow } from "@/lib/meta/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function MetaConnectSection() {
  const appKeys = getMetaAppConfig();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: raw, error: rowError } = await supabase
    .from("meta_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (rowError) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-red-900">
          Facebook &amp; Instagram
        </h2>
        <p className="mt-2 text-sm text-red-800">
          Could not load your connection. Try refreshing. If this keeps happening,
          contact support.
        </p>
      </section>
    );
  }

  const row = raw as MetaAccountRow | null;

  if (!appKeys) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-amber-950">
          Facebook &amp; Instagram
        </h2>
        <p className="mt-2 text-sm text-amber-900">
          Facebook sign-in isn&apos;t configured for this site yet. If you manage
          this deployment, add your Meta app credentials in your hosting
          settings. Otherwise ask your administrator or try again later.
        </p>
      </section>
    );
  }

  if (!row?.user_access_token) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Connect Facebook
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with Facebook, approve permissions, then choose which Page to
          use for posts (and its linked Instagram account when available).
        </p>
        <a
          href="/api/meta/connect"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0866FF] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#0756d9]"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Continue with Facebook
        </a>
      </section>
    );
  }

  if (!row.selected_page_id) {
    let pages: Awaited<ReturnType<typeof fetchManagedPages>> = [];
    let loadError: string | null = null;
    try {
      pages = await fetchManagedPages(row.user_access_token);
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load Pages.";
    }

    if (loadError) {
      return (
        <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Select a Page</h2>
          <p className="mt-2 text-sm text-red-600">{loadError}</p>
          <a
            href="/api/meta/connect"
            className="mt-4 inline-flex rounded-xl bg-[#0866FF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0756d9]"
          >
            Reconnect with Facebook
          </a>
        </section>
      );
    }

    if (pages.length === 0) {
      return (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-amber-950">No Pages found</h2>
          <p className="mt-2 text-sm text-amber-900">
            This Facebook account doesn&apos;t manage any Pages. Create a Page in
            Meta Business Suite, then reconnect.
          </p>
          <a
            href="/api/meta/connect"
            className="mt-4 inline-flex rounded-xl bg-[#0866FF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0756d9]"
          >
            Try again
          </a>
        </section>
      );
    }

    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Select a Facebook Page
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          We&apos;ll use this Page for publishing. If an Instagram account is
          linked to it, you can target Instagram in a later step.
        </p>
        <form action={selectMetaPage} className="mt-5 space-y-3">
          <fieldset className="space-y-2">
            <legend className="sr-only">Facebook Page</legend>
            {pages.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50/50"
              >
                <input
                  type="radio"
                  name="pageId"
                  value={p.id}
                  required
                  className="mt-1 text-indigo-600"
                />
                <span>
                  <span className="font-medium text-slate-900">{p.name}</span>
                  {p.instagram_business_account?.username ? (
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Instagram: @{p.instagram_business_account.username}
                    </span>
                  ) : (
                    <span className="mt-0.5 block text-xs text-slate-400">
                      No Instagram Business account linked to this Page
                    </span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 sm:w-auto sm:px-8"
          >
            Use selected Page
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-emerald-950">
        Facebook connected
      </h2>
      <p className="mt-2 text-sm text-emerald-900">
        Page:{" "}
        <span className="font-semibold">{row.selected_page_name}</span>
        {row.instagram_username ? (
          <>
            {" "}
            · Instagram:{" "}
            <span className="font-semibold">@{row.instagram_username}</span>
          </>
        ) : null}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href="/api/meta/connect"
          className="inline-flex rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
        >
          Reconnect / switch account
        </a>
        <form action={disconnectMeta}>
          <button
            type="submit"
            className="inline-flex rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-800 shadow-sm transition hover:bg-red-50"
          >
            Disconnect
          </button>
        </form>
      </div>
      <p className="mt-4 text-xs text-emerald-800/80">
        Your Facebook connection is stored only for your Prnit account. For a
        public launch, follow Meta&apos;s app review requirements.
      </p>
    </section>
  );
}
