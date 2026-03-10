"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { buildCollageBlob } from "@/lib/collage";
import type { MediaItem } from "@/lib/types";

function toDisplayUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (typeof window === "undefined") return url;
  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Post preview: multiple images → collage; single video → video; never collage with videos or GIFs. */
export function PostPreview() {
  const { media, selectedMediaIds, caption, hashtags } = useAppStore();
  const selected = selectedMediaIds.length > 0
    ? selectedMediaIds.map((id) => media.find((m) => m.id === id)).filter(Boolean) as MediaItem[]
    : [];
  const first = selected[0];
  const isVideo = first?.mimeType?.startsWith("video/") ?? false;
  const selectedImages = selected.filter(
    (m) => m?.mimeType?.startsWith("image/") && m.mimeType !== "image/gif"
  );
  const showCollage = selectedImages.length >= 2;
  const [collageUrl, setCollageUrl] = useState<string | null>(null);
  const collageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!showCollage) {
      if (collageUrlRef.current) {
        URL.revokeObjectURL(collageUrlRef.current);
        collageUrlRef.current = null;
      }
      setCollageUrl(null);
      return;
    }
    const urls = selectedImages.map((m) => toDisplayUrl(m?.url)).filter(Boolean) as string[];
    if (urls.length < 2) return;
    let cancelled = false;
    buildCollageBlob(urls).then((blob) => {
      if (cancelled) return;
      if (collageUrlRef.current) URL.revokeObjectURL(collageUrlRef.current);
      const url = URL.createObjectURL(blob);
      collageUrlRef.current = url;
      setCollageUrl(url);
    }).catch(() => {
      if (!cancelled) setCollageUrl(null);
    });
    return () => {
      cancelled = true;
      if (collageUrlRef.current) {
        URL.revokeObjectURL(collageUrlRef.current);
        collageUrlRef.current = null;
      }
    };
  }, [showCollage, selectedMediaIds.join(",")]);

  const singleDisplayUrl = toDisplayUrl(first?.url);
  const displayUrl = showCollage && collageUrl ? collageUrl : singleDisplayUrl;
  const selectedVideosOrGifs = selected.filter(
    (m) => m?.mimeType?.startsWith("video/") || m?.mimeType === "image/gif"
  );
  const hasVideoOrGifInSelection = selectedVideosOrGifs.length > 0;
  const videoOrGifDisplayUrl = hasVideoOrGifInSelection ? toDisplayUrl(selectedVideosOrGifs[0]?.url) : null;
  const captionLine = [caption, ...(Array.isArray(hashtags) ? hashtags : [])].filter(Boolean).join(" ") || "Your caption will appear here…";
  const showBothHint = showCollage && hasVideoOrGifInSelection;
  const videoExcludedHint = hasVideoOrGifInSelection && !showCollage && selected.length > 1;

  return (
    <div className="rounded-2xl border border-amber-200 bg-[#fffef9] p-4 shadow-xl">
      <p className="font-display text-xs font-medium tracking-[0.2em] uppercase text-amber-800 mb-3">Preview</p>
      <div className="space-y-3">
        <div className="aspect-square max-w-[280px] mx-auto rounded-xl overflow-hidden bg-stone-100 border border-amber-200">
          {displayUrl ? (
            isVideo && !showCollage ? (
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
        {showBothHint && videoOrGifDisplayUrl && (
          <>
            <p className="text-[10px] text-amber-700 font-medium">Video or GIF in selection (not included in post)</p>
            <div className="aspect-video max-w-[280px] mx-auto rounded-xl overflow-hidden bg-stone-100 border border-amber-200">
              {selectedVideosOrGifs[0]?.mimeType === "image/gif" ? (
                <img src={videoOrGifDisplayUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <video
                  src={videoOrGifDisplayUrl}
                  controls
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </>
        )}
        {videoExcludedHint && (
          <p className="text-[10px] text-amber-700">Only images are posted. Video or GIF excluded.</p>
        )}
      </div>
      <p className="mt-3 text-stone-700 text-sm leading-relaxed line-clamp-3 font-sans">
        {captionLine}
      </p>
    </div>
  );
}
