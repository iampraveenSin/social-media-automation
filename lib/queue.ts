// BullMQ queue for scheduled posts. Requires REDIS_URL (same URL for app and worker).
// Connection options include timeouts so serverless (Vercel) doesn't hang when Redis is slow or unreachable.
// isQueueAvailable() uses a lightweight ping with timeout (Upstash-friendly).

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { savePost, getPost } from "./store";
import { publishToInstagram, publishToFacebookPage, isPublicImageUrl, LOCALHOST_MEDIA_MESSAGE } from "./instagram";
import { getAccountByUserId } from "./store";
import type { ScheduledPost } from "./types";

const REDIS_OPTIONS = {
  maxRetriesPerRequest: 1,
  enableReadyCheck: false, // critical for Upstash
  connectTimeout: 10000,
} as const;

/** Connection options for BullMQ (same options for Queue and Worker). */
const connectionOptions: { url: string; maxRetriesPerRequest: number; enableReadyCheck: boolean; connectTimeout: number } | null = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL, ...REDIS_OPTIONS }
  : null;

const QUEUE_NAME = "instagram-posts";

export function getPostsQueue(): Queue<ScheduledPost, unknown, string> | null {
  if (!connectionOptions) return null;
  try {
    return new Queue<ScheduledPost, unknown, string>(QUEUE_NAME, { connection: connectionOptions });
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
  if (!connectionOptions) {
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

          if (!isPublicImageUrl(updated.mediaUrl)) {
            await savePost({ ...updated, status: "failed", error: LOCALHOST_MEDIA_MESSAGE });
            console.error(`[worker] Job failed jobId=${jobId} postId=${post.id}: ${LOCALHOST_MEDIA_MESSAGE}`);
            return;
          }

          const caption = [updated.caption, ...(updated.hashtags ?? [])].join("\n\n");
          const result = await publishToInstagram(
            account.instagramBusinessAccountId,
            account.accessToken,
            updated.mediaUrl,
            caption
          );

          if ("error" in result) {
            await savePost({ ...updated, status: "failed", error: result.error });
            console.error(`[worker] Job failed jobId=${jobId} postId=${post.id}: ${result.error}`);
            return;
          }

          if (account.facebookPageId) {
            const fbCaption = [updated.caption, ...(updated.hashtags ?? [])].join("\n\n");
            const fbResult = await publishToFacebookPage(
              account.facebookPageId,
              account.accessToken,
              updated.mediaUrl,
              fbCaption
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
      { connection: connectionOptions }
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
