"use client";

import { useEffect, useState } from "react";

interface InstagramProfileData {
  profile: {
    id: string;
    username: string;
    name: string;
    biography: string;
    profilePictureUrl: string | null;
  };
  media: Array<{
    id: string;
    caption: string;
    mediaType: string;
    mediaUrl?: string;
    thumbnailUrl?: string;
    permalink?: string;
    timestamp?: string;
  }>;
}

interface InstagramProfilePanelProps {
  connected: boolean;
}

export function InstagramProfilePanel({ connected }: InstagramProfilePanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InstagramProfileData | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/instagram/profile", { credentials: "include" });
      const payload = (await res.json().catch(() => ({}))) as InstagramProfileData & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to fetch Instagram profile");
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch Instagram profile");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!connected) return;
    load();
  }, [connected]);

  if (!connected) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-[#fffef9] p-6 shadow-xl">
        <p className="text-sm text-stone-700">Connect Instagram to view profile info and existing posts.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-[#fffef9] p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl text-stone-800">Instagram Profile</h3>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {data && (
        <>
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-start gap-3">
              {data.profile.profilePictureUrl ? (
                <img
                  src={data.profile.profilePictureUrl}
                  alt="Instagram profile"
                  className="h-14 w-14 rounded-xl border border-amber-300 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100 text-lg">📷</div>
              )}
              <div>
                <p className="text-sm font-semibold text-stone-800">@{data.profile.username}</p>
                {data.profile.name && <p className="text-xs text-stone-700">{data.profile.name}</p>}
                {data.profile.biography && <p className="mt-1 text-xs text-stone-600 line-clamp-3">{data.profile.biography}</p>}
              </div>
            </div>
          </div>

          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-stone-600">Existing Instagram posts</p>
          {data.media.length === 0 ? (
            <p className="text-sm text-stone-600">No media returned for this account.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {data.media.map((m) => {
                const preview = m.mediaType === "VIDEO" || m.mediaType === "REELS" ? m.thumbnailUrl || m.mediaUrl : m.mediaUrl;
                return (
                  <div key={m.id} className="rounded-xl border border-amber-200 bg-white p-2">
                    <div className="aspect-square overflow-hidden rounded-lg bg-stone-100">
                      {preview ? (
                        <img src={preview} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-stone-500">No preview</div>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-stone-700">{m.caption || "(No caption)"}</p>
                    {m.permalink && (
                      <a
                        href={m.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-amber-700 hover:underline"
                      >
                        Open on Instagram
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

