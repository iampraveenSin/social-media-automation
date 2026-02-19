"use client";

import { useEffect, useState } from "react";
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
import { DashboardHeader } from "@/components/DashboardHeader";
import { useAppStore } from "@/store/useAppStore";
import { buildCollageBlob } from "@/lib/collage";
import { markDriveFileIdsAsPosted } from "@/lib/drive-pick-round";
import type { ScheduledPost, MediaItem } from "@/lib/types";

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
          const redirect = typeof window !== "undefined" ? `${window.location.origin}/login?redirect=/dashboard` : "/login";
          window.location.href = redirect;
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
          if (typeof window !== "undefined") window.location.href = `${window.location.origin}/login?redirect=/dashboard`;
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
          if (typeof window !== "undefined") window.location.href = `${window.location.origin}/login?redirect=/dashboard`;
          return null;
        }
        return r.json();
      })
      .then((d) => d != null && setDrive({ connected: !!d.connected, folderId: d.folderId ?? null }))
      .catch(() => setDrive({ connected: false }));
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
            if (typeof window !== "undefined") window.location.href = `${window.location.origin}/login?redirect=/dashboard`;
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
      const mediaId = await getEffectiveMediaId();
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
    <div className="min-h-screen bg-[#0a0a0d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(251,191,36,0.04),transparent)] pointer-events-none" />
      <DashboardHeader />

      <main className="relative mx-auto max-w-6xl px-6 py-8">
        {/* Page title */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-white/60">Create and manage your Instagram posts from one place.</p>
        </div>
        {error && !errorDismissed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 space-y-3"
          >
            <div className="flex items-start justify-between gap-3 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300">
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
                className="shrink-0 rounded px-2 py-1 text-red-400 hover:bg-red-500/20"
                aria-label="Dismiss"
              >
                Dismiss
              </button>
            </div>
            {(error.includes("publicly accessible") || error.includes("Only photo or video") || error.includes("media type") || error.includes("localhost")) && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                <p className="font-medium mb-2">Why nothing posts to Instagram</p>
                <p className="text-amber-200/90 mb-2">
                  Instagram’s servers must be able to <strong>download your image from a public URL</strong>. When the app runs on <strong>localhost</strong>, the image URL is something like <code className="rounded bg-white/10 px-1">http://localhost:3000/uploads/...</code>, which only your computer can open. Instagram cannot open it, so the post fails.
                </p>
                <p className="font-medium mb-1">Fix:</p>
                <ol className="list-decimal list-inside space-y-1 text-amber-200/90">
                  <li><strong>Use production:</strong> Deploy the app (e.g. Vercel) and set <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_APP_URL=https://automation-aditya.vercel.app</code> in the deployed env. Image URLs will be public so Instagram can fetch them. For local dev use <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_APP_URL=http://localhost:3000</code>.</li>
                </ol>
              </div>
            )}
            {(error.includes("No Facebook Pages") || error === "no_page") && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                <p className="font-medium mb-2">To fix “no page”:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-amber-200/90">
                  <li>Use the <strong>Facebook account that is an admin</strong> of your Page (e.g. Avanora). When you click Connect Instagram, log in with that account.</li>
                  <li>If you don’t have a Page yet, create one at <a href="https://www.facebook.com/pages/creation" target="_blank" rel="noreferrer" className="underline">facebook.com/pages/creation</a>, then try again.</li>
                  <li>When Facebook asks for permissions, <strong>accept “Business management”</strong> and Pages access. Without it, Meta doesn’t return your Pages. Then try Connect Instagram again.</li>
                  <li>If “Business management” doesn’t appear or you get a permission error: in <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="underline">developers.facebook.com</a> → your app → <strong>App Review</strong> → <strong>Permissions and Features</strong> → add <strong>business_management</strong> (and request it if needed for production).</li>
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
                  className="mt-3 rounded bg-amber-500/30 px-3 py-1.5 text-sm font-medium text-amber-200 hover:bg-amber-500/40"
                >
                  Got it, dismiss
                </button>
              </div>
            )}
            {(error.includes("No Instagram Business") || error.includes("We found your Facebook Page")) && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                <p className="font-medium mb-2">To fix this (Meta’s official way — from Instagram):</p>
                <ol className="list-decimal list-inside space-y-1.5 text-amber-200/90">
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
                  className="mt-3 rounded bg-amber-500/30 px-3 py-1.5 text-sm font-medium text-amber-200 hover:bg-amber-500/40"
                >
                  Got it, dismiss
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Connections */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">Connections</h2>
          <div className="grid gap-4 sm:grid-cols-2">
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
          <ConnectDrive
            connected={drive.connected}
            folderId={drive.folderId}
            onDisconnect={async () => {
              await fetch("/api/drive/disconnect", { method: "POST" });
              setDrive({ connected: false, folderId: null });
            }}
            onFolderSave={async (folderIdOrLink) => {
              await fetch("/api/drive/folder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ folderId: folderIdOrLink }),
              });
              const res = await fetch("/api/drive/status");
              const data = await res.json();
              setDrive({ connected: !!data.connected, folderId: data.folderId ?? null });
            }}
          />
          </div>
        </section>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition sm:flex-none sm:px-6 ${
              activeTab === "create"
                ? "bg-amber-500 text-black shadow-sm"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            Create post
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("scheduled")}
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition sm:flex-none sm:px-6 ${
              activeTab === "scheduled"
                ? "bg-amber-500 text-black shadow-sm"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            Scheduled & published
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "create" && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <label className="mb-1.5 block text-sm font-medium text-white/70">Niche</label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-white focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition"
                >
                  <option value="lifestyle">Lifestyle</option>
                  <option value="photography">Photography</option>
                  <option value="fitness">Fitness</option>
                  <option value="food">Food</option>
                  <option value="tech">Tech</option>
                  <option value="fashion">Fashion</option>
                  <option value="education">Education</option>
                  <option value="motivation">Motivation</option>
                </select>
              </div>
              {account.connected && (
                <button
                  type="button"
                  onClick={async () => {
                    setAnalyzingAccount(true);
                    try {
                      const res = await fetch("/api/accounts/analyze", { method: "POST" });
                      const data = await res.json();
                      if (res.ok && data.suggestedNiche) {
                        setNiche(data.suggestedNiche);
                        setAccount((a) => ({ ...a, suggestedNiche: data.suggestedNiche }));
                      }
                    } finally {
                      setAnalyzingAccount(false);
                    }
                  }}
                  disabled={analyzingAccount}
                  className="shrink-0 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {analyzingAccount ? "Analyzing…" : "Auto-detect from account"}
                </button>
              )}
            </div>
            {account.connected && (
              <p className="text-xs text-white/40">
                Niche is detected from your Instagram username and bio. Changed your bio (e.g. to fitness, IT, adventure)? Click “Auto-detect from account” to fetch the latest profile and update the category.
              </p>
            )}
            <div className="space-y-1">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/70">Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. daily routines"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/70">Vibe</label>
                  <input
                    type="text"
                    value={vibe}
                    onChange={(e) => setVibe(e.target.value)}
                    placeholder="e.g. cozy, calm"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/70">Audience</label>
                  <input
                    type="text"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="e.g. young creatives"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition"
                  />
                </div>
              </div>
              <p className="text-xs text-white/40">Optional. Leave blank and click “Generate from image” to auto-detect topic, vibe and audience from the image.</p>
            </div>
            <PickFromDrive connected={drive.connected} folderId={drive.folderId} />
            <MediaUpload />
            <CaptionEditor />
            <LogoSettings />
            <SchedulePicker />
            {queueStatus && (
              <div className={`rounded-xl border px-4 py-3 text-sm ${queueStatus.redisOk ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
                {queueStatus.redisOk
                  ? "✓ Redis connected. Scheduled posts will publish at the set time as long as you keep npm run worker running in another terminal."
                  : "Scheduled posts will not run until Redis is running and you start the worker. In a separate terminal: 1) Start Redis (e.g. redis-server). 2) Run: npm run worker"}
              </div>
            )}
            {scheduleWarning && (
              <p className="text-xs text-amber-400/90">
                {scheduleWarning}
              </p>
            )}
            {scheduleSuccess && (
              <p className="text-sm text-emerald-400">{successMessage || "Done."}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handlePublishNow}
                disabled={publishing || scheduling || selectedMediaIds.length === 0}
                className="flex-1 rounded-xl border border-emerald-500/50 bg-emerald-500/20 py-3.5 font-medium text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50"
              >
                {publishing ? "Publishing…" : "Publish now"}
              </button>
              <button
                type="button"
                onClick={handleSchedule}
                disabled={scheduling || publishing || selectedMediaIds.length === 0}
                className="flex-1 rounded-xl bg-amber-500 py-3.5 font-medium text-black shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-50"
              >
                {scheduling ? "Scheduling…" : "Schedule post"}
              </button>
            </div>
            <p className="text-xs text-white/50">
              Publish now = post to Instagram immediately. Schedule = post at the set time (requires Redis + <code className="rounded bg-white/10 px-1">npm run worker</code> in another terminal).
            </p>
          </motion.section>
        )}

        {activeTab === "scheduled" && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-sm"
          >
            {Array.isArray(scheduledPosts) && scheduledPosts.some((p) => p.status === "scheduled" || p.status === "failed") && (
              <p className="text-xs text-amber-400/90 mb-4">
                Posts still &quot;scheduled&quot; or &quot;failed&quot; didn’t run at their time (worker or Redis was off). Click <strong>Publish now</strong> on a card to send that post to Instagram now.
              </p>
            )}
            {!Array.isArray(scheduledPosts) || scheduledPosts.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/50">
                No posts yet. Switch to <strong>Create post</strong> to upload an image, add a caption, and schedule.
              </p>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-16rem)] pr-1">
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
          </motion.section>
        )}
      </main>
    </div>
  );
}
