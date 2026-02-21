"use client";

import { useAppStore } from "@/store/useAppStore";
import type { MediaItem } from "@/lib/types";

/** Luxury Instagram-style post preview for the composer. */
export function PostPreview() {
  const { media, selectedMediaIds, caption, hashtags } = useAppStore();
  const selected = selectedMediaIds.length > 0
    ? selectedMediaIds.map((id) => media.find((m) => m.id === id)).filter(Boolean) as MediaItem[]
    : [];
  const first = selected[0];
  const firstUrl = first?.url;
  const displayUrl = firstUrl?.startsWith("http") ? firstUrl : firstUrl ? `${typeof window !== "undefined" ? window.location.origin : ""}${firstUrl}` : null;
  const isVideo = first?.mimeType?.startsWith("video/") ?? false;
  const captionLine = [caption, ...(Array.isArray(hashtags) ? hashtags : [])].filter(Boolean).join(" ") || "Your caption will appear here…";

  return (
    <div className="rounded-2xl border border-amber-200 bg-[#fffef9] p-4 shadow-xl">
      <p className="font-display text-xs font-medium tracking-[0.2em] uppercase text-amber-800 mb-3">Preview</p>
      <div className="aspect-square max-w-[280px] mx-auto rounded-xl overflow-hidden bg-stone-100 border border-amber-200">
        {displayUrl ? (
          isVideo ? (
            <video
              src={displayUrl}
              controls
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={displayUrl}
              alt="Post preview"
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-500 text-sm">No media</div>
        )}
      </div>
      <p className="mt-3 text-stone-700 text-sm leading-relaxed line-clamp-3 font-sans">
        {captionLine}
      </p>
    </div>
  );
}
