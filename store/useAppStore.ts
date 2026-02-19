import { create } from "zustand";
import type { MediaItem, ScheduledPost, LogoConfig } from "@/lib/types";

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
  /** Single selection (for caption generation). When multiple selected, first id. */
  selectedMediaId: string | null;
  setSelectedMediaId: (id: string | null) => void;
  /** Multiple selection for post. If length > 1, post will use a collage. */
  selectedMediaIds: string[];
  setSelectedMediaIds: (ids: string[]) => void;
  toggleSelectedMediaId: (id: string) => void;
  addSelectedMediaId: (id: string) => void;
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
  addMedia: (m) => set((s) => ({ media: [...s.media, m] })),
  removeMedia: (id) => set((s) => ({
    media: s.media.filter((m) => m.id !== id),
    selectedMediaId: s.selectedMediaId === id ? null : s.selectedMediaId,
    selectedMediaIds: s.selectedMediaIds.filter((i) => i !== id),
  })),
  selectedMediaId: null,
  setSelectedMediaId: (id) => set({ selectedMediaId: id }),
  selectedMediaIds: [],
  setSelectedMediaIds: (ids) => set({ selectedMediaIds: ids.filter((id, i, arr) => arr.indexOf(id) === i) }),
  toggleSelectedMediaId: (id) => set((s) => {
    const has = s.selectedMediaIds.includes(id);
    const next = has ? s.selectedMediaIds.filter((i) => i !== id) : [...s.selectedMediaIds, id];
    return {
      selectedMediaIds: next,
      selectedMediaId: s.selectedMediaId === id ? (next[0] ?? null) : s.selectedMediaId,
    };
  }),
  addSelectedMediaId: (id) => set((s) => ({
    selectedMediaIds: s.selectedMediaIds.includes(id) ? s.selectedMediaIds : [...s.selectedMediaIds, id],
  })),
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
