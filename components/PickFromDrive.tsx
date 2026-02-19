"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";

interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
}

interface PickFromDriveProps {
  connected: boolean;
  /** Current Drive folder ID (for round-robin: no repeat until all posted). */
  folderId?: string | null;
}

export function PickFromDrive({ connected, folderId }: PickFromDriveProps) {
  const { addMedia, setSelectedMediaId, addSelectedMediaId } = useAppStore();
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadImages = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/drive/images");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load images");
      setFiles(Array.isArray(data.files) ? data.files : []);
      setLoadedOnce(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load images");
      setFiles([]);
      setLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  };

  const pickFile = async (fileId: string) => {
    setError(null);
    setPicking(fileId);
    try {
      const res = await fetch("/api/drive/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to use image");
      addMedia(data);
      setSelectedMediaId(data.id);
      addSelectedMediaId(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to use image");
    } finally {
      setPicking(null);
    }
  };

  const pickRandom = async () => {
    if (files.length === 0) return;
    setError(null);
    try {
      const qs = folderId != null ? `?folderId=${encodeURIComponent(folderId)}` : "";
      const res = await fetch(`/api/drive/posted-ids${qs}`);
      const data = await res.json().catch(() => ({ postedIds: [] }));
      const postedIds: string[] = Array.isArray(data.postedIds) ? data.postedIds : [];
      const fileIds = files.map((f) => f.id);
      let notYetPosted = fileIds.filter((id) => !postedIds.includes(id));
      if (notYetPosted.length === 0) {
        await fetch("/api/drive/clear-round", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: folderId ?? null }),
        });
        notYetPosted = fileIds;
      }
      const pool = notYetPosted.length > 0 ? notYetPosted : fileIds;
      const nextId = pool[Math.floor(Math.random() * pool.length)];
      await pickFile(nextId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to pick random");
    }
  };

  if (!connected) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-white/80">Pick image from Drive</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadImages}
            disabled={loading}
            className="rounded-xl bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-300 transition hover:bg-sky-500/30 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load images"}
          </button>
          {files.length > 0 && (
            <button
              type="button"
              onClick={pickRandom}
              disabled={!!picking}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
            >
              {picking ? "Adding…" : "Pick random"}
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {files.length > 0 && (
        <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
          {files.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => pickFile(f.id)}
              disabled={picking !== null}
              className="relative aspect-square overflow-hidden rounded-xl border border-white/15 transition hover:border-sky-400/50 disabled:opacity-50"
            >
              {f.thumbnailLink ? (
                <img src={f.thumbnailLink} alt={f.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/50 text-xs">No preview</div>
              )}
              {picking === f.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white">Adding…</div>
              )}
            </button>
          ))}
        </div>
      )}
      {!loading && files.length === 0 && connected && (
        <p className="text-xs text-white/40">
          {loadedOnce
            ? "No images found here. Your images might be in a subfolder: open that folder in Google Drive, copy the link from the address bar (e.g. …/folders/xxxxx), paste it in the “Connect Drive” section above, click Save folder, then Load images again. Supported: JPG, PNG, GIF, WebP, BMP."
            : "Click “Load images” to show images from your Drive. If your images are in a folder (not the root), paste that folder’s link above and click Save folder first."}
        </p>
      )}
    </motion.div>
  );
}
