"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { SELECTION_MESSAGE_MULTI_VIDEO_GIF } from "@/store/useAppStore";
import type { MediaItem } from "@/lib/types";

/** Manual upload: multi-select for images only. Store enforces video/GIF rules. */

export function MediaUpload() {
  const { media, addMedia, removeMedia, setSelectedMediaId, selectedMediaIds, setSelectedMediaIds, toggleSelectedMediaId } = useAppStore();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unique = selectedMediaIds.filter((id, i, arr) => arr.indexOf(id) === i);
    if (unique.length !== selectedMediaIds.length) setSelectedMediaIds(unique);
  }, [selectedMediaIds, setSelectedMediaIds]);

  const upload = useCallback(async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const item = (await res.json()) as MediaItem;
      addMedia(item);
      const alreadyMulti = selectedMediaIds.length >= 1;
      const isVideoOrGif = item.mimeType?.startsWith("video/") || item.mimeType === "image/gif";
      const skipVideoOrGifInMulti = alreadyMulti && isVideoOrGif;
      if (!skipVideoOrGifInMulti) {
        setSelectedMediaId(item.id);
        toggleSelectedMediaId(item.id);
      } else {
        useAppStore.getState().setSelectionMessage(SELECTION_MESSAGE_MULTI_VIDEO_GIF);
      }
    } finally {
      setUploading(false);
    }
  }, [addMedia, setSelectedMediaId, toggleSelectedMediaId, selectedMediaIds.length]);

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
      <p className="text-sm font-medium text-stone-800">Upload image, video or GIF</p>
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
          accept="image/*,video/mp4,video/quicktime,video/webm,video/x-msvideo"
          onChange={onFileInput}
          className="hidden"
          id="media-upload"
          disabled={uploading}
        />
        <label htmlFor="media-upload" className="cursor-pointer">
          {uploading ? (
            <span className="text-stone-600">Uploading…</span>
          ) : (
            <span className="text-stone-600">Drop an image, video or GIF, or click to upload</span>
          )}
        </label>
      </div>

    </div>
  );
}
