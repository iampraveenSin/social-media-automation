import Link from "next/link";

export type PublishedPostRow = {
  id: string;
  created_at: string;
  caption: string | null;
  status: string;
  channel?: string | null;
  facebook_post_id: string | null;
  facebook_media_id: string | null;
  instagram_media_id?: string | null;
  media_summary: {
    kind?: string;
    count?: number;
    page_id?: string;
    page_name?: string | null;
    instagram_username?: string | null;
  } | null;
};

function mediaLabel(summary: PublishedPostRow["media_summary"]): string {
  const kind = summary?.kind;
  const count = summary?.count ?? 0;
  switch (kind) {
    case "video":
      return "Video";
    case "gif":
      return "GIF";
    case "single_image":
      return "Photo";
    case "multi_image":
      return count > 1 ? `${count} photos` : "Photos";
    default:
      return "Media";
  }
}

function facebookHref(row: PublishedPostRow): string | null {
  const pageId = row.media_summary?.page_id;
  const postId = row.facebook_post_id;
  if (pageId && postId) {
    return `https://www.facebook.com/${pageId}/posts/${postId}/`;
  }
  return null;
}

function instagramHref(row: PublishedPostRow): { href: string; label: string } | null {
  const u = row.media_summary?.instagram_username;
  if (u) {
    return {
      href: `https://www.instagram.com/${encodeURIComponent(u)}/`,
      label: "Instagram profile",
    };
  }
  return null;
}

function captionPreview(text: string | null, max = 140): string {
  if (!text) return "—";
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function channelLabel(row: PublishedPostRow): string {
  if (row.channel === "instagram") return "Instagram";
  return "Facebook Page";
}

export function PublishedPostsTable({ rows }: { rows: PublishedPostRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-700">No posts yet</p>
        <p className="mt-2 text-sm text-slate-500">
          Successful publishes from the Main workspace appear here with time,
          type, and links when available.
        </p>
        <Link
          href="/dashboard/main"
          className="mt-4 inline-block text-sm font-semibold text-indigo-600 underline"
        >
          Go to Main workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Channel</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Account</th>
            <th className="px-4 py-3">Caption</th>
            <th className="px-4 py-3">Link</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const fb = facebookHref(row);
            const ig = instagramHref(row);
            const when = new Date(row.created_at);
            return (
              <tr key={row.id} className="text-slate-800">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {when.toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.channel === "instagram"
                        ? "bg-pink-100 text-pink-900"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {channelLabel(row)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {mediaLabel(row.media_summary)}
                  </span>
                </td>
                <td className="max-w-[10rem] truncate px-4 py-3 text-slate-600">
                  {row.channel === "instagram" && row.media_summary?.instagram_username
                    ? `@${row.media_summary.instagram_username}`
                    : (row.media_summary?.page_name ?? "—")}
                </td>
                <td className="max-w-md px-4 py-3 text-slate-600">
                  {captionPreview(row.caption)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {fb ? (
                    <a
                      href={fb}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-indigo-600 underline"
                    >
                      View on Facebook
                    </a>
                  ) : ig ? (
                    <a
                      href={ig.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-pink-700 underline"
                    >
                      {ig.label}
                    </a>
                  ) : row.facebook_media_id ? (
                    <span
                      className="text-xs text-slate-500"
                      title={row.facebook_media_id}
                    >
                      ID: {row.facebook_media_id.slice(0, 12)}…
                    </span>
                  ) : row.instagram_media_id ? (
                    <span
                      className="text-xs text-slate-500"
                      title={row.instagram_media_id}
                    >
                      IG id: {row.instagram_media_id.slice(0, 10)}…
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
