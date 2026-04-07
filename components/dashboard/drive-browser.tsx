"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { disconnectGoogleDrive } from "@/app/actions/google-drive";
import {
  isFolderMime,
  isGifMime,
  isImageMime,
  isVideoMime,
  type DrivePickerFile,
} from "@/lib/composer/media-types";
import { useComposer } from "./composer-context";

type Crumb = { id: string; name: string };

type DriveFile = DrivePickerFile;

function mediaLabel(m: string) {
  if (isFolderMime(m)) return "Folder";
  if (isGifMime(m)) return "GIF";
  if (isVideoMime(m)) return "Video";
  if (isImageMime(m)) return "Image";
  return "File";
}

export function DriveBrowser({ connectedAs }: { connectedAs: string | null }) {
  const { toggleDriveFile, replaceWithDriveFile, selectionSummary, items } =
    useComposer();

  const [crumbs, setCrumbs] = useState<Crumb[]>([
    { id: "root", name: "My Drive" },
  ]);
  const folderId = crumbs[crumbs.length - 1]?.id ?? "root";

  const [files, setFiles] = useState<DriveFile[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (opts: { folderId: string; pageToken?: string; append: boolean }) => {
      const u = new URL("/api/google/drive/files", window.location.origin);
      u.searchParams.set("folderId", opts.folderId);
      if (opts.pageToken) u.searchParams.set("pageToken", opts.pageToken);
      const r = await fetch(u);
      const j = (await r.json()) as {
        files?: DriveFile[];
        nextPageToken?: string | null;
        error?: string;
      };
      if (!r.ok) throw new Error(j.error || "Request failed");
      const newFiles = j.files ?? [];
      if (opts.append) {
        setFiles((prev) => [...prev, ...newFiles]);
      } else {
        setFiles(newFiles);
      }
      setNextPageToken(j.nextPageToken ?? null);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchPage({ folderId, append: false });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load Drive");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [folderId, fetchPage]);

  const openFolder = (id: string, name: string) => {
    setCrumbs((c) => [...c, { id, name }]);
  };

  const goCrumb = (index: number) => {
    setCrumbs((c) => c.slice(0, index + 1));
  };

  const loadMore = async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      await fetchPage({ folderId, pageToken: nextPageToken, append: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load more failed");
    } finally {
      setLoadingMore(false);
    }
  };

  const randomPick = async () => {
    setError(null);
    try {
      const r = await fetch("/api/google/drive/random");
      const j = (await r.json()) as {
        file?: DriveFile | null;
        error?: string;
      };
      if (!r.ok) throw new Error(j.error || "Random pick failed");
      if (!j.file) {
        setError("No image or video files found in the first search batch.");
        return;
      }
      replaceWithDriveFile(j.file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Random pick failed");
    }
  };

  const driveSelectedIds = useMemo(() => {
    const s = new Set<string>();
    for (const i of items) {
      if (i.kind === "drive") s.add(i.file.id);
    }
    return s;
  }, [items]);

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      const af = isFolderMime(a.mimeType) ? 0 : 1;
      const bf = isFolderMime(b.mimeType) ? 0 : 1;
      if (af !== bf) return af - bf;
      return a.name.localeCompare(b.name);
    });
  }, [files]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Google Drive</h2>
          {connectedAs ? (
            <p className="mt-1 text-xs text-slate-500">Connected as {connectedAs}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={randomPick}
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-900 transition hover:bg-indigo-100"
          >
            Random pick
          </button>
          <form action={disconnectGoogleDrive}>
            <button
              type="submit"
              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-50"
            >
              Disconnect Drive
            </button>
          </form>
        </div>
      </div>

      <nav
        className="mt-4 flex flex-wrap items-center gap-1 text-sm text-slate-600"
        aria-label="Breadcrumb"
      >
        {crumbs.map((c, i) => (
          <span key={`${c.id}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <span className="text-slate-300">/</span> : null}
            <button
              type="button"
              onClick={() => goCrumb(i)}
              className={`rounded px-1 py-0.5 hover:bg-slate-100 hover:text-slate-900 ${
                i === crumbs.length - 1 ? "font-semibold text-slate-900" : ""
              }`}
            >
              {c.name}
            </button>
          </span>
        ))}
      </nav>

      <p className="mt-3 text-xs text-slate-500">{selectionSummary}</p>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50">
        {loading ? (
          <p className="p-6 text-center text-sm text-slate-500">Loading…</p>
        ) : sortedFiles.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            No folders or media in this location.
          </p>
        ) : (
          <div className="max-h-[26rem] overflow-y-auto">
            <ul className="divide-y divide-slate-100">
              {sortedFiles.map((f) => (
                <li key={f.id}>
                  {isFolderMime(f.mimeType) ? (
                    <button
                      type="button"
                      onClick={() => openFolder(f.id, f.name)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-white"
                    >
                      <span className="text-lg text-amber-600" aria-hidden>
                        📁
                      </span>
                      <span className="font-medium text-slate-900">{f.name}</span>
                      <span className="ml-auto text-xs text-slate-400">Open</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleDriveFile(f)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-white"
                    >
                      {f.thumbnailLink ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={f.thumbnailLink}
                          alt=""
                          className="size-10 shrink-0 rounded-md object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-200 text-[10px] font-semibold text-slate-600">
                          {isGifMime(f.mimeType)
                            ? "GIF"
                            : isVideoMime(f.mimeType)
                              ? "VID"
                              : "IMG"}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-900">
                          {f.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {mediaLabel(f.mimeType)}
                        </span>
                      </span>
                      {driveSelectedIds.has(f.id) ? (
                        <span className="text-xs font-semibold text-indigo-600">
                          Selected
                        </span>
                      ) : null}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {nextPageToken ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </section>
  );
}
