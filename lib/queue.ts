// BullMQ queue for scheduled posts. Requires REDIS_URL. Falls back to in-memory for dev.

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
  return queue.add("publish", post, { delay: Math.max(0, runAt.getTime() - Date.now()) }).then((j) => j.id ?? null);
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
        let updated = await getPost(post.id, appUserId);
        if (!updated || updated.status !== "scheduled") return;
        const userId = updated.userId ?? "";
        try {
          await savePost({ ...updated, status: "publishing" });
          const account = await getAccountByUserId(userId);
          if (!account) {
            await savePost({ ...updated, status: "failed", error: "No Instagram account connected" });
            return;
          }

          if (!isPublicImageUrl(updated.mediaUrl)) {
            await savePost({ ...updated, status: "failed", error: LOCALHOST_MEDIA_MESSAGE });
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
              console.warn("Facebook Page post failed:", fbResult.error);
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
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("Worker publish error:", err);
          updated = await getPost(post.id, appUserId);
          if (updated) {
            await savePost({ ...updated, status: "failed", error: msg });
          }
        }
      },
      { connection }
    );
    worker.on("failed", (job, err) => {
      if (job?.data?.id && job?.data?.appUserId) {
        getPost(job.data.id, job.data.appUserId).then((p) => {
          if (p) savePost({ ...p, status: "failed", error: String(err?.message ?? err) });
        });
      }
    });
  } catch {
    // Redis not available
  }
}
