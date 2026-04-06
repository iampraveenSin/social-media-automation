/**
 * Vercel Cron (vercel.json) hits this route ~every minute.
 * Polls `scheduled_posts` for due rows, publishes to the user’s Facebook Page,
 * then runs auto-post (`processDueAutoPosts`). Requires Bearer CRON_SECRET +
 * SUPABASE_SERVICE_ROLE_KEY. Locally: `npm run cron:once` while `npm run dev` runs.
 */
import { processDueAutoPosts } from "@/lib/auto-post/process-due-auto-posts";
import { publishToFacebookPageForUser } from "@/lib/publish/facebook-publish-internal";
import { publishToInstagramForUser } from "@/lib/publish/instagram-publish-internal";
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
  if (!secret || auth !== `Bearer ${secret}`) {
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

    const facebookResult =
      channel === "instagram"
        ? null
        : await publishToFacebookPageForUser(admin, row.user_id as string, {
            caption: row.caption as string,
            items: items as PublishMetaItem[],
          });

    const instagramResult =
      channel === "facebook"
        ? null
        : await publishToInstagramForUser(admin, row.user_id as string, {
            caption: row.caption as string,
            items: items as PublishMetaItem[],
          });

    const facebookOk = facebookResult ? facebookResult.ok : true;
    const instagramOk = instagramResult ? instagramResult.ok : true;
    const allOk = facebookOk && instagramOk;

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
      const detail = [facebookResult, instagramResult]
        .filter((x): x is { ok: false; error: string } => Boolean(x && !x.ok))
        .map((x) => x.error)
        .join(" | ");
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
