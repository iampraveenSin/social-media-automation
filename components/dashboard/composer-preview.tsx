"use client";

import { useCallback, useId, useState } from "react";
import {
  composerItemMime,
  isCollageImageMime,
  isGifMime,
  isVideoMime,
} from "@/lib/composer/media-types";
import {
  driveComposePreviewUrl,
  driveMediaUrlForComposer,
  driveRawFileUrl,
} from "@/lib/composer/compose-preview-url";
import { needsRasterPreviewConversion } from "@/lib/composer/needs-browser-preview";
import { postMediaUploadErrorMessage } from "@/lib/composer/post-media-storage-error";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  ComposerMetaPublish,
  type MetaAccountSummary,
} from "./composer-meta-publish";
import {
  composerItemKey,
  type ComposerItem,
  type LogoCorner,
  useComposer,
} from "./composer-context";

function mediaSrc(item: ComposerItem): string {
  if (item.kind === "upload") return item.previewUrl;
  return driveMediaUrlForComposer(item.file);
}

function chipThumbSrc(it: ComposerItem): string | null {
  if (it.kind === "upload") return it.previewUrl;
  if (it.kind === "drive") {
    if (needsRasterPreviewConversion(it.file.mimeType, it.file.name)) {
      return driveComposePreviewUrl(it.file);
    }
    return it.file.thumbnailLink ?? driveRawFileUrl(it.file);
  }
  return null;
}

function cornerClass(c: LogoCorner): string {
  switch (c) {
    case "tl":
      return "left-3 top-3";
    case "tr":
      return "right-3 top-3";
    case "bl":
      return "bottom-3 left-3";
    case "br":
      return "bottom-3 right-3";
    default:
      return "bottom-3 right-3";
  }
}

function CollageGrid({ items }: { items: ComposerItem[] }) {
  const n = items.length;
  const showExtra = n > 4;
  const visible = showExtra ? items.slice(0, 4) : items;
  const extra = n - 4;

  if (n === 1) {
    const it = visible[0]!;
    return (
      <div className="relative aspect-square max-h-[min(24rem,70vh)] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaSrc(it)}
          alt=""
          className="size-full object-cover"
        />
      </div>
    );
  }

  if (n === 2) {
    return (
      <div className="grid min-h-[200px] grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-2 shadow-inner">
        {visible.map((it) => (
          <div
            key={composerItemKey(it)}
            className="relative min-h-[120px] overflow-hidden rounded-xl bg-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaSrc(it)}
              alt=""
              className="size-full object-cover"
            />
          </div>
        ))}
      </div>
    );
  }

  if (n === 3) {
    const [a, b, c] = visible;
    return (
      <div className="grid min-h-[220px] grid-cols-2 grid-rows-2 gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-2 shadow-inner">
        <div className="relative row-span-2 min-h-[120px] overflow-hidden rounded-xl bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaSrc(a!)} alt="" className="size-full object-cover" />
        </div>
        <div className="relative min-h-[100px] overflow-hidden rounded-xl bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaSrc(b!)} alt="" className="size-full object-cover" />
        </div>
        <div className="relative min-h-[100px] overflow-hidden rounded-xl bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaSrc(c!)} alt="" className="size-full object-cover" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[220px] grid-cols-2 grid-rows-2 gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-2 shadow-inner">
      {visible.map((it, idx) => (
        <div
          key={composerItemKey(it)}
          className="relative min-h-[100px] overflow-hidden rounded-xl bg-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaSrc(it)}
            alt=""
            className="size-full object-cover"
          />
          {showExtra && idx === 3 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/55 text-lg font-bold text-white">
              +{extra}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

const defaultMetaAccount: MetaAccountSummary = {
  pageName: null,
  instagramUsername: null,
  instagramConnected: false,
};

export function ComposerPreview({
  metaAccount = defaultMetaAccount,
}: {
  metaAccount?: MetaAccountSummary;
}) {
  const {
    items,
    removeItem,
    clearAll,
    addSingleUpload,
    setUploadStoragePath,
    selectionSummary,
    logoPreviewUrl,
    logoCorner,
    setLogoCorner,
    setLogoFile,
  } = useComposer();

  const dropId = useId();
  const [dragOver, setDragOver] = useState(false);
  const [storageNote, setStorageNote] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  const uploadFileToPostMedia = useCallback(async (file: File) => {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        error: "Sign in to upload files for your post.",
      } as const;
    }
    const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
    const path = `${user.id}/${crypto.randomUUID()}-${safe || "file"}`;
    const { error } = await supabase.storage.from("post_media").upload(path, file);
    if (error) {
      return { error: postMediaUploadErrorMessage(error) } as const;
    }
    return { path } as const;
  }, []);

  const onPickFiles = useCallback(
    async (list: FileList | File[] | null) => {
      if (!list || (Array.isArray(list) ? list.length === 0 : list.length === 0))
        return;
      const arr = Array.from(list as FileList | File[]);
      setStorageNote(null);
      setUploadBusy(true);
      try {
        for (const file of arr) {
          const uploadId = await addSingleUpload(file);
          if (!uploadId) continue;
          const result = await uploadFileToPostMedia(file);
          if ("error" in result) {
            setStorageNote(result.error ?? "Upload failed.");
            break;
          }
          setUploadStoragePath(uploadId, result.path);
        }
      } catch (e) {
        setStorageNote(
          e instanceof Error ? e.message : "Could not upload to storage.",
        );
      } finally {
        setUploadBusy(false);
      }
    },
    [addSingleUpload, setUploadStoragePath, uploadFileToPostMedia],
  );

  const hasVideo = items.some((i) => isVideoMime(composerItemMime(i)));
  const hasGif = items.some((i) => isGifMime(composerItemMime(i)));
  const collageImages = items.filter((i) =>
    isCollageImageMime(composerItemMime(i)),
  );
  const showCollage =
    items.length > 0 && !hasVideo && !hasGif && collageImages.length === items.length;
  const showLogoOnPreview =
    Boolean(logoPreviewUrl) && showCollage && collageImages.length >= 1;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Composer</h2>
          <p className="mt-1 text-xs text-slate-500">{selectionSummary}</p>
        </div>
        <button
          type="button"
          onClick={clearAll}
          disabled={items.length === 0}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
        >
          Clear media
        </button>
      </div>

      {items.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((it) => {
            const key = composerItemKey(it);
            const name =
              it.kind === "drive" ? it.file.name : it.file.name;
            const thumb = chipThumbSrc(it);
            return (
              <div
                key={key}
                className="group relative inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1 pl-1 pr-8 text-xs text-slate-800"
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt=""
                    className="size-9 rounded-md object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex size-9 items-center justify-center rounded-md bg-slate-200 text-[10px] font-medium text-slate-600">
                    {it.kind === "drive"
                      ? isVideoMime(it.file.mimeType)
                        ? "VD"
                        : isGifMime(it.file.mimeType)
                          ? "GF"
                          : "IM"
                      : "UP"}
                  </span>
                )}
                <span className="max-w-[10rem] truncate font-medium">{name}</span>
                {it.kind === "upload" && !it.storagePath ? (
                  <span className="shrink-0 text-[10px] font-medium text-amber-700">
                    Syncing…
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeItem(key)}
                  className="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-red-100 hover:text-red-700"
                  aria-label={`Remove ${name}`}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_minmax(0,280px)]">
        <div>
          <label
            htmlFor={dropId}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOver(false);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void onPickFiles(e.dataTransfer.files);
            }}
            className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
              dragOver
                ? "border-indigo-400 bg-indigo-50/80"
                : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
            }`}
          >
            <input
              id={dropId}
              type="file"
              accept="image/*,video/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                void onPickFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <span className="text-sm font-semibold text-slate-800">
              {uploadBusy ? "Uploading…" : "Drop images or video here"}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              Or click to choose — files are saved privately to your account when
              you&apos;re signed in
            </span>
          </label>
          {storageNote ? (
            <p className="mt-2 text-xs font-medium text-amber-800" role="status">
              {storageNote}
            </p>
          ) : null}

          <div className="relative mt-6 min-h-[200px] overflow-hidden rounded-2xl bg-slate-900/5 p-4">
            {items.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                Preview appears when you pick Drive files or uploads.
              </p>
            ) : hasVideo ? (
              <video
                key={mediaSrc(items[0]!)}
                src={mediaSrc(items[0]!)}
                controls
                className="mx-auto max-h-[min(24rem,65vh)] w-full rounded-xl border border-slate-200 bg-black object-contain"
              />
            ) : hasGif ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaSrc(items[0]!)}
                alt=""
                className="mx-auto max-h-[min(24rem,65vh)] w-auto rounded-xl border border-slate-200 object-contain"
              />
            ) : showCollage ? (
              <div className="relative mx-auto max-w-lg">
                <CollageGrid items={collageImages} />
                {showLogoOnPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreviewUrl!}
                    alt=""
                    className={`absolute max-h-[22%] max-w-[35%] object-contain drop-shadow-md ${cornerClass(logoCorner)}`}
                  />
                ) : null}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-600">
                Unsupported mix of files for this preview.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Logo overlay
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Shown on static image collages. It is included in the baked PNG when
              you publish, schedule, or generate captions (not for video or GIF).
            </p>
            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-700"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setLogoFile(f);
                e.target.value = "";
              }}
            />
            {logoPreviewUrl ? (
              <button
                type="button"
                onClick={() => setLogoFile(null)}
                className="mt-2 text-xs font-medium text-red-700 underline"
              >
                Remove logo
              </button>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Corner
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  ["tl", "Top left"],
                  ["tr", "Top right"],
                  ["bl", "Bottom left"],
                  ["br", "Bottom right"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLogoCorner(id)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                    logoCorner === id
                      ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ComposerMetaPublish metaAccount={metaAccount} />
    </section>
  );
}
