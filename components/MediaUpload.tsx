"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import type { MediaItem } from "@/lib/types";

export function MediaUpload() {
  const { media, addMedia, removeMedia, selectedMediaId, setSelectedMediaId, selectedMediaIds, setSelectedMediaIds, toggleSelectedMediaId } = useAppStore();

  useEffect(() => {
    const unique = selectedMediaIds.filter((id, i, arr) => arr.indexOf(id) === i);
    if (unique.length !== selectedMediaIds.length) {
      setSelectedMediaIds(unique);
    }
  }, [selectedMediaIds, setSelectedMediaIds]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const item = (await res.json()) as MediaItem;
      addMedia(item);
      setSelectedMediaId(item.id);
      toggleSelectedMediaId(item.id);
    } finally {
      setUploading(false);
    }
  }, [addMedia, setSelectedMediaId, toggleSelectedMediaId]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload]
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
      e.target.value = "";
    },
    [upload]
  );

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-stone-800">Upload image</p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
          dragging ? "border-amber-400 bg-amber-50" : "border-amber-300 bg-amber-50/50"
        }`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={onFileInput}
          className="hidden"
          id="media-upload"
          disabled={uploading}
        />
        <label htmlFor="media-upload" className="cursor-pointer">
          {uploading ? (
            <span className="text-stone-600">Uploading…</span>
          ) : (
            <span className="text-stone-600">Drop an image or click to upload</span>
          )}
        </label>
      </div>

      {/* Your library — click to add to post */}
      {media.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {media.map((m) => {
              const isSelected = selectedMediaIds.includes(m.id);
              return (
                <div key={m.id} className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMediaId(m.id);
                      toggleSelectedMediaId(m.id);
                    }}
                    className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 transition ${
                      isSelected ? "border-amber-400 ring-2 ring-amber-400/30" : "border-amber-300 opacity-90 hover:opacity-100"
                    }`}
                  >
                    {m.mimeType?.startsWith("video/") ? (
                      <video
                        src={m.url.startsWith("http") ? m.url : m.url.startsWith("/") ? `${typeof window !== "undefined" ? window.location.origin : ""}${m.url}` : `${typeof window !== "undefined" ? window.location.origin : ""}/${m.url}`}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover pointer-events-none"
                      />
                    ) : (
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeMedia(m.id); }}
                    aria-label="Remove from library"
                    className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-red-500/90 text-white shadow transition hover:bg-red-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
