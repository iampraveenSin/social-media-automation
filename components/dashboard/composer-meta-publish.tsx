"use client";

import { useState, useTransition } from "react";
import { generateComposerCaption } from "@/app/actions/generate-caption";
import {
  publishComposerToMetaPage,
  type PublishMetaItem,
} from "@/app/actions/publish-meta";
import { publishComposerToInstagram } from "@/app/actions/publish-instagram";
import {
  scheduleComposerPost,
  type ScheduledPostChannel,
} from "@/app/actions/schedule-post";
import {
  bakeCollageToPngBlob,
  shouldBakeCollage,
} from "@/lib/composer/bake-collage-canvas";
import { postMediaUploadErrorMessage } from "@/lib/composer/post-media-storage-error";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  type ComposerItem,
  type LogoCorner,
  useComposer,
} from "./composer-context";
import { formatDashboardDateTime } from "@/lib/datetime/format-dashboard-datetime";

export type MetaAccountSummary = {
  pageName: string | null;
  instagramUsername: string | null;
  /** Instagram Business account linked to the selected Page (Graph user id stored). */
  instagramConnected: boolean;
};

function buildPayload(
  items: ComposerItem[],
):
  | { ok: true; payload: PublishMetaItem[] }
  | { ok: false; error: string } {
  if (items.length === 0) {
    return { ok: false, error: "Add media before publishing." };
  }
  const payload: PublishMetaItem[] = [];
  for (const i of items) {
    if (i.kind === "drive") {
      payload.push({ kind: "drive", fileId: i.file.id });
    } else if (i.storagePath) {
      payload.push({ kind: "upload", storagePath: i.storagePath });
    } else {
      return {
        ok: false,
        error:
          "Local files must finish uploading to storage first — wait a moment or re-add them.",
      };
    }
  }
  return { ok: true, payload };
}

function buildFullCaption(caption: string, hashtags: string): string {
  const c = caption.trim();
  const h = hashtags.trim();
  if (!h) return c;
  if (!c) return h;
  return `${c}\n\n${h}`;
}

function itemMediaUrlForBake(item: ComposerItem): string {
  if (item.kind === "upload") return item.previewUrl;
  return `${window.location.origin}/api/google/drive/file?id=${encodeURIComponent(item.file.id)}`;
}

async function uploadBakedCollagePng(blob: Blob): Promise<
  { ok: true; path: string } | { ok: false; error: string }
> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in to upload the baked collage to storage." };
  }
  const path = `${user.id}/${crypto.randomUUID()}-baked-collage.png`;
  const file = new File([blob], "baked-collage.png", { type: "image/png" });
  const { error } = await supabase.storage.from("post_media").upload(path, file);
  if (error) {
    return { ok: false, error: postMediaUploadErrorMessage(error) };
  }
  return { ok: true, path };
}

async function resolvePublishItemsAfterBake(
  items: ComposerItem[],
  logoPreviewUrl: string | null,
  logoCorner: LogoCorner,
): Promise<
  | { ok: true; payload: PublishMetaItem[] }
  | { ok: false; error: string }
> {
  if (shouldBakeCollage(items, logoPreviewUrl)) {
    const slice =
      items.length > 4 ? items.slice(0, 4) : items;
    const itemMediaUrls = slice.map(itemMediaUrlForBake);
    const blob = await bakeCollageToPngBlob({
      itemMediaUrls,
      totalCount: items.length,
      logoUrl: logoPreviewUrl,
      logoCorner,
    });
    if (!blob) {
      return {
        ok: false,
        error:
          "Could not render the collage image. Try again, or use smaller files.",
      };
    }
    const up = await uploadBakedCollagePng(blob);
    if (!up.ok) return { ok: false, error: up.error };
    return { ok: true, payload: [{ kind: "upload", storagePath: up.path }] };
  }
  return buildPayload(items);
}

export function ComposerMetaPublish({
  metaAccount,
}: {
  metaAccount: MetaAccountSummary;
}) {
  const { items, logoPreviewUrl, logoCorner } = useComposer();
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [genPending, startGen] = useTransition();
  const [pubPending, startPub] = useTransition();
  const [schedPending, startSched] = useTransition();
  const [igPending, startIg] = useTransition();
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduleChannel, setScheduleChannel] =
    useState<ScheduledPostChannel>("facebook");
  const [success, setSuccess] = useState<string | null>(null);
  const [captionHint, setCaptionHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = genPending || pubPending || schedPending || igPending;
  const publishDisabled = items.length === 0 || busy;
  const pageReady = Boolean(metaAccount.pageName);

  const onGenerate = () => {
    setSuccess(null);
    setCaptionHint(null);
    setError(null);
    startGen(async () => {
      const built = await resolvePublishItemsAfterBake(
        items,
        logoPreviewUrl,
        logoCorner,
      );
      if (!built.ok) {
        setError(built.error);
        return;
      }
      const res = await generateComposerCaption({ items: built.payload });
      if (res.ok) {
        setCaption(res.caption);
        setHashtags(res.hashtags);
        if (res.usedFallback) {
          setCaptionHint(
            "Starter caption and hashtags were filled in. AI isn’t available right now—edit them to match your post.",
          );
        } else {
          setCaptionHint(null);
        }
      } else {
        setError(res.error);
      }
    });
  };

  const onPublish = () => {
    setSuccess(null);
    setCaptionHint(null);
    setError(null);
    const full = buildFullCaption(caption, hashtags);
    if (full.length > 8000) {
      setError("Caption and hashtags together must be 8,000 characters or fewer.");
      return;
    }
    startPub(async () => {
      const built = await resolvePublishItemsAfterBake(
        items,
        logoPreviewUrl,
        logoCorner,
      );
      if (!built.ok) {
        setError(built.error);
        return;
      }
      const res = await publishComposerToMetaPage({
        caption: full,
        items: built.payload,
      });
      if (res.ok) setSuccess(res.message);
      else setError(res.error);
    });
  };

  const onSchedule = () => {
    setSuccess(null);
    setCaptionHint(null);
    setError(null);
    const full = buildFullCaption(caption, hashtags);
    if (!full.trim()) {
      setError("Add a caption (and optional hashtags) for scheduled posts.");
      return;
    }
    if (full.length > 8000) {
      setError("Caption and hashtags together must be 8,000 characters or fewer.");
      return;
    }
    if (!scheduleAt) {
      setError("Choose a date and time for scheduling.");
      return;
    }
    const when = new Date(scheduleAt);
    if (Number.isNaN(when.getTime())) {
      setError("Invalid schedule time.");
      return;
    }
    startSched(async () => {
      const built = await resolvePublishItemsAfterBake(
        items,
        logoPreviewUrl,
        logoCorner,
      );
      if (!built.ok) {
        setError(built.error);
        return;
      }
      const res = await scheduleComposerPost({
        caption: full,
        items: built.payload,
        scheduledAtIso: when.toISOString(),
        channel: scheduleChannel,
      });
      if (res.ok) {
        setSuccess(
          `Scheduled for ${formatDashboardDateTime(when)}. Check the Posts tab for the queue.`,
        );
        setScheduleAt("");
      } else {
        setError(res.error);
      }
    });
  };

  const onPublishInstagram = () => {
    setSuccess(null);
    setCaptionHint(null);
    setError(null);
    const full = buildFullCaption(caption, hashtags);
    if (full.length > 8000) {
      setError("Caption and hashtags together must be 8,000 characters or fewer.");
      return;
    }
    startIg(async () => {
      const built = await resolvePublishItemsAfterBake(
        items,
        logoPreviewUrl,
        logoCorner,
      );
      if (!built.ok) {
        setError(built.error);
        return;
      }
      const res = await publishComposerToInstagram({
        caption: full,
        items: built.payload,
      });
      if (res.ok) setSuccess(res.message);
      else setError(res.error);
    });
  };

  return (
    <div className="mt-6 border-t border-slate-100 pt-6">
      <h3 className="text-sm font-semibold text-slate-900">
        Publish to Facebook Page
      </h3>

      <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-xs leading-relaxed text-indigo-950">
        <span className="font-semibold text-indigo-900">
          Auto-detected account
        </span>
        {metaAccount.pageName ? (
          <span className="mt-1 block">
            Facebook Page:{" "}
            <strong className="text-indigo-950">{metaAccount.pageName}</strong>
            {metaAccount.instagramUsername ? (
              <>
                {" "}
                · Instagram:{" "}
                <strong className="text-indigo-950">
                  @{metaAccount.instagramUsername}
                </strong>
              </>
            ) : (
              <span className="text-indigo-800/80">
                {" "}
                (No Instagram Business account linked to this Page)
              </span>
            )}
          </span>
        ) : (
          <span className="mt-1 block text-amber-900">
            No Page selected yet — choose one in the &quot;Facebook connected&quot;
            section above.
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Use AI to draft a caption and hashtags, edit anything you like, then
        publish to Facebook or Instagram (still images or carousel only), or
        schedule. Multiple still images or a logo are merged into one PNG that
        matches the preview before upload.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={items.length === 0 || busy}
          className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-900 shadow-sm transition hover:bg-violet-100 disabled:opacity-50"
        >
          {genPending ? "Analyzing…" : "Generate caption & hashtags"}
        </button>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Caption (editable)
        </span>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          maxLength={6000}
          placeholder="Write a caption or use Generate to fill this in…"
          className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Hashtags (editable)
        </span>
        <textarea
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="#example #another …"
          className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </label>

      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Schedule
        </p>
        <label className="mt-2 block">
          <span className="sr-only">Date and time</span>
          <input
            type="datetime-local"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <p className="mt-2 max-w-md text-xs text-slate-500">
          Time is in your device timezone. Your post usually goes out shortly
          after the time you pick—not hours later.
        </p>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Post to
          </span>
          <select
            value={scheduleChannel}
            onChange={(e) =>
              setScheduleChannel(e.target.value as ScheduledPostChannel)
            }
            className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="facebook">Facebook only</option>
            <option value="instagram">Instagram only</option>
            <option value="both">Facebook + Instagram</option>
          </select>
        </label>
        <button
          type="button"
          onClick={onSchedule}
          disabled={
            publishDisabled ||
            !scheduleAt ||
            !pageReady ||
            ((scheduleChannel === "instagram" || scheduleChannel === "both") &&
              !metaAccount.instagramConnected)
          }
          className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          title={
            !pageReady
              ? "Connect Facebook and choose a Page first — scheduled posts publish to your Page."
              : (scheduleChannel === "instagram" ||
                    scheduleChannel === "both") &&
                  !metaAccount.instagramConnected
                ? "Link Instagram Business to your Page and reconnect Meta before scheduling for Instagram."
              : undefined
          }
        >
          {schedPending ? "Saving…" : "Schedule post"}
        </button>
        {!pageReady ? (
          <p className="mt-2 text-xs text-amber-800">
            Scheduling needs a connected Facebook Page (same as publishing).
          </p>
        ) : (scheduleChannel === "instagram" || scheduleChannel === "both") &&
          !metaAccount.instagramConnected ? (
          <p className="mt-2 text-xs text-amber-800">
            Instagram scheduling needs a Business/Creator account linked to this
            Page.
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onPublish}
          disabled={publishDisabled || !pageReady}
          className="rounded-xl bg-[#0866FF] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0756d9] disabled:opacity-50"
          title={
            !pageReady
              ? "Connect Meta and select a Page in the section above"
              : undefined
          }
        >
          {pubPending ? "Publishing…" : "Publish to Facebook"}
        </button>
        <button
          type="button"
          onClick={onPublishInstagram}
          disabled={
            publishDisabled ||
            !metaAccount.instagramConnected ||
            !metaAccount.pageName
          }
          className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
          title={
            !metaAccount.instagramConnected
              ? "Link Instagram Business to your Page and reconnect Meta"
              : undefined
          }
        >
          {igPending ? "Publishing…" : "Publish to Instagram"}
        </button>
        <span className="text-xs text-slate-400">
          {buildFullCaption(caption, hashtags).length}/8000 (publish total)
        </span>
      </div>
      {!pageReady ? (
        <p className="mt-2 text-xs text-amber-800">
          Connect Facebook in the section above and select a Page before
          publishing or scheduling. Caption generation still works without Meta.
        </p>
      ) : !metaAccount.instagramConnected ? (
        <p className="mt-2 text-xs text-amber-800">
          Instagram stays off until a Business/Creator account is linked to this
          Page in Meta — then use &quot;Reconnect&quot; above.
        </p>
      ) : null}
      {captionHint ? (
        <p className="mt-3 text-sm text-slate-600" role="status">
          {captionHint}
        </p>
      ) : null}
      {success ? (
        <p className="mt-3 text-sm font-medium text-emerald-800" role="status">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
