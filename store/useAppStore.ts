import { create } from "zustand";
import type { MediaItem, ScheduledPost, LogoConfig } from "@/lib/types";

/**
 * Multi-select for images only (Manual Upload, Pick from Drive, Random Pick).
 * - Multiple images can be selected; collage is built from them.
 * - Videos and GIFs cannot be in multi-select: if one is selected, selection is single only.
 * - If image(s) selected and user selects video/GIF → show message, keep existing image selection.
 * - If video/GIF selected and user selects image → replace with image.
 * - No duplicate IDs. Store is single source of truth.
 */
const MULTI_SELECT_MESSAGE = "Videos and GIFs cannot be selected in multi-select.";

function isVideoOrGif(mimeType: string | undefined): boolean {
  return !!(mimeType?.startsWith("video/") || mimeType === "image/gif");
}

/** Allowed in multi-select: image and not GIF. */
function allowedInMultiSelect(mimeType: string | undefined): boolean {
  return !!(mimeType?.startsWith("image/") && mimeType !== "image/gif");
}

interface AppState {
  niche: string;
  setNiche: (n: string) => void;
  topic: string;
  vibe: string;
  audience: string;
  setTopic: (t: string) => void;
  setVibe: (v: string) => void;
  setAudience: (a: string) => void;
  media: MediaItem[];
  setMedia: (m: MediaItem[]) => void;
  addMedia: (m: MediaItem) => void;
  removeMedia: (id: string) => void;
  selectedMediaId: string | null;
  setSelectedMediaId: (id: string | null) => void;
  /** Multiple IDs allowed only when all are images (no video/GIF). */
  selectedMediaIds: string[];
  setSelectedMediaIds: (ids: string[]) => void;
  toggleSelectedMediaId: (id: string) => void;
  addSelectedMediaId: (id: string) => void;
  selectionMessage: string | null;
  setSelectionMessage: (msg: string | null) => void;
  caption: string;
  hashtags: string[];
  setCaption: (c: string) => void;
  setHashtags: (h: string[]) => void;
  setCaptionAndHashtags: (c: string, h: string[]) => void;
  logoConfig: LogoConfig | null;
  setLogoConfig: (c: LogoConfig | null) => void;
  scheduledPosts: ScheduledPost[];
  setScheduledPosts: (p: ScheduledPost[]) => void;
  scheduledAt: Date | null;
  setScheduledAt: (d: Date | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  niche: "lifestyle",
  setNiche: (niche) => set({ niche }),
  topic: "",
  vibe: "",
  audience: "",
  setTopic: (topic) => set({ topic }),
  setVibe: (vibe) => set({ vibe }),
  setAudience: (audience) => set({ audience }),
  media: [],
  setMedia: (media) => set({ media }),
  addMedia: (m) => set((s) => {
    const newMedia = [...s.media, m];
    const ids = s.selectedMediaIds;
    if (ids.length <= 1) return { media: newMedia };
    const unique = ids.filter((id, i, arr) => arr.indexOf(id) === i);
    const onlyAllowed = unique.filter((id) => {
      const item = newMedia.find((x) => x.id === id);
      return item && allowedInMultiSelect(item.mimeType);
    });
    const filtered = onlyAllowed.length >= 1 ? onlyAllowed : unique;
    const keepId = s.selectedMediaId && filtered.includes(s.selectedMediaId) ? s.selectedMediaId : (filtered[0] ?? null);
    const didRemove = filtered.length < unique.length;
    return {
      media: newMedia,
      selectedMediaIds: filtered,
      selectedMediaId: keepId,
      selectionMessage: didRemove ? MULTI_SELECT_MESSAGE : s.selectionMessage,
    };
  }),
  removeMedia: (id) => set((s) => ({
    media: s.media.filter((m) => m.id !== id),
    selectedMediaId: s.selectedMediaId === id ? null : s.selectedMediaId,
    selectedMediaIds: s.selectedMediaIds.filter((i) => i !== id),
  })),
  selectedMediaId: null,
  setSelectedMediaId: (id) => set({ selectedMediaId: id }),
  selectedMediaIds: [],
  setSelectedMediaIds: (ids) => set((s) => {
    const unique = ids.filter((id, i, arr) => arr.indexOf(id) === i);
    if (unique.length <= 1) return { selectedMediaIds: unique, selectedMediaId: unique[0] ?? null };
    const onlyAllowed = unique.filter((id) => {
      const m = s.media.find((x) => x.id === id);
      return m && allowedInMultiSelect(m.mimeType);
    });
    const filtered = onlyAllowed.length >= 1 ? onlyAllowed : unique;
    const keepId = s.selectedMediaId && filtered.includes(s.selectedMediaId) ? s.selectedMediaId : (filtered[0] ?? null);
    const didRemove = filtered.length < unique.length;
    return {
      selectedMediaIds: filtered,
      selectedMediaId: keepId,
      selectionMessage: didRemove ? MULTI_SELECT_MESSAGE : s.selectionMessage,
    };
  }),
  toggleSelectedMediaId: (id) => set((s) => {
    const has = s.selectedMediaIds.includes(id);
    if (has) {
      const next = s.selectedMediaIds.filter((i) => i !== id);
      return {
        selectedMediaIds: next,
        selectedMediaId: s.selectedMediaId === id ? (next[0] ?? null) : s.selectedMediaId,
      };
    }
    const item = s.media.find((m) => m.id === id);
    if (isVideoOrGif(item?.mimeType) && s.selectedMediaIds.length >= 1) {
      return { selectionMessage: MULTI_SELECT_MESSAGE };
    }
    const next = [...s.selectedMediaIds, id];
    return {
      selectedMediaIds: next,
      selectedMediaId: id,
    };
  }),
  addSelectedMediaId: (id) => set((s) => {
    if (s.selectedMediaIds.includes(id)) return {};
    const item = s.media.find((m) => m.id === id);
    if (isVideoOrGif(item?.mimeType) && s.selectedMediaIds.length >= 1) {
      return { selectionMessage: MULTI_SELECT_MESSAGE };
    }
    return {
      selectedMediaIds: [...s.selectedMediaIds, id],
      selectedMediaId: id,
    };
  }),
  selectionMessage: null,
  setSelectionMessage: (msg) => set({ selectionMessage: msg }),
  caption: "",
  hashtags: [],
  setCaption: (caption) => set({ caption }),
  setHashtags: (hashtags) => set({ hashtags }),
  setCaptionAndHashtags: (caption, hashtags) => set({ caption, hashtags }),
  logoConfig: null,
  setLogoConfig: (logoConfig) => set({ logoConfig }),
  scheduledPosts: [],
  setScheduledPosts: (scheduledPosts) => set({ scheduledPosts }),
  scheduledAt: null,
  setScheduledAt: (scheduledAt) => set({ scheduledAt }),
}));

export const SELECTION_MESSAGE_MULTI_VIDEO_GIF = MULTI_SELECT_MESSAGE;
