import { fetchPagePublicDetails } from "@/lib/meta/graph";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Image from "next/image";

/**
 * Facebook Page summary for Main dashboard (profile image + Page id).
 * Renders only when a Page is selected and has a token.
 */
export async function FacebookInfoSection() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: raw, error } = await supabase
    .from("meta_accounts")
    .select("selected_page_id, selected_page_name, page_access_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return null;

  const row = raw as {
    selected_page_id: string | null;
    selected_page_name: string | null;
    page_access_token: string | null;
  } | null;

  const pageId = row?.selected_page_id?.trim() ?? null;
  const pageToken = row?.page_access_token?.trim() ?? null;
  if (!pageId || !pageToken) return null;

  const pageNameDb = row?.selected_page_name?.trim() ?? null;

  let profileUrl: string | null = null;
  let pageName = pageNameDb;
  let category: string | null = null;
  let fanCount: number | null = null;
  let pageLink: string | null = null;

  const details = await fetchPagePublicDetails(pageId, pageToken);
  if (details) {
    pageName = details.name ?? pageName;
    profileUrl = details.picture_url ?? null;
    category = details.category ?? null;
    fanCount = typeof details.fan_count === "number" ? details.fan_count : null;
    pageLink = details.link ?? null;
  }

  const avatarInitial =
    pageName?.trim()?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <section
      id="facebook-info"
      className="relative overflow-hidden rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/40 p-6 shadow-md ring-2 ring-blue-200/80 sm:p-7"
      aria-labelledby="facebook-info-heading"
    >
      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-gradient-to-b from-blue-600 via-indigo-500 to-blue-400 shadow-sm" />
      <div
        className="pointer-events-none absolute right-3 top-3 text-blue-700"
        aria-hidden
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-[#0866FF] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
          <span aria-hidden>→</span> FB
        </span>
      </div>

      <div className="space-y-5 pl-4 pr-14">
        <div>
          <h2
            id="facebook-info-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Facebook info
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            The Facebook Page you selected for posting and scheduling.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-400 opacity-75 blur-[2px]" />
            {profileUrl ? (
              <Image
                src={profileUrl}
                alt=""
                width={80}
                height={80}
                unoptimized
                className="relative size-20 rounded-full border-4 border-white object-cover shadow-md"
              />
            ) : (
              <div
                className="relative flex size-20 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-200 to-indigo-200 text-lg font-bold text-blue-900 shadow-md"
                aria-hidden
              >
                {avatarInitial ?? "—"}
              </div>
            )}
          </div>

          <dl className="min-w-0 flex-1 space-y-2 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Page name
              </dt>
              <dd className="font-medium text-slate-900">
                {pageName ? (
                  pageLink ? (
                    <a
                      href={pageLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
                    >
                      {pageName}
                    </a>
                  ) : (
                    pageName
                  )
                ) : (
                  "—"
                )}
              </dd>
            </div>
            {category ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Category
                </dt>
                <dd className="text-slate-800">{category}</dd>
              </div>
            ) : null}
            {fanCount != null ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Followers
                </dt>
                <dd className="text-slate-800">
                  {fanCount.toLocaleString()} Page likes
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Page ID
              </dt>
              <dd className="break-all font-mono text-xs text-slate-800">
                {pageId}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Account type
              </dt>
              <dd>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-900">
                  Facebook Page
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  (Business or creator Page you manage)
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
