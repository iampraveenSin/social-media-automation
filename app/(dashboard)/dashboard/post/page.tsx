import type { Metadata } from "next";
import {
  PublishedPostsTable,
  type PublishedPostRow,
} from "@/components/dashboard/published-posts-table";
import {
  ScheduledPostsPanel,
  type ScheduledPostRow,
} from "@/components/dashboard/scheduled-posts-panel";
import { DASHBOARD_NAV } from "@/lib/dashboard/nav-config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Posts",
};

export const dynamic = "force-dynamic";

export default async function DashboardPostPage() {
  const blurb = DASHBOARD_NAV.find((n) => n.href.includes("/post"));

  let publishedRows: PublishedPostRow[] = [];
  let publishedError: string | null = null;
  let scheduledRows: ScheduledPostRow[] = [];
  let scheduledError: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const [pubRes, schRes] = await Promise.all([
        supabase
          .from("published_posts")
          .select(
            "id, created_at, caption, status, channel, facebook_post_id, facebook_media_id, instagram_media_id, media_summary",
          )
          .eq("user_id", user.id)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("scheduled_posts")
          .select("id, scheduled_at, caption, status, channel")
          .eq("user_id", user.id)
          .in("status", ["pending", "processing"])
          .order("scheduled_at", { ascending: true })
          .limit(50),
      ]);

      if (pubRes.error) {
        publishedError = pubRes.error.message;
      } else {
        publishedRows = (pubRes.data ?? []) as PublishedPostRow[];
      }

      if (schRes.error) {
        scheduledError = schRes.error.message;
      } else {
        scheduledRows = (schRes.data ?? []) as ScheduledPostRow[];
      }
    }
  } catch (e) {
    publishedError =
      e instanceof Error ? e.message : "Could not load posts.";
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Posts
        </h1>
        <p className="mt-2 text-slate-600">{blurb?.description}</p>
      </div>

      {scheduledError ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          <p className="font-medium">Scheduled posts unavailable</p>
          <p className="mt-1 text-xs text-amber-800">{scheduledError}</p>
          <p className="mt-2 text-xs text-amber-800">
            If this persists, the person who runs Prnit for your organization may
            need to finish setup. You can try again later.
          </p>
        </div>
      ) : (
        <ScheduledPostsPanel rows={scheduledRows} />
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Published</h2>
        {publishedError ? (
          <div
            className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950"
            role="alert"
          >
            <p className="font-semibold">Could not load publish history</p>
            <p className="mt-2 text-amber-900">{publishedError}</p>
            <p className="mt-3 text-xs text-amber-800">
              If this continues, ask your administrator to check the database
              setup, or try again later.
            </p>
          </div>
        ) : (
          <PublishedPostsTable rows={publishedRows} />
        )}
      </section>
    </div>
  );
}
