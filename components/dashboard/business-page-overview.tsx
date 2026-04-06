import Link from "next/link";
import type { ReactNode } from "react";
import {
  fetchInstagramUserPublicDetails,
  fetchPagePublicDetails,
} from "@/lib/meta/graph";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function Row({
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

export async function BusinessPageOverview() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <p className="text-sm text-slate-600">
        Sign in to see your Facebook Page and business summary.
      </p>
    );
  }

  const { data: raw, error } = await supabase
    .from("meta_accounts")
    .select(
      "selected_page_id, selected_page_name, page_access_token, instagram_account_id, instagram_username",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return (
      <p className="text-sm text-amber-800">
        Could not load your Facebook connection. Try refreshing. If this
        continues, contact support.
      </p>
    );
  }

  const row = raw as {
    selected_page_id: string | null;
    selected_page_name: string | null;
    page_access_token: string | null;
    instagram_account_id: string | null;
    instagram_username: string | null;
  } | null;

  if (
    !row?.selected_page_id ||
    !row.page_access_token
  ) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Facebook Page
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Connect Facebook and select a Page on{" "}
          <Link href="/dashboard/main" className="font-medium text-indigo-600 underline">
            Main
          </Link>{" "}
          to see business details here.
        </p>
      </section>
    );
  }

  const pageId = row.selected_page_id;
  const pageToken = row.page_access_token;

  const pageDetails = await fetchPagePublicDetails(pageId, pageToken);
  const igId = row.instagram_account_id;
  const igDetails =
    igId && pageToken
      ? await fetchInstagramUserPublicDetails(igId, pageToken)
      : null;

  const displayName =
    pageDetails?.name ?? row.selected_page_name ?? "Your Page";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Facebook Page</h2>
        <p className="mt-1 text-xs text-slate-500">
          Live fields from the Graph API when your Page token is valid. Manage
          connection on{" "}
          <Link href="/dashboard/main" className="text-indigo-600 underline">
            Main
          </Link>
          .
        </p>
        {!pageDetails ? (
          <p className="mt-4 text-sm text-amber-800">
            Could not load Page details from Meta (token or permissions may be
            expired). Showing saved name only:{" "}
            <strong>{row.selected_page_name ?? pageId}</strong>
          </p>
        ) : null}
        <dl className="mt-4">
          <Row term="Page name" value={displayName} />
          <Row
            term="Page ID"
            value={
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                {pageId}
              </code>
            }
          />
          {pageDetails?.category ? (
            <Row term="Category" value={pageDetails.category} />
          ) : null}
          {pageDetails?.fan_count != null ? (
            <Row
              term="Page likes"
              value={pageDetails.fan_count.toLocaleString()}
            />
          ) : null}
          {pageDetails?.about ? (
            <Row term="About" value={pageDetails.about} />
          ) : null}
          {pageDetails?.phone ? (
            <Row term="Phone" value={pageDetails.phone} />
          ) : null}
          {pageDetails?.website ? (
            <Row
              term="Website"
              value={
                <a
                  href={pageDetails.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-indigo-600 underline"
                >
                  {pageDetails.website}
                </a>
              }
            />
          ) : null}
          {pageDetails?.link ? (
            <Row
              term="On Facebook"
              value={
                <a
                  href={pageDetails.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-indigo-600 underline"
                >
                  Open Page
                </a>
              }
            />
          ) : null}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Linked Instagram
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Business or Creator account linked to this Page in Meta.
        </p>
        <dl className="mt-4">
          {!igId ? (
            <Row
              term="Status"
              value={
                <span className="text-slate-600">
                  No Instagram Business account linked to this Page, or not
                  stored. Link it in Meta and reconnect on{" "}
                  <Link
                    href="/dashboard/main"
                    className="font-medium text-indigo-600 underline"
                  >
                    Main
                  </Link>
                  .
                </span>
              }
            />
          ) : (
            <>
              <Row
                term="Username"
                value={
                  <>
                    @
                    {(igDetails?.username ?? row.instagram_username ?? "—").replace(
                      /^@/,
                      "",
                    )}
                  </>
                }
              />
              <Row
                term="Account ID"
                value={
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    {igId}
                  </code>
                }
              />
              {igDetails?.followers_count != null ? (
                <Row
                  term="Followers"
                  value={igDetails.followers_count.toLocaleString()}
                />
              ) : null}
              {igDetails?.media_count != null ? (
                <Row
                  term="Media count"
                  value={igDetails.media_count.toLocaleString()}
                />
              ) : null}
              {igDetails?.profile_picture_url ? (
                <Row
                  term="Profile"
                  value={
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={igDetails.profile_picture_url}
                      alt=""
                      className="size-16 rounded-full border border-slate-200 object-cover"
                    />
                  }
                />
              ) : null}
              {!igDetails && (
                <p className="mt-2 text-xs text-slate-500">
                  Extra Instagram stats could not be loaded (permissions or API).
                  Username may still come from your saved connection.
                </p>
              )}
            </>
          )}
        </dl>
      </section>
    </div>
  );
}
