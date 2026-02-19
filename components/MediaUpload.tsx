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

  const uniqueSelectedIds = selectedMediaIds.filter((id, i, arr) => arr.indexOf(id) === i);
  const selectedItemsRaw = uniqueSelectedIds.map((id) => media.find((m) => m.id === id)).filter(Boolean) as MediaItem[];
  const seenIds = new Set<string>();
  const selectedItems = selectedItemsRaw.filter((m) => {
    if (seenIds.has(m.id)) return false;
    seenIds.add(m.id);
    return true;
  });

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-white/80">Upload image</p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
          dragging ? "border-amber-400/50 bg-amber-400/10" : "border-white/15 bg-white/5"
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
            <span className="text-white/70">Uploading…</span>
          ) : (
            <span className="text-white/70">Drop an image or click to upload</span>
          )}
        </label>
      </div>

      {/* Only selected images for the post — empty until user selects */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-white/80">Selected for this post</p>
        {selectedItems.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
            No images selected. Click an image below or upload above to add to your post.
          </p>
        ) : (
          <>
            <p className="text-xs text-amber-400/90">
              {selectedItems.length === 1
                ? "1 image selected for the post."
                : `${selectedItems.length} images — will be combined into one collage.`}
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedItems.map((m, index) => (
                <div key={`selected-${m.id}-${index}`} className="relative inline-block">
                  <div className="relative h-20 w-20 overflow-hidden rounded-xl border-2 border-amber-400 ring-2 ring-amber-400/30">
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                    <span className="absolute bottom-0 left-0 rounded-tr bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-black shadow">
                      {index + 1}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSelectedMediaId(m.id)}
                    aria-label="Remove from post"
                    className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-red-500/90 text-white shadow transition hover:bg-red-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
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
                      isSelected ? "border-amber-400 ring-2 ring-amber-400/30" : "border-white/15 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
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
