"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { SELECTION_MESSAGE_MULTI_VIDEO_GIF } from "@/store/useAppStore";

/** Pick from Drive: multi-select for images only. Store enforces video/GIF rules. */

interface DriveFolderItem {
  id: string;
  name: string;
}

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
  const { addMedia, setSelectedMediaId, setSelectedMediaIds, addSelectedMediaId, selectedMediaIds, media, setSelectionMessage } = useAppStore();
  const [folders, setFolders] = useState<DriveFolderItem[]>([]);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([{ id: "root", name: "My Drive" }]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentFolderId = folderStack[folderStack.length - 1]?.id ?? "root";

  const loadFolder = async (targetFolderId: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/drive/browse?folderId=${encodeURIComponent(targetFolderId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setFolders(Array.isArray(data.folders) ? data.folders : []);
      setFiles(Array.isArray(data.files) ? data.files : []);
      setLoadedOnce(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setFolders([]);
      setFiles([]);
      setLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentFolder = () => loadFolder(currentFolderId);

  const openFolder = (id: string, name: string) => {
    setFolderStack((prev) => [...prev, { id, name }]);
    loadFolder(id);
  };

  const goBack = () => {
    if (folderStack.length <= 1) return;
    setFolderStack((prev) => prev.slice(0, -1));
    const parent = folderStack[folderStack.length - 2];
    if (parent) loadFolder(parent.id);
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
      if (!res.ok) throw new Error(data.error ?? "Failed to use media");
      addMedia(data);
      const isVideoOrGif = data.mimeType?.startsWith("video/") || data.mimeType === "image/gif";
      const alreadyMulti = selectedMediaIds.length >= 1;
      if (isVideoOrGif && alreadyMulti) {
        setSelectionMessage(SELECTION_MESSAGE_MULTI_VIDEO_GIF);
        return;
      }
      const singleSelected = media.find((m) => m.id === selectedMediaIds[0]);
      const singleIsVideoOrGif = singleSelected && (singleSelected.mimeType?.startsWith("video/") || singleSelected.mimeType === "image/gif");
      const replaceWithImage = !isVideoOrGif && selectedMediaIds.length === 1 && singleIsVideoOrGif;
      if (replaceWithImage) {
        setSelectedMediaIds([data.id]);
        setSelectedMediaId(data.id);
      } else {
        setSelectedMediaId(data.id);
        addSelectedMediaId(data.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to use media");
    } finally {
      setPicking(null);
    }
  };

  const pickRandom = async () => {
    setError(null);
    try {
      const res = await fetch("/api/drive/pick-random", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: folderId ?? undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to pick random");
      }
      const fileId = data.fileId as string | undefined;
      if (!fileId) throw new Error("No file returned");
      await pickFile(fileId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to pick random");
    }
  };

  if (!connected) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-2xl border border-amber-200 bg-[#fffef9] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-800">Pick from Google Drive</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadCurrentFolder}
            disabled={loading}
            className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-200 disabled:opacity-50"
          >
            {loading ? "Loading…" : loadedOnce ? "Refresh" : "Browse Drive"}
          </button>
          {connected && (
            <button
              type="button"
              onClick={pickRandom}
              disabled={!!picking}
              className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
            >
              {picking ? "Adding…" : "Pick random"}
            </button>
          )}
        </div>
      </div>

      {folderStack.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {folderStack.map((f, i) => (
            <span key={`${i}-${f.id}`} className="flex items-center gap-1">
              {i > 0 && <span className="text-stone-400">/</span>}
              {i === folderStack.length - 1 ? (
                <span className="font-medium text-amber-800">{f.name}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setFolderStack((prev) => prev.slice(0, i + 1));
                    loadFolder(f.id);
                  }}
                  className="text-stone-600 hover:text-amber-800 hover:underline"
                >
                  {f.name}
                </button>
              )}
            </span>
          ))}
          <button
            type="button"
            onClick={goBack}
            className="ml-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800 hover:bg-amber-100"
          >
            ← Back
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-700">{error}</p>}

      {(folders.length > 0 || files.length > 0) && (
        <div className="space-y-3">
          {folders.length > 0 && (
            <div>
              <p className="text-xs font-medium text-stone-600 mb-2">Folders</p>
              <div className="flex flex-wrap gap-2">
                {folders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => openFolder(f.id, f.name)}
                    className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-2.5 text-sm text-stone-800 transition hover:border-amber-400 hover:bg-amber-100"
                  >
                    <span className="text-lg">📁</span>
                    <span className="truncate max-w-[180px]">{f.name}</span>
                    <span className="text-amber-600">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {files.length > 0 && (
            <div>
              <p className="text-xs font-medium text-stone-600 mb-2">Images & videos (click to use)</p>
              <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
                {files.map((f) => {
                  const isVideo = f.mimeType?.startsWith("video/");
                  const isImage = f.mimeType?.startsWith("image/");
                  const isGif = f.mimeType === "image/gif";
                  const showThumb = isImage || isVideo;
                  const thumbSrc = showThumb ? `/api/drive/thumbnail?fileId=${encodeURIComponent(f.id)}` : null;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => pickFile(f.id)}
                      disabled={picking !== null}
                      className="relative aspect-square overflow-hidden rounded-xl border border-amber-200 bg-stone-50 transition hover:border-amber-400 disabled:opacity-50"
                    >
                      {showThumb && thumbSrc ? (
                        <>
                          <img
                            src={thumbSrc}
                            alt={f.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                              if (fallback) {
                                fallback.classList.remove("hidden");
                                fallback.classList.add("flex");
                              }
                            }}
                          />
                          <div className="absolute inset-0 hidden flex-col items-center justify-center gap-1 bg-stone-50 p-2 text-stone-600">
                            <span className="text-2xl" aria-hidden>{isVideo ? "🎬" : isGif ? "🔄" : "🖼️"}</span>
                            <span className="truncate w-full text-center text-[10px] leading-tight">{f.name}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-stone-600">
                          <span className="text-2xl" aria-hidden>
                            {isVideo ? "🎬" : isImage ? "🖼️" : "📄"}
                          </span>
                          <span className="truncate w-full text-center text-[10px] leading-tight">{f.name}</span>
                        </div>
                      )}
                      {isVideo && (
                        <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">Video</div>
                      )}
                      {picking === f.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white">Adding…</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && folders.length === 0 && files.length === 0 && connected && (
        <p className="text-xs text-stone-600">
          {loadedOnce
            ? "No folders or media in this folder. Go back or try another folder. Supported files: JPG, PNG, GIF, WebP, BMP, MP4, MOV, WebM."
            : "Click “Browse Drive” to see your folders and files. Open a folder, then click an image or video to use it."}
        </p>
      )}
    </motion.div>
  );
}
