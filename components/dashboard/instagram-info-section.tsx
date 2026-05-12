import Link from "next/link";
import { fetchInstagramUserPublicDetails } from "@/lib/meta/graph";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Instagram Business summary for Main dashboard (profile image + ids).
 */
export async function InstagramInfoSection() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: raw, error } = await supabase
    .from("meta_accounts")
    .select(
      "instagram_account_id, instagram_username, page_access_token, selected_page_id",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return null;

  const row = raw as {
    instagram_account_id: string | null;
    instagram_username: string | null;
    page_access_token: string | null;
    selected_page_id: string | null;
  } | null;

  const igId = row?.instagram_account_id?.trim() ?? null;
  const pageToken = row?.page_access_token?.trim() ?? null;
  const username = row?.instagram_username?.replace(/^@/, "") ?? null;
  const pageSelected = Boolean(row?.selected_page_id);

  let profileUrl: string | null = null;
  if (igId && pageToken) {
    const details = await fetchInstagramUserPublicDetails(igId, pageToken);
    profileUrl = details?.profile_picture_url ?? null;
  }

  const linked = Boolean(igId && pageSelected);
  const avatarInitial =
    username?.trim()?.charAt(0)?.toUpperCase() ??
    (linked ? "?" : undefined);

  return (
    <section
      id="instagram-info"
      className="relative overflow-hidden rounded-2xl border-2 border-pink-300 bg-gradient-to-br from-pink-50/90 via-white to-violet-50/40 p-6 shadow-md ring-2 ring-pink-200/80 sm:p-7"
      aria-labelledby="instagram-info-heading"
    >
      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-gradient-to-b from-pink-500 via-fuchsia-500 to-violet-500 shadow-sm" />
      <div
        className="pointer-events-none absolute right-3 top-3 text-pink-600"
        aria-hidden
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-pink-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
          <span aria-hidden>→</span> IG
        </span>
      </div>

      <div className="space-y-5 pl-4 pr-14">
        <div>
          <h2
            id="instagram-info-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Instagram info
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Linked Instagram Business account for the Page you selected above.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-pink-400 to-violet-400 opacity-75 blur-[2px]" />
            {profileUrl ? (
              <img
                src={profileUrl}
                alt=""
                width={80}
                height={80}
                className="relative size-20 rounded-full border-4 border-white object-cover shadow-md"
              />
            ) : (
              <div
                className="relative flex size-20 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-pink-200 to-violet-200 text-lg font-bold text-pink-900 shadow-md"
                aria-hidden
              >
                {avatarInitial ?? "—"}
              </div>
            )}
          </div>

          <dl className="min-w-0 flex-1 space-y-2 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Username
              </dt>
              <dd className="font-medium text-slate-900">
                {username ? `@${username}` : linked ? "—" : "Not linked"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Account ID
              </dt>
              <dd className="break-all font-mono text-xs text-slate-800">
                {igId ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Account type
              </dt>
              <dd>
                <span className="inline-flex items-center rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-semibold text-pink-900">
                  Business
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  (Instagram Business account)
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {!linked ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
            {!pageSelected ? (
              <>
                Select a Facebook Page first. Then link an Instagram Business account
                to that Page in Meta Business Suite if you haven&apos;t already.
              </>
            ) : (
              <>
                This Page doesn&apos;t have a linked Instagram account yet. In{" "}
                <span className="font-medium">Meta Business Suite</span>, connect an
                Instagram Business profile to your Page, then use{" "}
                <span className="font-medium">Reconnect</span> on{" "}
                <Link
                  href="/dashboard/main"
                  className="font-medium text-indigo-600 underline"
                >
                  Main
                </Link>{" "}
                and pick the Page again.
              </>
            )}
          </p>
        ) : null}
      </div>
    </section>
  );
}
