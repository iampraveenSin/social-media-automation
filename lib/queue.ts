// BullMQ queue for scheduled posts. Requires REDIS_URL (same URL for app and worker).
// Connection options include timeouts so serverless (Vercel) doesn't hang when Redis is slow or unreachable.
// isQueueAvailable() uses a lightweight ping with timeout (Upstash-friendly).

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { savePost, getPost, getMediaItem } from "./store";
import { publishToInstagram, publishToFacebookPage, isPublicImageUrl, LOCALHOST_MEDIA_MESSAGE, buildCaptionWithHashtags } from "./instagram";
import type { InstagramMediaType } from "./instagram";
import { resolveVideoForPublish } from "./video";
import { getAccountByUserId } from "./store";
import type { ScheduledPost } from "./types";

const REDIS_OPTIONS = {
  maxRetriesPerRequest: 1,
  enableReadyCheck: false, // critical for Upstash
  connectTimeout: 10000,
} as const;

type ConnectionOptions = { url: string; maxRetriesPerRequest: number; enableReadyCheck: boolean; connectTimeout: number };

/** Lazy: read at call time so worker sees REDIS_URL after dotenv loads. */
function getConnectionOptions(): ConnectionOptions | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  return { url, ...REDIS_OPTIONS };
}

const QUEUE_NAME = "instagram-posts";

export function getPostsQueue(): Queue<ScheduledPost, unknown, string> | null {
  const opts = getConnectionOptions();
  if (!opts) return null;
  try {
    return new Queue<ScheduledPost, unknown, string>(QUEUE_NAME, { connection: opts });
  } catch {
    return null;
  }
}

export function schedulePost(post: ScheduledPost, runAt: Date): Promise<string | null> {
  const queue = getPostsQueue();
  if (!queue) return Promise.resolve(null);
  const delayMs = Math.max(0, runAt.getTime() - Date.now());
  return queue
    .add("publish", post, { delay: delayMs })
    .then((j) => {
      const jobId = j.id ?? null;
      if (jobId) {
        console.log(`[queue] Job enqueued postId=${post.id} jobId=${jobId} runAt=${runAt.toISOString()}`);
      }
      return jobId;
    });
}

/** Lightweight Redis check for dashboard status (serverless-safe; does not hang). Uses ping() with timeout. */
export async function isQueueAvailable(): Promise<boolean> {
  const url = process.env.REDIS_URL;
  if (!url) return false;
  let client: IORedis | null = null;
  try {
    client = new IORedis(url, REDIS_OPTIONS);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Redis ping timeout")), 5000)
    );
    await Promise.race([client.ping(), timeout]);
    return true;
  } catch {
    return false;
  } finally {
    client?.disconnect();
  }
}

export function startWorker(): void {
  const opts = getConnectionOptions();
  if (!opts) {
    throw new Error("REDIS_URL is required to start the worker.");
  }
  try {
    const worker = new Worker<ScheduledPost, void, string>(
      QUEUE_NAME,
      async (job) => {
        const post = job.data;
        const appUserId = post.appUserId ?? "";
        const jobId = job.id ?? "?";
        console.log(`[worker] Job started jobId=${jobId} postId=${post.id}`);
        let updated = await getPost(post.id, appUserId);
        if (!updated || updated.status !== "scheduled") {
          console.log(`[worker] Job skipped jobId=${jobId} postId=${post.id} (not scheduled)`);
          return;
        }
        const userId = updated.userId ?? "";
        try {
          await savePost({ ...updated, status: "publishing" });
          const account = await getAccountByUserId(userId);
          if (!account) {
            await savePost({ ...updated, status: "failed", error: "No Instagram account connected" });
            console.error(`[worker] Job failed jobId=${jobId} postId=${post.id}: No Instagram account connected`);
            return;
          }

          // Prefer media record URL when mediaId is set (e.g. converted video from schedule flow).
          let publishUrl = updated.mediaUrl;
          let isVideo = updated.mediaType === "video";
          if (updated.mediaId) {
            const mediaItem = await getMediaItem(updated.mediaId, appUserId);
            if (mediaItem?.url) {
              publishUrl = mediaItem.url;
              isVideo = mediaItem.mimeType?.startsWith("video/") ?? isVideo;
            }
          }
          if (!isPublicImageUrl(publishUrl)) {
            await savePost({ ...updated, status: "failed", error: LOCALHOST_MEDIA_MESSAGE });
            console.error(`[worker] Job failed jobId=${jobId} postId=${post.id}: ${LOCALHOST_MEDIA_MESSAGE}`);
            return;
          }

          const caption = buildCaptionWithHashtags(updated.caption, updated.hashtags ?? []);
          let instagramMediaType: InstagramMediaType = "image";
          if (isVideo) {
            const resolved = await resolveVideoForPublish(publishUrl);
            publishUrl = resolved.url;
            instagramMediaType = resolved.placement;
          }
          const result = await publishToInstagram(
            account.instagramBusinessAccountId,
            account.accessToken,
            publishUrl,
            caption,
            instagramMediaType
          );

          if ("error" in result) {
            await savePost({ ...updated, status: "failed", error: result.error });
            console.error(`[worker] Job failed jobId=${jobId} postId=${post.id}: ${result.error}`);
            return;
          }

          if (account.facebookPageId) {
            const fbCaption = buildCaptionWithHashtags(updated.caption, updated.hashtags ?? []);
            const fbResult = await publishToFacebookPage(
              account.facebookPageId,
              account.accessToken,
              publishUrl,
              fbCaption,
              isVideo ? "video" : "image"
            );
            if ("error" in fbResult) {
              console.warn("[worker] Facebook Page post failed:", fbResult.error);
            }
          }

          updated = await getPost(post.id, appUserId);
          if (updated) {
            await savePost({
              ...updated,
              status: "published",
              publishedAt: new Date().toISOString(),
              instagramMediaId: result.id,
            });
          }
          console.log(`[worker] Job completed jobId=${jobId} postId=${post.id} instagramMediaId=${result.id}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[worker] Job failed jobId=${jobId} postId=${post.id}:`, err);
          updated = await getPost(post.id, appUserId).catch(() => null);
          if (updated) {
            await savePost({ ...updated, status: "failed", error: msg });
          }
        }
      },
      { connection: opts }
    );
    worker.on("failed", (job, err) => {
      const jobId = job?.id ?? "?";
      const postId = job?.data?.id;
      const appUserId = job?.data?.appUserId;
      console.error(`[worker] Job failed (event) jobId=${jobId} postId=${postId}:`, err?.message ?? err);
      if (postId && appUserId) {
        getPost(postId, appUserId)
          .then((p) => {
            if (p) return savePost({ ...p, status: "failed", error: String(err?.message ?? err) });
          })
          .catch((e) => console.error("[worker] Failed to save failed status:", e));
      }
    });
  } catch (e) {
    console.error("[worker] Failed to start worker (Redis unavailable):", e);
    throw e;
  }
}
