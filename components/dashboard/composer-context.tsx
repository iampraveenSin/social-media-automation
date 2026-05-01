"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  composerItemMime,
  isCollageImageMime,
  isComposerUploadMedia,
  isGifMime,
  isImageMime,
  isVideoMime,
  type DrivePickerFile,
} from "@/lib/composer/media-types";
import { createUploadComposerItem } from "@/lib/composer/upload-preview";

export type ComposerItem =
  | { kind: "drive"; file: DrivePickerFile }
  | {
      kind: "upload";
      id: string;
      file: File;
      previewUrl: string;
      /** Set after a successful `post_media` upload (needed to publish). */
      storagePath?: string;
    };

export type LogoCorner = "tl" | "tr" | "bl" | "br";

function applyComposerItem(
  prev: ComposerItem[],
  item: ComposerItem,
): ComposerItem[] {
  const mime = composerItemMime(item);
  if (isVideoMime(mime) || isGifMime(mime)) {
    return [item];
  }
  if (isImageMime(mime)) {
    const blocked = prev.some((p) => {
      const m = composerItemMime(p);
      return isVideoMime(m) || isGifMime(m);
    });
    if (blocked) return [item];

    if (item.kind === "drive") {
      const exists = prev.some(
        (p) => p.kind === "drive" && p.file.id === item.file.id,
      );
      if (exists) {
        return prev.filter(
          (p) => !(p.kind === "drive" && p.file.id === item.file.id),
        );
      }
    } else {
      const exists = prev.some(
        (p) => p.kind === "upload" && p.id === item.id,
      );
      if (exists) {
        return prev.filter(
          (p) => !(p.kind === "upload" && p.id === item.id),
        );
      }
    }
    return [...prev, item];
  }
  return prev;
}

export function composerItemKey(item: ComposerItem): string {
  return item.kind === "drive" ? `d:${item.file.id}` : `u:${item.id}`;
}

/** Revoke blob URLs for uploads dropped from the queue. */
function reconcileUploadRevokes(
  prev: ComposerItem[],
  next: ComposerItem[],
): ComposerItem[] {
  const nextKeys = new Set(next.map(composerItemKey));
  for (const p of prev) {
    if (!nextKeys.has(composerItemKey(p)) && p.kind === "upload") {
      URL.revokeObjectURL(p.previewUrl);
    }
  }
  return next;
}

type ComposerContextValue = {
  items: ComposerItem[];
  toggleDriveFile: (file: DrivePickerFile) => void;
  replaceWithDriveFile: (file: DrivePickerFile) => void;
  addUploadFiles: (list: FileList | File[]) => Promise<void>;
  /** Returns upload id, or null if the file type was skipped. */
  addSingleUpload: (file: File) => Promise<string | null>;
  setUploadStoragePath: (uploadId: string, storagePath: string) => void;
  removeItem: (key: string) => void;
  clearAll: () => void;
  logoFile: File | null;
  logoPreviewUrl: string | null;
  setLogoFile: (file: File | null) => void;
  logoCorner: LogoCorner;
  setLogoCorner: (c: LogoCorner) => void;
  selectionSummary: string;
};

const ComposerContext = createContext<ComposerContextValue | null>(null);

export function ComposerProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ComposerItem[]>([]);
  const [logoFile, setLogoFileState] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoCorner, setLogoCorner] = useState<LogoCorner>("br");
  const logoObjectUrlRef = useRef<string | null>(null);

  const setLogoFile = useCallback((file: File | null) => {
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }
    setLogoFileState(file);
    if (file) {
      const url = URL.createObjectURL(file);
      logoObjectUrlRef.current = url;
      setLogoPreviewUrl(url);
    } else {
      setLogoPreviewUrl(null);
    }
  }, []);

  const toggleDriveFile = useCallback((file: DrivePickerFile) => {
    setItems((prev) => {
      const next = applyComposerItem(prev, { kind: "drive", file });
      return reconcileUploadRevokes(prev, next);
    });
  }, []);

  const replaceWithDriveFile = useCallback((file: DrivePickerFile) => {
    setItems((prev) => {
      const next = [{ kind: "drive" as const, file }];
      return reconcileUploadRevokes(prev, next);
    });
  }, []);

  const addUploadFiles = useCallback(async (list: FileList | File[]) => {
    const arr = Array.from(list);
    for (const f of arr) {
      if (!isComposerUploadMedia(f)) {
        continue;
      }
      try {
        const item = await createUploadComposerItem(f, crypto.randomUUID());
        setItems((prev) =>
          reconcileUploadRevokes(prev, applyComposerItem(prev, item)),
        );
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const addSingleUpload = useCallback(async (file: File): Promise<string | null> => {
    if (!isComposerUploadMedia(file)) {
      return null;
    }
    const id = crypto.randomUUID();
    const item = await createUploadComposerItem(file, id);
    setItems((prev) =>
      reconcileUploadRevokes(prev, applyComposerItem(prev, item)),
    );
    return id;
  }, []);

  const setUploadStoragePath = useCallback(
    (uploadId: string, storagePath: string) => {
      setItems((prev) =>
        prev.map((i) =>
          i.kind === "upload" && i.id === uploadId
            ? { ...i, storagePath }
            : i,
        ),
      );
    },
    [],
  );

  const removeItem = useCallback((key: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => composerItemKey(i) !== key);
      return reconcileUploadRevokes(prev, next);
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems((prev) => {
      reconcileUploadRevokes(prev, []);
      return [];
    });
  }, []);

  const selectionSummary = useMemo(() => {
    if (items.length === 0) {
      return "Pick Drive media or upload files — multiple images, or one video, or one GIF.";
    }
    const hasV = items.some((i) => isVideoMime(composerItemMime(i)));
    const hasG = items.some((i) => isGifMime(composerItemMime(i)));
    const imgs = items.filter((i) =>
      isCollageImageMime(composerItemMime(i)),
    );
    if (hasV) return "Video selected — logo and collage apply to images only.";
    if (hasG) return "GIF selected — logo applies to static images only.";
    return `${imgs.length} collage-ready image(s) — add more or switch to video/GIF.`;
  }, [items]);

  const value = useMemo<ComposerContextValue>(
    () => ({
      items,
      toggleDriveFile,
      replaceWithDriveFile,
      addUploadFiles,
      addSingleUpload,
      setUploadStoragePath,
      removeItem,
      clearAll,
      logoFile,
      logoPreviewUrl,
      setLogoFile,
      logoCorner,
      setLogoCorner,
      selectionSummary,
    }),
    [
      items,
      toggleDriveFile,
      replaceWithDriveFile,
      addUploadFiles,
      addSingleUpload,
      setUploadStoragePath,
      removeItem,
      clearAll,
      logoFile,
      logoPreviewUrl,
      setLogoFile,
      logoCorner,
      selectionSummary,
    ],
  );

  return (
    <ComposerContext.Provider value={value}>{children}</ComposerContext.Provider>
  );
}

export function useComposer() {
  const ctx = useContext(ComposerContext);
  if (!ctx) {
    throw new Error("useComposer must be used within ComposerProvider");
  }
  return ctx;
}
