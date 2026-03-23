"use client";

import { useEffect, useMemo, useState } from "react";

interface EngagementPost {
  id: string;
  message: string;
  createdTime?: string;
  fullPicture?: string;
  permalinkUrl?: string;
  reactionsCount: number;
  commentsCount: number;
  sharesCount: number;
}

interface EngagementResponse {
  page: {
    id: string;
    name: string;
    fanCount: number;
  };
  posts: EngagementPost[];
}

interface PageEngagementPanelProps {
  connected: boolean;
}

export function PageEngagementPanel({ connected }: PageEngagementPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EngagementResponse | null>(null);

  const totalEngagement = useMemo(() => {
    if (!data) return 0;
    return data.posts.reduce((sum, p) => sum + p.reactionsCount + p.commentsCount + p.sharesCount, 0);
  }, [data]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/page/engagement", { credentials: "include" });
      const payload = (await res.json().catch(() => ({}))) as EngagementResponse & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load engagement");
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load engagement");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!connected) return;
    refresh();
  }, [connected]);

  if (!connected) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-[#fffef9] p-6 shadow-xl">
        <p className="text-sm text-stone-700">Connect Instagram/Facebook to view Page posts and engagement metrics.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-[#fffef9] p-6 shadow-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl text-stone-800">Page Engagement</h3>
          <p className="text-xs text-stone-600">Posts fetched from your connected Facebook Page.</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {data && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <p className="text-xs uppercase tracking-wide text-stone-600">Page</p>
            <p className="mt-1 text-sm font-semibold text-stone-800">{data.page.name}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <p className="text-xs uppercase tracking-wide text-stone-600">Followers</p>
            <p className="mt-1 text-sm font-semibold text-stone-800">{data.page.fanCount.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <p className="text-xs uppercase tracking-wide text-stone-600">Total Engagement</p>
            <p className="mt-1 text-sm font-semibold text-stone-800">{totalEngagement.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {!loading && data && data.posts.length === 0 && (
          <p className="text-sm text-stone-600">No recent posts found on this Page.</p>
        )}
        {data?.posts.map((post) => (
          <div key={post.id} className="rounded-xl border border-amber-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="line-clamp-3 text-sm text-stone-800">
                {post.message || "(No text content)"}
              </p>
              <div className="flex gap-2 text-xs">
                <span className="rounded bg-amber-100 px-2 py-1 text-amber-900">Reactions: {post.reactionsCount}</span>
                <span className="rounded bg-amber-100 px-2 py-1 text-amber-900">Comments: {post.commentsCount}</span>
                <span className="rounded bg-amber-100 px-2 py-1 text-amber-900">Shares: {post.sharesCount}</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
              <span>{post.createdTime ? new Date(post.createdTime).toLocaleString() : "Unknown date"}</span>
              {post.permalinkUrl && (
                <a href={post.permalinkUrl} target="_blank" rel="noreferrer" className="text-amber-700 hover:underline">
                  View post on Facebook
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

