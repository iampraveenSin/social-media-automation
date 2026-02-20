// BullMQ queue for scheduled posts. Requires REDIS_URL (same URL for app and worker).

import { Queue, Worker } from "bullmq";
import { savePost, getPost } from "./store";
import { publishToInstagram, publishToFacebookPage, isPublicImageUrl, LOCALHOST_MEDIA_MESSAGE } from "./instagram";
import { getAccountByUserId } from "./store";
import type { ScheduledPost } from "./types";

const connection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : { host: "localhost", port: 6379 };

const QUEUE_NAME = "instagram-posts";

export function getPostsQueue(): Queue<ScheduledPost, unknown, string> | null {
  try {
    return new Queue<ScheduledPost, unknown, string>(QUEUE_NAME, { connection });
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

/** Check if Redis is reachable (for dashboard status). */
export async function isQueueAvailable(): Promise<boolean> {
  const queue = getPostsQueue();
  if (!queue) return false;
  try {
    await queue.getJobCounts();
    return true;
  } catch {
    return false;
  }
}

export function startWorker(): void {
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
      { connection }
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
