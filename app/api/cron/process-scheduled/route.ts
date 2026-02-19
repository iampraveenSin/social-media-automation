import { NextRequest, NextResponse } from "next/server";
import { getUsers, getPosts, getPost, savePost } from "@/lib/store";
import { getAccountByUserId } from "@/lib/store";
import { publishToInstagram, publishToFacebookPage, isPublicImageUrl, LOCALHOST_MEDIA_MESSAGE } from "@/lib/instagram";

/**
 * Process due scheduled posts (for Vercel Cron or external cron).
 * Call this every 1–5 minutes so scheduled posts publish without Redis/worker.
 * Secure with CRON_SECRET: Header "Authorization: Bearer <CRON_SECRET>" or "x-cron-secret: <CRON_SECRET>".
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const headerSecret = request.headers.get("x-cron-secret");
  if (secret && secret.length > 0 && secret !== bearer && secret !== headerSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const users = await getUsers();
    let processed = 0;
    const errors: string[] = [];

    for (const user of users) {
      const appUserId = user.id;
      const posts = await getPosts(appUserId);
      const due = posts.filter(
        (p) => p.status === "scheduled" && new Date(p.scheduledAt).getTime() <= now.getTime()
      );

      for (const p of due) {
        const updated = await getPost(p.id, appUserId);
        if (!updated || updated.status !== "scheduled") continue;

        try {
          await savePost({ ...updated, status: "publishing" });
          const userId = updated.userId ?? "";
          const account = await getAccountByUserId(userId);
          if (!account) {
            await savePost({ ...updated, status: "failed", error: "No Instagram account connected" });
            errors.push(`${p.id}: No Instagram account`);
            continue;
          }
          if (!isPublicImageUrl(updated.mediaUrl)) {
            await savePost({ ...updated, status: "failed", error: LOCALHOST_MEDIA_MESSAGE });
            errors.push(`${p.id}: ${LOCALHOST_MEDIA_MESSAGE}`);
            continue;
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
            errors.push(`${p.id}: ${result.error}`);
            continue;
          }

          if (account.facebookPageId) {
            const fbCaption = [updated.caption, ...(updated.hashtags ?? [])].join("\n\n");
            const fbResult = await publishToFacebookPage(
              account.facebookPageId,
              account.accessToken,
              updated.mediaUrl,
              fbCaption
            );
            if ("error" in fbResult) console.warn("Facebook Page post failed:", fbResult.error);
          }

          const after = await getPost(p.id, appUserId);
          if (after) {
            await savePost({
              ...after,
              status: "published",
              publishedAt: new Date().toISOString(),
              instagramMediaId: result.id,
            });
          }
          processed++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const post = await getPost(p.id, appUserId);
          if (post) await savePost({ ...post, status: "failed", error: msg });
          errors.push(`${p.id}: ${msg}`);
        }
      }
    }

    return NextResponse.json({ ok: true, processed, errors });
  } catch (e) {
    console.error("Cron process-scheduled error:", e);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
