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
import { useAppStore } from "@/store/useAppStore";
import { buildCollageBlob } from "@/lib/collage";
import { markDriveFileIdsAsPosted } from "@/lib/drive-pick-round";
import { convertVideoForInstagramInBrowser } from "@/lib/convert-video-browser";
import type { ScheduledPost, MediaItem } from "@/lib/types";
import type { RecurrenceFrequency } from "@/lib/types";
import { DEFAULT_POST_TIMES } from "@/lib/types";

export default function DashboardPage() {
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
  } = useAppStore();

  const getEffectiveMediaId = async (): Promise<string> => {
    if (selectedMediaIds.length === 0) throw new Error("Select at least one image");
    if (selectedMediaIds.length === 1) return selectedMediaIds[0];
    const urls = selectedMediaIds
      .map((id) => {
        const m = media.find((x) => x.id === id);
        if (!m) return null;
        return m.url.startsWith("http") ? m.url : `${typeof window !== "undefined" ? window.location.origin : ""}${m.url}`;
      })
      .filter(Boolean) as string[];
    if (urls.length !== selectedMediaIds.length) throw new Error("Some selected images could not be loaded");
    const blob = await buildCollageBlob(urls);
    const form = new FormData();
    form.append("file", new File([blob], "collage.png", { type: "image/png" }));
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("Failed to upload collage");
    const item = (await res.json()) as MediaItem;
    return item.id;
  };

  const [account, setAccount] = useState<{ connected: boolean; username?: string; suggestedNiche?: string | null }>({ connected: false });
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
  const [activeTab, setActiveTab] = useState<"create" | "scheduled">("create");
  const [recurrence, setRecurrence] = useState<{
    enabled: boolean;
    frequency: RecurrenceFrequency;
    nextRunAt: string | null;
    postTimes: string[];
  }>({ enabled: false, frequency: "daily", nextRunAt: null, postTimes: DEFAULT_POST_TIMES });
  const [recurrenceSaving, setRecurrenceSaving] = useState(false);
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
          return JSON.parse(text) as { enabled?: boolean; frequency?: RecurrenceFrequency; nextRunAt?: string | null; postTimes?: string[] };
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

  const handleSchedule = async () => {
    if (selectedMediaIds.length === 0) {
      setError("Select at least one image");
      return;
    }
    setScheduling(true);
    setError(null);
    setScheduleSuccess(false);
    try {
      const mediaId = await getEffectiveMediaId();
      const at = scheduledAt ?? new Date(Date.now() + 3600000);
      const driveIds = selectedMediaIds.map((id) => media.find((m) => m.id === id)?.driveFileId).filter(Boolean) as string[];
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
      const singleMedia = selectedMediaIds.length === 1 ? media.find((m) => m.id === selectedMediaIds[0]) : null;
      const isVideo = singleMedia?.mimeType?.startsWith("video/");

      if (isVideo && singleMedia?.url) {
        const fullUrl = singleMedia.url.startsWith("http") ? singleMedia.url : `${typeof window !== "undefined" ? window.location.origin : ""}${singleMedia.url.startsWith("/") ? singleMedia.url : "/" + singleMedia.url}`;
        const converted = await convertVideoForInstagramInBrowser(fullUrl);
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
      } else {
        mediaId = await getEffectiveMediaId();
      }

      const driveIds = selectedMediaIds.map((id) => media.find((m) => m.id === id)?.driveFileId).filter(Boolean) as string[];
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
        </nav>
        <div className="p-4 border-t border-amber-200 space-y-3">
          <div className="rounded-lg bg-amber-50 p-3 space-y-2">
            <p className="font-display text-xs font-medium tracking-widest uppercase text-amber-800">Accounts</p>
            {account.connected ? <p className="text-xs text-stone-700">Instagram ✓</p> : <a href="/api/auth/instagram" className="text-xs text-amber-700 hover:underline">Connect Instagram</a>}
            {drive.connected ? <p className="text-xs text-stone-700">Drive ✓</p> : <a href="/api/drive/auth" className="text-xs text-amber-700 hover:underline">Connect Drive</a>}
          </div>
          <label className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 cursor-pointer">
            <input type="checkbox" checked={recurrence.enabled} onChange={async (e) => { const en = e.target.checked; setRecurrence((p) => ({ ...p, enabled: en })); setRecurrenceSaving(true); try { const r = await fetch("/api/recurrence", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ enabled: en, frequency: recurrence.frequency, postTimes: recurrence.postTimes }) }); const text = await r.text(); let d: { enabled?: boolean; nextRunAt?: string | null; error?: string } = {}; try { if (text) d = JSON.parse(text); } catch { /* ignore */ } if (r.ok) setRecurrence((p) => ({ ...p, enabled: d.enabled ?? en, nextRunAt: d.nextRunAt ?? null })); else { setRecurrence((p) => ({ ...p, enabled: !en })); setError(d.error ?? "Failed to save auto-post"); } } catch (err) { setRecurrence((p) => ({ ...p, enabled: !en })); setError(err instanceof Error ? err.message : "Failed to save"); } finally { setRecurrenceSaving(false); } }} disabled={recurrenceSaving} className="h-3.5 w-3.5 rounded border-amber-500 text-amber-600" />
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

            {/* Accounts */}
            <div className="grid gap-4 sm:grid-cols-2 mb-8">
              <div className="rounded-xl border border-amber-200 bg-[#fffef9] p-5">
                <ConnectInstagram
                  connected={account.connected}
                  username={account.username}
                  onDisconnect={async () => {
                    await fetch("/api/auth/instagram/disconnect", { method: "POST" });
                    const res = await fetch("/api/accounts");
                    const data = await res.json();
                    setAccount({ connected: data.connected ?? false, username: data.username });
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
                    <p className="text-xs text-stone-600 mb-3">One post per period (e.g. once per day). The time of that single post rotates through the 3 slots below so each post is at a different time. Run the worker for this to run.</p>
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
                                  body: JSON.stringify({ enabled: en, frequency: recurrence.frequency, postTimes: recurrence.postTimes }),
                                });
                                const text = await r.text();
                                let d: { enabled?: boolean; frequency?: RecurrenceFrequency; nextRunAt?: string | null; postTimes?: string[]; error?: string } = {};
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
                                body: JSON.stringify({ enabled: recurrence.enabled, frequency: freq, postTimes: recurrence.postTimes }),
                              });
                              const text = await r.text();
                              let d: { frequency?: RecurrenceFrequency; nextRunAt?: string | null; error?: string } = {};
                              try {
                                if (text) d = JSON.parse(text) as typeof d;
                              } catch {
                                setError("Invalid response from server");
                              }
                              if (r.ok) setRecurrence((p) => ({ ...p, frequency: d.frequency ?? freq, nextRunAt: d.nextRunAt ?? null }));
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
                                      body: JSON.stringify({ enabled: recurrence.enabled, frequency: recurrence.frequency, postTimes }),
                                    });
                                    const text = await r.text();
                                    let d: { nextRunAt?: string | null; postTimes?: string[]; error?: string } = {};
                                    try {
                                      if (text) d = JSON.parse(text) as typeof d;
                                    } catch {
                                      /* ignore */
                                    }
                                    if (r.ok) setRecurrence((p) => ({ ...p, nextRunAt: d.nextRunAt ?? p.nextRunAt, postTimes: Array.isArray(d.postTimes) && d.postTimes.length > 0 ? d.postTimes : postTimes }));
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
        </div>
      </main>
    </div>
  );
}
