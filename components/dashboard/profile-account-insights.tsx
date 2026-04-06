import Link from "next/link";
import {
  fetchInstagramMediaGrid,
  fetchInstagramUserInsights,
  fetchPagePublicDetails,
} from "@/lib/meta/graph";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function thumbForItem(item: {
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
}): string | null {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.media_url && item.media_type !== "VIDEO") return item.media_url;
  if (item.media_url) return item.media_url;
  return null;
}

export async function ProfileAccountInsights() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: raw, error } = await supabase
    .from("meta_accounts")
    .select(
      "selected_page_id, selected_page_name, page_access_token, instagram_account_id, instagram_username",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !raw) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Account insights</h2>
        <p className="mt-2 text-sm text-slate-600">
          Connect Meta on{" "}
          <Link href="/dashboard/main" className="font-medium text-indigo-600 underline">
            Main
          </Link>{" "}
          to load Facebook and Instagram insights.
        </p>
      </section>
    );
  }

  const row = raw as {
    selected_page_id: string | null;
    selected_page_name: string | null;
    page_access_token: string | null;
    instagram_account_id: string | null;
    instagram_username: string | null;
  };

  const pageId = row.selected_page_id;
  const pageToken = row.page_access_token;
  const igId = row.instagram_account_id;

  if (!pageId || !pageToken) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Account insights</h2>
        <p className="mt-2 text-sm text-slate-600">
          Select a Facebook Page on{" "}
          <Link href="/dashboard/main" className="font-medium text-indigo-600 underline">
            Main
          </Link>{" "}
          to load public insights from the Graph API.
        </p>
      </section>
    );
  }

  const pageDetails = await fetchPagePublicDetails(pageId, pageToken);
  const igInsights =
    igId != null && igId.length > 0
      ? await fetchInstagramUserInsights(igId, pageToken)
      : null;
  const igMedia =
    igId != null && igId.length > 0
      ? await fetchInstagramMediaGrid(igId, pageToken, 9)
      : [];

  const apiEmpty = !pageDetails && !igInsights && igMedia.length === 0;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold text-slate-900">Account insights</h2>
      <p className="mt-1 text-xs text-slate-500">
        Read-only data from Meta when your Page token and permissions allow it.
        Not all fields appear for every app or account type.
      </p>

      {apiEmpty ? (
        <p className="mt-4 text-sm text-amber-800">
          Could not load insights right now (expired token, missing permissions,
          or API error). Try &quot;Reconnect&quot; on Main.
        </p>
      ) : null}

      {pageDetails ? (
        <div className="mt-6 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">Facebook Page</h3>
          <p className="mt-1 text-lg font-medium text-slate-800">
            {pageDetails.name}
          </p>
          <dl className="mt-3 space-y-2 text-sm text-slate-600">
            {pageDetails.category ? (
              <div>
                <span className="font-medium text-slate-700">Category: </span>
                {pageDetails.category}
              </div>
            ) : null}
            {pageDetails.fan_count != null ? (
              <div>
                <span className="font-medium text-slate-700">Likes: </span>
                {pageDetails.fan_count.toLocaleString()}
              </div>
            ) : null}
            {pageDetails.about ? (
              <div className="whitespace-pre-wrap text-slate-600">
                <span className="font-medium text-slate-700">About: </span>
                {pageDetails.about}
              </div>
            ) : null}
            {pageDetails.website ? (
              <div>
                <span className="font-medium text-slate-700">Website: </span>
                <a
                  href={pageDetails.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline"
                >
                  {pageDetails.website}
                </a>
              </div>
            ) : null}
            {pageDetails.link ? (
              <div>
                <a
                  href={pageDetails.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-indigo-600 underline"
                >
                  View Page on Facebook
                </a>
              </div>
            ) : null}
          </dl>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Facebook Page details did not load (token or field access).
          {row.selected_page_name ? (
            <>
              {" "}
              Saved name: <strong>{row.selected_page_name}</strong>
            </>
          ) : null}
        </p>
      )}

      {igId ? (
        <div className="mt-6 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Instagram Business
          </h3>
          {igInsights ? (
            <div className="mt-3 flex flex-wrap items-start gap-4">
              {igInsights.profile_picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={igInsights.profile_picture_url}
                  alt=""
                  className="size-20 shrink-0 rounded-full border border-slate-200 object-cover"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-slate-900">
                  {igInsights.name ?? `@${igInsights.username ?? row.instagram_username ?? "—"}`}
                </p>
                {igInsights.username ? (
                  <p className="text-sm text-slate-600">
                    @{igInsights.username.replace(/^@/, "")}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                  {igInsights.followers_count != null ? (
                    <span>
                      <strong className="text-slate-800">
                        {igInsights.followers_count.toLocaleString()}
                      </strong>{" "}
                      followers
                    </span>
                  ) : null}
                  {igInsights.media_count != null ? (
                    <span>
                      <strong className="text-slate-800">
                        {igInsights.media_count.toLocaleString()}
                      </strong>{" "}
                      posts
                    </span>
                  ) : null}
                </div>
                {igInsights.biography ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                    {igInsights.biography}
                  </p>
                ) : null}
                {igInsights.website ? (
                  <a
                    href={igInsights.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-indigo-600 underline"
                  >
                    {igInsights.website}
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Instagram profile fields did not load. Username on file: @
              {(row.instagram_username ?? "—").replace(/^@/, "")}
            </p>
          )}

          {igMedia.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Recent media
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3">
                {igMedia.map((m) => {
                  const src = thumbForItem(m);
                  const href = m.permalink ?? undefined;
                  const inner = src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt=""
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">
                      {m.media_type ?? "Media"}
                    </div>
                  );
                  return href ? (
                    <a
                      key={m.id}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="overflow-hidden rounded-lg ring-1 ring-slate-200 transition hover:opacity-90"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div
                      key={m.id}
                      className="overflow-hidden rounded-lg ring-1 ring-slate-200"
                    >
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : igInsights ? (
            <p className="mt-3 text-xs text-slate-500">
              No recent media returned (permissions or empty library).
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">Instagram</h3>
          <p className="mt-2 text-sm text-slate-600">
            Link an Instagram Business account to your Page in Meta, then
            reconnect on Main to see profile and a small media grid here.
          </p>
        </div>
      )}
    </section>
  );
}
