/**
 * External scheduler (e.g. GitHub Actions every minute) or Vercel Cron hits this route.
 * Polls `scheduled_posts` for due rows, publishes to Facebook/Instagram per channel,
 * then runs auto-post (`processDueAutoPosts`). Auth: Bearer CRON_SECRET or ?secret=
 * matching CRON_SECRET. Needs SUPABASE_SERVICE_ROLE_KEY. Locally: `npm run cron:once`.
 */
import { processDueAutoPosts } from "@/lib/auto-post/process-due-auto-posts";
import { publishToFacebookPageForUser } from "@/lib/publish/facebook-publish-internal";
import { publishToInstagramForUser } from "@/lib/publish/instagram-publish-internal";
import { getChannelPublishStatus } from "@/lib/publish/published-posts";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { PublishMetaItem } from "@/lib/composer/publish-media";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BATCH = 8;
const STALE_PROCESSING_MS = 30 * 60 * 1000;
type ScheduledChannel = "facebook" | "instagram" | "both";

function normalizeScheduledChannel(x: unknown): ScheduledChannel {
  return x === "instagram" || x === "both" ? x : "facebook";
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const qsSecret = new URL(request.url).searchParams.get("secret")?.trim();
  const authorized =
    !!secret && (auth === `Bearer ${secret}` || qsSecret === secret);
  if (!authorized) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return Response.json(
      { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." },
      { status: 500 },
    );
  }

  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  await admin
    .from("scheduled_posts")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("status", "processing")
    .lt("updated_at", staleBefore);

  const { data: due, error: fetchError } = await admin
    .from("scheduled_posts")
    .select("id, user_id, caption, items, channel")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(BATCH);

  if (fetchError) {
    const autoResult = await processDueAutoPosts(admin);
    const body: Record<string, unknown> = {
      ok: false,
      error: fetchError.message,
      auto: autoResult,
    };
    if (/invalid api key/i.test(fetchError.message)) {
      body.hint =
        "Use the service_role secret from Supabase → Project Settings → API (same project as NEXT_PUBLIC_SUPABASE_URL). Do not use the anon or publishable key.";
    }
    return Response.json(body, { status: 500 });
  }

  const results: { id: string; status: string; detail?: string }[] = [];

  for (const row of due ?? []) {
    const { data: claimed, error: claimError } = await admin
      .from("scheduled_posts")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimError || !claimed) {
      continue;
    }

    const items = row.items as unknown;
    if (!Array.isArray(items)) {
      await admin
        .from("scheduled_posts")
        .update({
          status: "failed",
          error_detail: "Invalid items payload",
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      results.push({ id: row.id, status: "failed", detail: "invalid items" });
      continue;
    }

    const channel = normalizeScheduledChannel(
      (row as { channel?: string | null }).channel,
    );

    const referenceId = row.id as string;
    const userId = row.user_id as string;
    const caption = row.caption as string;
    const publishItems = items as PublishMetaItem[];

    const fbStatus =
      channel === "instagram"
        ? { published: false }
        : await getChannelPublishStatus(
            admin,
            userId,
            referenceId,
            "facebook_page",
          );
    const igStatus =
      channel === "facebook"
        ? { published: false }
        : await getChannelPublishStatus(admin, userId, referenceId, "instagram");

    const shouldPublishFb = channel !== "instagram" && !fbStatus.published;
    const shouldPublishIg = channel !== "facebook" && !igStatus.published;

    console.log(
      `[scheduled] Channel: ${channel}, FB: ${
        shouldPublishFb ? "publishing" : "skip (already published)"
      }, IG: ${shouldPublishIg ? "publishing" : "skip (already published)"}`,
    );

    // Concurrent execution with timing
    const fbStart = shouldPublishFb ? Date.now() : 0;
    const igStart = shouldPublishIg ? Date.now() : 0;

    const publishPromises = [];
    
    if (shouldPublishFb) {
      publishPromises.push(
        publishToFacebookPageForUser(admin, userId, {
          caption,
          items: publishItems,
        }, { publishSource: "scheduled", referenceId }).then((result) => ({
          platform: "facebook",
          result,
          duration: Date.now() - fbStart,
        })),
      );
    }
    
    if (shouldPublishIg) {
      publishPromises.push(
        publishToInstagramForUser(admin, userId, {
          caption,
          items: publishItems,
        }, { publishSource: "scheduled", referenceId }).then((result) => ({
          platform: "instagram",
          result,
          duration: Date.now() - igStart,
        })),
      );
    }

    const settledResults = await Promise.allSettled(publishPromises);

    // Log individual platform results
    for (const settled of settledResults) {
      if (settled.status === "fulfilled") {
        const { platform, result, duration } = settled.value;
        console.log(
          `[scheduled] ${platform}: ${
            result.ok ? "SUCCESS" : "FAILED"
          } (${duration}ms)`,
        );
      } else {
        console.error("[scheduled] Platform promise rejected");
      }
    }

    // Determine overall status based on actual results
    const fbResult = settledResults.find(
      (r) => r.status === "fulfilled" && r.value.platform === "facebook",
    );
    const igResult = settledResults.find(
      (r) => r.status === "fulfilled" && r.value.platform === "instagram",
    );
    
    const fbOk =
      fbResult && fbResult.status === "fulfilled"
        ? fbResult.value.result.ok
        : channel === "instagram" || fbStatus.published;
    const igOk =
      igResult && igResult.status === "fulfilled"
        ? igResult.value.result.ok
        : channel === "facebook" || igStatus.published;
    
    const allOk = fbOk && igOk;

    if (allOk) {
      await admin
        .from("scheduled_posts")
        .update({
          status: "published",
          error_detail: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      results.push({ id: row.id, status: "published" });
    } else {
      const errors = [
        fbResult && fbResult.status === "fulfilled" && !fbResult.value.result.ok ? `Facebook: ${fbResult.value.result.error}` : null,
        igResult && igResult.status === "fulfilled" && !igResult.value.result.ok ? `Instagram: ${igResult.value.result.error}` : null,
      ].filter(Boolean);
      
      const detail = errors.length > 0 ? errors.join(" | ") : "Partial failure";
      
      await admin
        .from("scheduled_posts")
        .update({
          status: "failed",
          error_detail: detail.slice(0, 2000),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      results.push({
        id: row.id,
        status: "failed",
        detail,
      });
    }
  }

  const autoResult = await processDueAutoPosts(admin);

  return Response.json({
    ok: true,
    processed: results.length,
    results,
    auto: autoResult,
  });
}
