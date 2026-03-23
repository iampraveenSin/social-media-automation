"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ConnectInstagram } from "@/components/ConnectInstagram";
import { ConnectDrive } from "@/components/ConnectDrive";
import { PickFromDrive } from "@/components/PickFromDrive";
import { MediaUpload } from "@/components/MediaUpload";
import { CaptionEditor } from "@/components/CaptionEditor";
import { LogoSettings } from "@/components/LogoSettings";
import { SchedulePicker } from "@/components/SchedulePicker";
import { PostCard } from "@/components/PostCard";
import { PostPreview } from "@/components/PostPreview";
import { MessagingPanel } from "@/components/MessagingPanel";
import { PageEngagementPanel } from "@/components/PageEngagementPanel";
import { CommentsPanel } from "@/components/CommentsPanel";
import { BusinessPortfolioPanel } from "@/components/BusinessPortfolioPanel";
import { InstagramProfilePanel } from "@/components/InstagramProfilePanel";
import { useAppStore } from "@/store/useAppStore";
import { buildCollageBlob } from "@/lib/collage";
import { markDriveFileIdsAsPosted } from "@/lib/drive-pick-round";
import { convertVideoForInstagramInBrowser } from "@/lib/convert-video-browser";
import type { ScheduledPost, MediaItem } from "@/lib/types";
import type { RecurrenceFrequency } from "@/lib/types";
import { DEFAULT_POST_TIMES } from "@/lib/types";

export default function DashboardPage() {
  type PageOption = { id: string; name: string };
  const {
    caption,
    hashtags,
    selectedMediaId,
    selectedMediaIds,
    setSelectedMediaId,
    setSelectedMediaIds,
    media,
    setMedia,
    addMedia,
    scheduledAt,
    logoConfig,
    scheduledPosts,
    setScheduledPosts,
    niche,
    setNiche,
    topic,
    vibe,
    audience,
    setTopic,
    setVibe,
    setAudience,
    selectionMessage,
    setSelectionMessage,
  } = useAppStore();

  const getEffectiveMediaId = async (): Promise<{ mediaId: string; driveFileIds: string[] }> => {
    if (selectedMediaIds.length === 0) throw new Error("Select at least one item");
    const selectedItems = selectedMediaIds
      .map((id) => media.find((x) => x.id === id))
      .filter(Boolean) as MediaItem[];
    const imageItems = selectedItems.filter(
      (m) => m.mimeType?.startsWith("image/") && m.mimeType !== "image/gif"
    );

    if (selectedMediaIds.length === 1) {
      const one = selectedItems[0];
      return {
        mediaId: one!.id,
        driveFileIds: one?.driveFileId ? [one.driveFileId] : [],
      };
    }

    if (imageItems.length >= 2) {
      const urls = imageItems
        .map((m) => (m.url.startsWith("http") ? m.url : `${typeof window !== "undefined" ? window.location.origin : ""}${m.url.startsWith("/") ? "" : "/"}${m.url}`))
        .filter(Boolean) as string[];
      if (urls.length !== imageItems.length) throw new Error("Some selected images could not be loaded");
      const blob = await buildCollageBlob(urls);
      const form = new FormData();
      form.append("file", new File([blob], "collage.png", { type: "image/png" }));
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Failed to upload collage");
      const item = (await res.json()) as MediaItem;
      const driveFileIds = imageItems.map((m) => m.driveFileId).filter(Boolean) as string[];
      return { mediaId: item.id, driveFileIds };
    }

    if (imageItems.length === 1) {
      return {
        mediaId: imageItems[0]!.id,
        driveFileIds: imageItems[0]?.driveFileId ? [imageItems[0].driveFileId] : [],
      };
    }

    const first = selectedItems[0];
    return {
      mediaId: first!.id,
      driveFileIds: first?.driveFileId ? [first.driveFileId] : [],
    };
  };

  const [account, setAccount] = useState<{ connected: boolean; username?: string; profilePictureUrl?: string; suggestedNiche?: string | null }>({ connected: false });
  const [drive, setDrive] = useState<{ connected: boolean; folderId?: string | null }>({ connected: false });
  const [analyzingAccount, setAnalyzingAccount] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [scheduleWarning, setScheduleWarning] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<{ redisOk: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "scheduled" | "messages" | "engagement" | "comments" | "business" | "profile">("create");
  const [recurrence, setRecurrence] = useState<{
    enabled: boolean;
    frequency: RecurrenceFrequency;
    nextRunAt: string | null;
    postTimes: string[];
    niche?: string | null;
    topic?: string | null;
    vibe?: string | null;
    audience?: string | null;
  }>({ enabled: false, frequency: "daily", nextRunAt: null, postTimes: DEFAULT_POST_TIMES });
  const [recurrenceSaving, setRecurrenceSaving] = useState(false);
  const [needsPageSelection, setNeedsPageSelection] = useState(false);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pages, setPages] = useState<PageOption[]>([]);
  const [selectingPageId, setSelectingPageId] = useState<string | null>(null);
  const [pageSelectionMessage, setPageSelectionMessage] = useState<string | null>(null);
  const redirectingToLogin = useRef(false);
  const recurrenceInitialLoadDone = useRef(false);

  const redirectToLogin = () => {
    if (redirectingToLogin.current || typeof window === "undefined") return;
    redirectingToLogin.current = true;
    window.location.href = `${window.location.origin}/login?redirect=/dashboard`;
  };

  useEffect(() => {
    fetch("/api/queue-status")
      .then((r) => r.json())
      .then((d) => setQueueStatus({ redisOk: !!d.redisOk }))
      .catch(() => setQueueStatus({ redisOk: false }));
  }, []);

  useEffect(() => {
    const opts = { credentials: "include" as RequestCredentials };
    fetch("/api/accounts", opts)
      .then((r) => {
        if (r.status === 401) {
          redirectToLogin();
          return;
        }
        return r.json();
      })
      .then((data) => data != null && setAccount(data))
      .catch(() => setAccount({ connected: false }));
  }, []);

  useEffect(() => {
    const opts = { credentials: "include" as RequestCredentials };
    fetch("/api/media", opts)
      .then((r) => {
        if (r.status === 401) {
          redirectToLogin();
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((list: MediaItem[] | null) => {
        if (list === null) return;
        setSelectedMediaIds([]);
        setSelectedMediaId(null);
      })
      .catch(() => {
        setSelectedMediaIds([]);
        setSelectedMediaId(null);
      });
  }, [setSelectedMediaIds, setSelectedMediaId]);

  /** Normalize selection: no dupes, images-only when multi. */
  useEffect(() => {
    if (media.length === 0 || selectedMediaIds.length <= 1) return;
    const hasVideoOrGif = selectedMediaIds.some(
      (id) => {
        const m = media.find((x) => x.id === id);
        return m && (m.mimeType?.startsWith("video/") || m.mimeType === "image/gif");
      }
    );
    const hasDupes = selectedMediaIds.length !== new Set(selectedMediaIds).size;
    if (hasVideoOrGif || hasDupes) setSelectedMediaIds(selectedMediaIds);
  }, [media, selectedMediaIds, setSelectedMediaIds]);

  useEffect(() => {
    if (!selectionMessage) return;
    const t = setTimeout(() => setSelectionMessage(null), 5000);
    return () => clearTimeout(t);
  }, [selectionMessage, setSelectionMessage]);

  useEffect(() => {
    const opts = { credentials: "include" as RequestCredentials };
    fetch("/api/drive/status", opts)
      .then((r) => {
        if (r.status === 401) {
          redirectToLogin();
          return null;
        }
        return r.json();
      })
      .then((d) => d != null && setDrive({ connected: !!d.connected, folderId: d.folderId ?? null }))
      .catch(() => setDrive({ connected: false }));
  }, []);

  useEffect(() => {
    if (recurrenceInitialLoadDone.current) return;
    recurrenceInitialLoadDone.current = true;
    const opts = { credentials: "include" as RequestCredentials };
    fetch("/api/recurrence", opts)
      .then(async (r) => {
        if (r.status === 401) return null;
        const text = await r.text();
        if (!text) return null;
        try {
          return JSON.parse(text) as { enabled?: boolean; frequency?: RecurrenceFrequency; nextRunAt?: string | null; postTimes?: string[]; niche?: string | null; topic?: string | null; vibe?: string | null; audience?: string | null };
        } catch {
          return null;
        }
      })
      .then((d) => {
        if (d && typeof d.enabled === "boolean") {
          setRecurrence({
            enabled: d.enabled,
            frequency: d.frequency ?? "daily",
            nextRunAt: d.nextRunAt ?? null,
            postTimes: Array.isArray(d.postTimes) && d.postTimes.length > 0 ? d.postTimes : DEFAULT_POST_TIMES,
            niche: d.niche ?? null,
            topic: d.topic ?? null,
            vibe: d.vibe ?? null,
            audience: d.audience ?? null,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (account.connected && account.suggestedNiche) {
      setNiche(account.suggestedNiche);
    }
  }, [account.connected, account.suggestedNiche, setNiche]);

  useEffect(() => {
    if (!recurrence.enabled) return;
    const opts = { credentials: "include" as RequestCredentials };
    const refetch = () =>
      fetch("/api/recurrence", opts)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { nextRunAt?: string | null } | null) => {
          if (d && d.nextRunAt !== undefined) setRecurrence((p) => ({ ...p, nextRunAt: d.nextRunAt ?? null }));
        })
        .catch(() => {});
    const id = setInterval(refetch, 60_000);
    return () => clearInterval(id);
  }, [recurrence.enabled]);

  useEffect(() => {
    const opts = { credentials: "include" as RequestCredentials };
    const load = () =>
      fetch("/api/posts", opts)
        .then((r) => {
          if (r.status === 401) {
            redirectToLogin();
            return [];
          }
          return r.json();
        })
        .then((data: unknown) => setScheduledPosts(Array.isArray(data) ? data : []))
        .catch(() => setScheduledPosts([]));
    load();
    const interval = setInterval(load, 5000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [setScheduledPosts]);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (params.get("connected") === "1") setAccount((a) => ({ ...a, connected: true }));
    if (params.get("instagram_page_select") === "1") {
      setNeedsPageSelection(true);
      setPageSelectionMessage(null);
      setPagesLoading(true);
      fetch("/api/auth/instagram/pages", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setPages(Array.isArray(d.pages) ? d.pages : []))
        .catch(() => setPages([]))
        .finally(() => setPagesLoading(false));
    }
    if (params.get("drive_connected") === "1") setDrive((d) => ({ ...d, connected: true }));
    const err = params.get("error");
    if (err) {
      setErrorDismissed(false);
      const pagesParam = params.get("pages") ?? "";
      const hint = params.get("hint") ?? "";
      const reason = params.get("reason") ?? "";
      if (err === "no_page") {
        setError(
          hint
            ? `No Facebook Pages found. Meta said: ${hint} See the steps below.`
            : "No Facebook Pages found for this account. You need to be an admin of a Facebook Page and grant the app access. See the steps below."
        );
      } else if (err === "no_instagram_account") {
        setError(
          pagesParam
            ? `We found your Facebook Page(s) (${pagesParam}) but none have an Instagram account linked in Meta’s system. Connect Instagram from the Page side — see steps below.`
            : "No Instagram Business account found. Your Instagram must be a Professional account and linked to a Facebook Page. See the steps below."
        );
      } else if (err === "drive_no_code") {
        const detail = [reason, hint].filter(Boolean).join(" — ");
        setError(
          detail
            ? `Google Drive: ${detail} Try connecting again and complete sign-in and consent.`
            : "Google Drive didn't return an authorization code. Try connecting again: click Connect Google Drive, sign in with Google, and make sure to allow access (don't cancel or close the window)."
        );
      } else if (err === "drive_token_failed") {
        setError("Google Drive: Could not get access. Try disconnecting and connecting again.");
      } else {
        setError(decodeURIComponent(err));
      }
    }
  }, []);

  const handleSelectInstagramPage = async (page: PageOption) => {
    setSelectingPageId(page.id);
    setPageSelectionMessage(null);
    try {
      const res = await fetch("/api/auth/instagram/select-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pageId: page.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        connected?: boolean;
        username?: string;
        profilePictureUrl?: string;
        selectedPageName?: string;
        error?: string;
      };
      if (!res.ok || !data.connected) throw new Error(data.error ?? "Failed to connect selected page");
      setAccount((a) => ({
        ...a,
        connected: true,
        username: data.username,
        profilePictureUrl: data.profilePictureUrl,
      }));
      setNeedsPageSelection(false);
      setPages([]);
      setPageSelectionMessage(
        `Connected page "${data.selectedPageName ?? page.name}" with Instagram @${data.username ?? "instagram"}.`
      );
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("instagram_page_select");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    } catch (e) {
      setPageSelectionMessage(e instanceof Error ? e.message : "Failed to connect selected page");
    } finally {
      setSelectingPageId(null);
    }
  };

  const handleSchedule = async () => {
    if (selectedMediaIds.length === 0) {
      setError("Select at least one image");
      return;
    }
    setScheduling(true);
    setError(null);
    setScheduleSuccess(false);
    try {
      let mediaId: string;
      let driveIdsForPost: string[] = [];
      const singleMedia = selectedMediaIds.length === 1 ? media.find((m) => m.id === selectedMediaIds[0]) : null;
      const isVideo = singleMedia?.mimeType?.startsWith("video/");

      if (isVideo && singleMedia?.url) {
        const fullUrl = singleMedia.url.startsWith("http") ? singleMedia.url : `${typeof window !== "undefined" ? window.location.origin : ""}${singleMedia.url.startsWith("/") ? singleMedia.url : "/" + singleMedia.url}`;
        const converted = await convertVideoForInstagramInBrowser(fullUrl, undefined);
        if (!converted.ok) {
          setError(converted.error || "Video conversion failed");
          setScheduling(false);
          return;
        }
        const form = new FormData();
        form.append("file", new File([converted.blob], "converted.mp4", { type: "video/mp4" }));
        const upRes = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
        if (!upRes.ok) {
          const upData = await upRes.json().catch(() => ({}));
          setError(upData.error ?? "Upload of converted video failed");
          setScheduling(false);
          return;
        }
        const uploadedItem = (await upRes.json()) as MediaItem;
        addMedia(uploadedItem);
        mediaId = uploadedItem.id;
        driveIdsForPost = singleMedia.driveFileId ? [singleMedia.driveFileId] : [];
      } else {
        const effective = await getEffectiveMediaId();
        mediaId = effective.mediaId;
        driveIdsForPost = effective.driveFileIds;
      }

      const at = scheduledAt ?? new Date(Date.now() + 3600000);
      const driveIds = driveIdsForPost;
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId,
          caption,
          hashtags: Array.isArray(hashtags) ? hashtags : (hashtags ? [hashtags] : []),
          topic: topic || undefined,
          vibe: vibe || undefined,
          audience: audience || undefined,
          scheduledAt: at.toISOString(),
          logoConfig: logoConfig ?? undefined,
          driveFileIds: driveIds.length > 0 ? driveIds : undefined,
          driveFolderId: drive.folderId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Schedule failed");
      setScheduledPosts(Array.isArray(scheduledPosts) ? [...scheduledPosts, data.post] : [data.post]);
      if (driveIds.length > 0) markDriveFileIdsAsPosted(drive.folderId, driveIds);
      setSuccessMessage("Scheduled.");
      setScheduleSuccess(true);
      setTimeout(() => { setScheduleSuccess(false); setSuccessMessage(""); }, 3000);
      if (data.jobId == null) {
        setScheduleWarning("Post saved but not queued. Start Redis, then run npm run worker in another terminal so posts publish at the scheduled time.");
      } else {
        setScheduleWarning(null);
      }
      fetch("/api/queue-status").then((r) => r.json()).then((d) => setQueueStatus({ redisOk: !!d.redisOk })).catch(() => setQueueStatus({ redisOk: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Schedule failed");
    } finally {
      setScheduling(false);
    }
  };

  const handlePublishNow = async () => {
    if (selectedMediaIds.length === 0) {
      setError("Select at least one image");
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      let mediaId: string;
      let driveIdsForPost: string[] = [];
      const singleMedia = selectedMediaIds.length === 1 ? media.find((m) => m.id === selectedMediaIds[0]) : null;
      const isVideo = singleMedia?.mimeType?.startsWith("video/");

      if (isVideo && singleMedia?.url) {
        const fullUrl = singleMedia.url.startsWith("http") ? singleMedia.url : `${typeof window !== "undefined" ? window.location.origin : ""}${singleMedia.url.startsWith("/") ? singleMedia.url : "/" + singleMedia.url}`;
        const converted = await convertVideoForInstagramInBrowser(fullUrl, undefined);
        if (!converted.ok) {
          setError(converted.error || "Video conversion failed");
          setPublishing(false);
          return;
        }
        const form = new FormData();
        form.append("file", new File([converted.blob], "converted.mp4", { type: "video/mp4" }));
        const upRes = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
        if (!upRes.ok) {
          const upData = await upRes.json().catch(() => ({}));
          setError(upData.error ?? "Upload of converted video failed");
          setPublishing(false);
          return;
        }
        const uploadedItem = (await upRes.json()) as MediaItem;
        addMedia(uploadedItem);
        mediaId = uploadedItem.id;
        driveIdsForPost = singleMedia.driveFileId ? [singleMedia.driveFileId] : [];
      } else {
        const effective = await getEffectiveMediaId();
        mediaId = effective.mediaId;
        driveIdsForPost = effective.driveFileIds;
      }

      const driveIds = driveIdsForPost;
      const res = await fetch("/api/publish-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId,
          caption,
          hashtags: Array.isArray(hashtags) ? hashtags : (hashtags ? [hashtags] : []),
          logoConfig: logoConfig ?? undefined,
          driveFileIds: driveIds.length > 0 ? driveIds : undefined,
          driveFolderId: drive.folderId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      setScheduledPosts(Array.isArray(scheduledPosts) ? [...scheduledPosts, data.post] : [data.post]);
      if (driveIds.length > 0) markDriveFileIdsAsPosted(drive.folderId, driveIds);
      setSuccessMessage("Published to Instagram!");
      setScheduleSuccess(true);
      setTimeout(() => { setScheduleSuccess(false); setSuccessMessage(""); }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f8f6f2] text-stone-800">
      {/* Ambient gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_100%_60%_at_0%_0%,rgba(251,191,36,0.12),transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_100%,rgba(251,191,36,0.06),transparent_50%)] pointer-events-none" />

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-amber-200 bg-[#fffef9]">
        <div className="p-6 border-b border-amber-200">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-amber-900">Automate</h1>
          <p className="mt-0.5 font-sans text-xs tracking-widest uppercase text-amber-700">Social</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${activeTab === "create" ? "bg-amber-100 text-amber-900 border border-amber-300" : "text-stone-600 hover:bg-amber-50 hover:text-stone-900"}`}
          >
            <span className="text-lg">✨</span>
            New post
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("scheduled")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${activeTab === "scheduled" ? "bg-amber-100 text-amber-900 border border-amber-300" : "text-stone-600 hover:bg-amber-50 hover:text-stone-900"}`}
          >
            <span className="text-lg">📋</span>
            Posts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("messages")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${activeTab === "messages" ? "bg-amber-100 text-amber-900 border border-amber-300" : "text-stone-600 hover:bg-amber-50 hover:text-stone-900"}`}
          >
            <span className="text-lg">💬</span>
            Messages
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("engagement")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${activeTab === "engagement" ? "bg-amber-100 text-amber-900 border border-amber-300" : "text-stone-600 hover:bg-amber-50 hover:text-stone-900"}`}
          >
            <span className="text-lg">📊</span>
            Engagement
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${activeTab === "comments" ? "bg-amber-100 text-amber-900 border border-amber-300" : "text-stone-600 hover:bg-amber-50 hover:text-stone-900"}`}
          >
            <span className="text-lg">💭</span>
            Comments
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("business")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${activeTab === "business" ? "bg-amber-100 text-amber-900 border border-amber-300" : "text-stone-600 hover:bg-amber-50 hover:text-stone-900"}`}
          >
            <span className="text-lg">🏢</span>
            Business
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${activeTab === "profile" ? "bg-amber-100 text-amber-900 border border-amber-300" : "text-stone-600 hover:bg-amber-50 hover:text-stone-900"}`}
          >
            <span className="text-lg">👤</span>
            Profile
          </button>
        </nav>
        <div className="p-4 border-t border-amber-200 space-y-3">
          <div className="rounded-lg bg-amber-50 p-3 space-y-2">
            <p className="font-display text-xs font-medium tracking-widest uppercase text-amber-800">Accounts</p>
            {account.connected ? <p className="text-xs text-stone-700">Instagram ✓</p> : <a href="/api/auth/instagram" className="text-xs text-amber-700 hover:underline">Connect Instagram</a>}
            {drive.connected ? <p className="text-xs text-stone-700">Drive ✓</p> : <a href="/api/drive/auth" className="text-xs text-amber-700 hover:underline">Connect Drive</a>}
          </div>
          <label className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 cursor-pointer">
            <input type="checkbox" checked={recurrence.enabled} onChange={async (e) => { const en = e.target.checked; setRecurrence((p) => ({ ...p, enabled: en })); setRecurrenceSaving(true); try { const r = await fetch("/api/recurrence", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ enabled: en, frequency: recurrence.frequency, postTimes: recurrence.postTimes, driveFolderId: drive.folderId ?? undefined }) }); const text = await r.text(); let d: { enabled?: boolean; nextRunAt?: string | null; error?: string } = {}; try { if (text) d = JSON.parse(text); } catch { /* ignore */ } if (r.ok) setRecurrence((p) => ({ ...p, enabled: d.enabled ?? en, nextRunAt: d.nextRunAt ?? null })); else { setRecurrence((p) => ({ ...p, enabled: !en })); setError(d.error ?? "Failed to save auto-post"); } } catch (err) { setRecurrence((p) => ({ ...p, enabled: !en })); setError(err instanceof Error ? err.message : "Failed to save"); } finally { setRecurrenceSaving(false); } }} disabled={recurrenceSaving} className="h-3.5 w-3.5 rounded border-amber-500 text-amber-600" />
            <span className="text-xs text-stone-700">Auto-post</span>
          </label>
          <button type="button" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; }} className="w-full rounded-lg border border-amber-300 bg-amber-50 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100 transition">Log out</button>
        </div>
      </aside>

      <main className="relative flex-1 pl-64 min-h-screen flex flex-col bg-[#f8f6f2]">
        <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {error && !errorDismissed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 space-y-3">
            <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
              <p className="flex-1">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setErrorDismissed(true);
                  if (typeof window !== "undefined") {
                    const url = new URL(window.location.href);
                    url.searchParams.delete("error");
                    url.searchParams.delete("reason");
                    url.searchParams.delete("pages");
                    url.searchParams.delete("hint");
                    window.history.replaceState({}, "", url.pathname + url.search);
                  }
                }}
                className="shrink-0 rounded px-2 py-1 text-red-600 hover:bg-red-100"
                aria-label="Dismiss"
              >
                Dismiss
              </button>
            </div>
            {(error.includes("publicly accessible") || error.includes("Only photo or video") || error.includes("media type") || error.includes("localhost")) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium mb-2">Why nothing posts to Instagram</p>
                <p className="text-stone-700 mb-2">
                  Instagram’s servers must be able to <strong>download your image from a public URL</strong>. When the app runs on <strong>localhost</strong>, the image URL is something like <code className="rounded bg-amber-100 text-amber-900 px-1">http://localhost:3000/uploads/...</code>, which only your computer can open. Instagram cannot open it, so the post fails.
                </p>
                <p className="font-medium mb-1">Fix:</p>
                <ol className="list-decimal list-inside space-y-1 text-stone-700">
                  <li><strong>Use production:</strong> Deploy the app (e.g. Vercel) and set <code className="rounded bg-amber-100 text-amber-900 px-1">NEXT_PUBLIC_APP_URL=https://automation-aditya.vercel.app</code> in the deployed env. Image URLs will be public so Instagram can fetch them. For local dev use <code className="rounded bg-amber-100 text-amber-900 px-1">NEXT_PUBLIC_APP_URL=http://localhost:3000</code>.</li>
                </ol>
              </div>
            )}
            {(error.includes("No Facebook Pages") || error === "no_page") && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium mb-2">To fix “no page”:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-stone-700">
                  <li>Use the <strong>Facebook account that is an admin</strong> of your Page (e.g. Avanora). When you click Connect Instagram, log in with that account.</li>
                  <li>If you don’t have a Page yet, create one at <a href="https://www.facebook.com/pages/creation" target="_blank" rel="noreferrer" className="text-amber-800 underline hover:text-amber-900">facebook.com/pages/creation</a>, then try again.</li>
                  <li>When Facebook asks for permissions, <strong>accept “Business management”</strong> and Pages access. Without it, Meta doesn’t return your Pages. Then try Connect Instagram again.</li>
                  <li>If “Business management” doesn’t appear or you get a permission error: in <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-amber-800 underline hover:text-amber-900">developers.facebook.com</a> → your app → <strong>App Review</strong> → <strong>Permissions and Features</strong> → add <strong>business_management</strong> (and request it if needed for production).</li>
                </ol>
                <button
                  type="button"
                  onClick={() => {
                    setErrorDismissed(true);
                    setError(null);
                    if (typeof window !== "undefined") {
                      const url = new URL(window.location.href);
                      url.searchParams.delete("error");
                      url.searchParams.delete("hint");
                      window.history.replaceState({}, "", url.pathname + url.search);
                    }
                  }}
                  className="mt-3 rounded bg-amber-200 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-300"
                >
                  Got it, dismiss
                </button>
              </div>
            )}
            {(error.includes("No Instagram Business") || error.includes("We found your Facebook Page")) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium mb-2">To fix this (Meta’s official way — from Instagram):</p>
                <ol className="list-decimal list-inside space-y-1.5 text-stone-700">
                  <li>Instagram must be a <strong>Professional</strong> account (Creator or Business). Settings → Account → switch if needed.</li>
                  <li>On <strong>Instagram</strong> app: go to <strong>Profile</strong> → <strong>Edit profile</strong> → under <strong>Public business information</strong> (or <strong>Profile information</strong> for Creator), tap <strong>Page</strong> → <strong>Connect or create</strong> → <strong>Log in to Facebook</strong> and choose your Page <strong>Avanora</strong> (or create one). Tap <strong>Connect</strong>. This is the link Meta’s API uses.</li>
                  <li>Your Instagram and your Facebook Page must be in the <strong>same business portfolio</strong>. In Meta Business Suite / business.facebook.com, check that both the Page and the Instagram account are in the same business. If Instagram is in another business, move it to the one that has the Page.</li>
                  <li>We now request <strong>Ads read</strong> so linked Instagram can be detected (needed if the Page is in Business Manager). When you click <strong>Connect Instagram</strong>, approve that permission, then try again.</li>
                </ol>
                <button
                  type="button"
                  onClick={() => {
                    setErrorDismissed(true);
                    setError(null);
                    if (typeof window !== "undefined") {
                      const url = new URL(window.location.href);
                      url.searchParams.delete("error");
                      url.searchParams.delete("reason");
                      url.searchParams.delete("pages");
                      url.searchParams.delete("hint");
                      window.history.replaceState({}, "", url.pathname + url.search);
                    }
                  }}
                  className="mt-3 rounded bg-amber-200 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-300"
                >
                  Got it, dismiss
                </button>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "create" && (
          <>
            <div className="mb-8">
              <h2 className="font-display text-3xl font-medium text-stone-800">New post</h2>
              <p className="mt-1 text-sm text-stone-700">Create content for Instagram & Facebook.</p>
            </div>

            {selectionMessage && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                <p className="flex-1 text-sm text-amber-900">{selectionMessage}</p>
                <button
                  type="button"
                  onClick={() => setSelectionMessage(null)}
                  className="shrink-0 rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-300"
                >
                  Dismiss
                </button>
              </div>
            )}

            {needsPageSelection && (
              <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-4">
                <p className="text-sm font-semibold text-amber-900">Select a Facebook Page to connect</p>
                <p className="mt-1 text-xs text-stone-700">
                  We fetched your Pages after Facebook Login. Choose the Page you want to connect.
                </p>
                <div className="mt-3 space-y-2">
                  {pagesLoading ? (
                    <p className="text-sm text-stone-700">Loading pages...</p>
                  ) : pages.length === 0 ? (
                    <p className="text-sm text-stone-700">No Pages found. Try connecting again.</p>
                  ) : (
                    pages.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectInstagramPage(p)}
                        disabled={selectingPageId !== null}
                        className="flex w-full items-center justify-between rounded-lg border border-amber-300 bg-white px-3 py-2 text-left hover:bg-amber-50 disabled:opacity-50"
                      >
                        <span className="text-sm text-stone-800">{p.name}</span>
                        <span className="text-xs font-medium text-amber-800">
                          {selectingPageId === p.id ? "Connecting..." : "Connect this Page"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                {pageSelectionMessage && (
                  <p className="mt-3 text-sm text-amber-900">{pageSelectionMessage}</p>
                )}
              </div>
            )}

            {!needsPageSelection && pageSelectionMessage && (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {pageSelectionMessage}
              </div>
            )}

            {/* Accounts */}
            <div className="grid gap-4 sm:grid-cols-2 mb-8">
              <div className="rounded-xl border border-amber-200 bg-[#fffef9] p-5">
                <ConnectInstagram
                  connected={account.connected}
                  username={account.username}
                  profilePictureUrl={account.profilePictureUrl}
                  onDisconnect={async () => {
                    await fetch("/api/auth/instagram/disconnect", { method: "POST" });
                    const res = await fetch("/api/accounts");
                    const data = await res.json();
                    setAccount({ connected: data.connected ?? false, username: data.username, profilePictureUrl: data.profilePictureUrl });
                  }}
                />
              </div>
              <div className="rounded-xl border border-amber-200 bg-[#fffef9] p-5">
                <ConnectDrive
                  connected={drive.connected}
                  folderId={drive.folderId}
                  onDisconnect={async () => { await fetch("/api/drive/disconnect", { method: "POST" }); setDrive({ connected: false, folderId: null }); }}
                  onFolderSave={async (folderIdOrLink) => {
                    await fetch("/api/drive/folder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folderId: folderIdOrLink }) });
                    const res = await fetch("/api/drive/status");
                    const data = await res.json();
                    setDrive({ connected: !!data.connected, folderId: data.folderId ?? null });
                  }}
                />
              </div>
            </div>

            {/* Composer + Preview: two columns */}
            <div className="grid lg:grid-cols-[1fr,320px] gap-8">
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-amber-200 bg-[#fffef9] p-6 sm:p-8 shadow-xl"
              >
                <PickFromDrive connected={drive.connected} folderId={drive.folderId} />
                <MediaUpload />
                <div className="mt-8 pt-6 border-t border-amber-200">
                  <p className="font-display text-xs font-medium tracking-[0.15em] uppercase text-amber-800 mb-3">Caption</p>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <select value={niche} onChange={(e) => setNiche(e.target.value)} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-400">
                      <option value="lifestyle">Lifestyle</option>
                      <option value="photography">Photography</option>
                      <option value="fitness">Fitness</option>
                      <option value="food">Food</option>
                      <option value="tech">Tech</option>
                      <option value="fashion">Fashion</option>
                      <option value="education">Education</option>
                      <option value="motivation">Motivation</option>
                    </select>
                    {account.connected && (
                      <button type="button" onClick={async () => { setAnalyzingAccount(true); try { const res = await fetch("/api/accounts/analyze", { method: "POST" }); const data = await res.json(); if (res.ok && data.suggestedNiche) { setNiche(data.suggestedNiche); setAccount((a) => ({ ...a, suggestedNiche: data.suggestedNiche })); } } finally { setAnalyzingAccount(false); } }} disabled={analyzingAccount} className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"> {analyzingAccount ? "…" : "Auto-detect"} </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}                     placeholder="Topic" className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-500 focus:border-amber-500 focus:outline-none" />
                    <input type="text" value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="Vibe" className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-500 focus:border-amber-500 focus:outline-none" />
                    <input type="text" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Audience" className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-500 focus:border-amber-500 focus:outline-none" />
                  </div>
                  <CaptionEditor />
                  <LogoSettings />
                </div>
                <div className="mt-8 pt-6 border-t border-amber-200">
                  <SchedulePicker />
                  {/* Auto-post: daily / every 3 days / weekly / monthly + time selector */}
                  <div className="mt-6 pt-6 border-t border-amber-200">
                    <p className="text-sm font-medium text-stone-800 mb-2">Auto-post</p>
                    <p className="text-xs text-stone-600 mb-3">
                      One post per period (e.g. once per day). Auto-post picks one image or video from your <strong>Drive folder</strong> each time — connect Drive above and open a folder so it has media to use. The time rotates through the 3 slots below. You must run the worker (<code className="rounded bg-amber-100 px-1">npm run worker</code>) on an always-on machine (not Vercel) so posts publish at the scheduled time; it checks every 10 minutes.
                    </p>
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={recurrence.enabled}
                            disabled={recurrenceSaving}
                            onChange={async (e) => {
                              const en = e.target.checked;
                              setRecurrence((p) => ({ ...p, enabled: en }));
                              setRecurrenceSaving(true);
                              try {
                                const r = await fetch("/api/recurrence", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  credentials: "include",
                                  body: JSON.stringify({ enabled: en, frequency: recurrence.frequency, postTimes: recurrence.postTimes, driveFolderId: drive.folderId ?? undefined, niche: niche || undefined, topic: topic || undefined, vibe: vibe || undefined, audience: audience || undefined }),
                                });
                                const text = await r.text();
                                let d: { enabled?: boolean; frequency?: RecurrenceFrequency; nextRunAt?: string | null; postTimes?: string[]; niche?: string | null; topic?: string | null; vibe?: string | null; audience?: string | null; error?: string } = {};
                                try {
                                  if (text) d = JSON.parse(text) as typeof d;
                                } catch {
                                  setError("Invalid response from server");
                                }
                                if (r.ok) {
                                  setRecurrence((p) => ({
                                    ...p,
                                    enabled: d.enabled ?? en,
                                    frequency: d.frequency ?? p.frequency,
                                    nextRunAt: d.nextRunAt ?? null,
                                    postTimes: Array.isArray(d.postTimes) && d.postTimes.length > 0 ? d.postTimes : p.postTimes,
                                    niche: d.niche ?? p.niche,
                                    topic: d.topic ?? p.topic,
                                    vibe: d.vibe ?? p.vibe,
                                    audience: d.audience ?? p.audience,
                                  }));
                                } else {
                                  setRecurrence((p) => ({ ...p, enabled: !en }));
                                  setError(d.error ?? "Failed to save auto-post");
                                }
                              } catch (e) {
                                setRecurrence((p) => ({ ...p, enabled: !en }));
                                setError(e instanceof Error ? e.message : "Failed to save auto-post");
                              } finally {
                                setRecurrenceSaving(false);
                              }
                            }}
                            className="h-4 w-4 rounded border-amber-500 text-amber-600 focus:ring-amber-400"
                          />
                          <span className="text-sm text-stone-700">Enable auto-post</span>
                        </label>
                        <select
                          value={recurrence.frequency}
                          onChange={async (e) => {
                            const freq = e.target.value as RecurrenceFrequency;
                            setRecurrenceSaving(true);
                            try {
                              const r = await fetch("/api/recurrence", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                body: JSON.stringify({ enabled: recurrence.enabled, frequency: freq, postTimes: recurrence.postTimes, driveFolderId: drive.folderId ?? undefined, niche: niche || undefined, topic: topic || undefined, vibe: vibe || undefined, audience: audience || undefined }),
                              });
                              const text = await r.text();
                              let d: { frequency?: RecurrenceFrequency; nextRunAt?: string | null; niche?: string | null; topic?: string | null; vibe?: string | null; audience?: string | null; error?: string } = {};
                              try {
                                if (text) d = JSON.parse(text) as typeof d;
                              } catch {
                                setError("Invalid response from server");
                              }
                              if (r.ok) setRecurrence((p) => ({ ...p, frequency: d.frequency ?? freq, nextRunAt: d.nextRunAt ?? null, niche: d.niche ?? p.niche, topic: d.topic ?? p.topic, vibe: d.vibe ?? p.vibe, audience: d.audience ?? p.audience }));
                              else setError(d.error ?? "Failed to save auto-post");
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Failed to save auto-post");
                            } finally {
                              setRecurrenceSaving(false);
                            }
                          }}
                          className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        >
                          <option value="daily">Daily</option>
                          <option value="every_3_days">Every 3 days</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                        {recurrence.enabled && recurrence.nextRunAt && (
                          <p className="text-xs text-amber-800 font-medium">
                            Next post at {new Date(recurrence.nextRunAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        )}
                        {recurrenceSaving && <span className="text-xs text-stone-500">Saving…</span>}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-stone-700 mb-2">Time of day for the single post (rotates so each post is at a different time)</p>
                        <div className="flex flex-wrap items-center gap-3">
                          {[0, 1, 2].map((i) => (
                            <label key={i} className="flex items-center gap-2">
                              <span className="text-xs text-stone-600">Time {i + 1}</span>
                              <input
                                type="time"
                                value={recurrence.postTimes[i] ?? DEFAULT_POST_TIMES[i]}
                                onChange={async (e) => {
                                  const val = e.target.value;
                                  const next = [...(recurrence.postTimes.length ? recurrence.postTimes : DEFAULT_POST_TIMES)];
                                  next[i] = val;
                                  while (next.length < 3) next.push(DEFAULT_POST_TIMES[next.length] ?? "09:00");
                                  const postTimes = next.slice(0, 3);
                                  setRecurrence((p) => ({ ...p, postTimes }));
                                  setRecurrenceSaving(true);
                                  try {
                                    const r = await fetch("/api/recurrence", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      credentials: "include",
                                      body: JSON.stringify({ enabled: recurrence.enabled, frequency: recurrence.frequency, postTimes, driveFolderId: drive.folderId ?? undefined, niche: niche || undefined, topic: topic || undefined, vibe: vibe || undefined, audience: audience || undefined }),
                                    });
                                    const text = await r.text();
                                    let d: { nextRunAt?: string | null; postTimes?: string[]; niche?: string | null; topic?: string | null; vibe?: string | null; audience?: string | null; error?: string } = {};
                                    try {
                                      if (text) d = JSON.parse(text) as typeof d;
                                    } catch {
                                      /* ignore */
                                    }
                                    if (r.ok) setRecurrence((p) => ({ ...p, nextRunAt: d.nextRunAt ?? p.nextRunAt, postTimes: Array.isArray(d.postTimes) && d.postTimes.length > 0 ? d.postTimes : postTimes, niche: d.niche ?? p.niche, topic: d.topic ?? p.topic, vibe: d.vibe ?? p.vibe, audience: d.audience ?? p.audience }));
                                    else setError(d.error ?? "Failed to save times");
                                  } catch {
                                    setError("Failed to save times");
                                  } finally {
                                    setRecurrenceSaving(false);
                                  }
                                }}
                                className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-500 focus:outline-none"
                              />
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-stone-500 mt-1">Only 1 post per day (or per week/month). That post goes out at one of these times in rotation: 1st at Time 1, 2nd at Time 2, 3rd at Time 3, then repeat. Default: 9 AM, 2 PM, 7 PM.</p>
                        <p className="text-xs text-stone-500 mt-1">Auto-post uses the same AI caption pipeline as Post Now and Schedule. Captions use the topic, vibe and audience from the form above (saved when you update auto-post settings).</p>
                      </div>
                    </div>
                  </div>
                  {queueStatus && <p className={`mt-3 text-xs ${queueStatus.redisOk ? "text-stone-700" : "text-amber-800"}`}>{queueStatus.redisOk ? "✓ Scheduler ready" : "Run worker for scheduled posts"}</p>}
                  {scheduleWarning && <p className="mt-2 text-xs text-amber-800">{scheduleWarning}</p>}
                  {scheduleSuccess && <p className="mt-2 text-sm font-medium text-amber-900">{successMessage}</p>}
                  <div className="mt-6 flex gap-4">
                    <button type="button" onClick={handlePublishNow} disabled={publishing || scheduling || selectedMediaIds.length === 0} className="flex-1 rounded-xl bg-amber-500 py-3.5 font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed">
                      {publishing ? "Publishing…" : "Publish now"}
                    </button>
                    <button type="button" onClick={handleSchedule} disabled={scheduling || publishing || selectedMediaIds.length === 0} className="flex-1 rounded-xl border border-amber-400 bg-amber-50 py-3.5 font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed">
                      {scheduling ? "Scheduling…" : "Schedule"}
                    </button>
                  </div>
                </div>
              </motion.section>
              <div className="hidden lg:block lg:sticky lg:top-8 lg:self-start">
                <PostPreview />
              </div>
            </div>
          </>
        )}

        {activeTab === "scheduled" && (
          <>
            <div className="mb-8">
              <h2 className="font-display text-3xl font-medium text-stone-800">Posts</h2>
              <p className="mt-1 text-sm text-stone-700">Scheduled and published.</p>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-amber-200 bg-[#fffef9] p-6 sm:p-8 shadow-xl"
            >
              {Array.isArray(scheduledPosts) && scheduledPosts.some((p) => p.status === "scheduled" || p.status === "failed") && (
                <p className="text-xs text-amber-900 mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                  Some posts didn’t run at their time. Click <strong>Publish now</strong> on a post to send it now.
                </p>
              )}
              {!Array.isArray(scheduledPosts) || scheduledPosts.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="font-display text-lg text-stone-600">No posts yet</p>
                  <p className="mt-2 text-sm text-stone-600">Create your first post from the sidebar.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                {[...scheduledPosts].reverse().map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPublishNow={async (postId) => {
                      try {
                        const res = await fetch(`/api/posts/${postId}/publish`, { method: "POST" });
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}));
                          throw new Error(data.error ?? "Publish failed");
                        }
                        const postsRes = await fetch("/api/posts");
                        const posts = await postsRes.json();
                        setScheduledPosts(Array.isArray(posts) ? posts : []);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Publish failed");
                      }
                    }}
                  />
                ))}
                </div>
              )}
            </motion.div>
          </>
        )}

        {activeTab === "messages" && (
          <>
            <div className="mb-8">
              <h2 className="font-display text-3xl font-medium text-stone-800">Messages</h2>
              <p className="mt-1 text-sm text-stone-700">View Instagram DMs and reply from your dashboard.</p>
            </div>
            <MessagingPanel connected={account.connected} />
          </>
        )}

        {activeTab === "engagement" && (
          <>
            <div className="mb-8">
              <h2 className="font-display text-3xl font-medium text-stone-800">Engagement</h2>
              <p className="mt-1 text-sm text-stone-700">View Page posts and engagement metrics (reactions, comments, shares).</p>
            </div>
            <PageEngagementPanel connected={account.connected} />
          </>
        )}

        {activeTab === "comments" && (
          <>
            <div className="mb-8">
              <h2 className="font-display text-3xl font-medium text-stone-800">Comments</h2>
              <p className="mt-1 text-sm text-stone-700">View and manage comments on your published Instagram posts.</p>
            </div>
            <CommentsPanel connected={account.connected} />
          </>
        )}

        {activeTab === "business" && (
          <>
            <div className="mb-8">
              <h2 className="font-display text-3xl font-medium text-stone-800">Business</h2>
              <p className="mt-1 text-sm text-stone-700">View Meta business portfolio information for the connected account.</p>
            </div>
            <BusinessPortfolioPanel connected={account.connected} />
          </>
        )}

        {activeTab === "profile" && (
          <>
            <div className="mb-8">
              <h2 className="font-display text-3xl font-medium text-stone-800">Profile</h2>
              <p className="mt-1 text-sm text-stone-700">View Instagram profile information and existing media/posts.</p>
            </div>
            <InstagramProfilePanel connected={account.connected} />
          </>
        )}
        </div>
      </main>
    </div>
  );
}
