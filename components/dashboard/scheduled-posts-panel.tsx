"use client";

import { cancelScheduledPost } from "@/app/actions/schedule-post";
import { formatDashboardDateTime } from "@/lib/datetime/format-dashboard-datetime";

export type ScheduledPostRow = {
  id: string;
  scheduled_at: string;
  caption: string;
  status: string;
  channel?: "facebook" | "instagram" | "both" | null;
};

export function ScheduledPostsPanel({
  rows,
}: {
  rows: ScheduledPostRow[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Scheduled</h2>
      <p className="text-sm text-slate-600">
        Posts go out shortly after the time you pick (usually within about a minute)
        once a scheduler hits <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">/api/cron/process-scheduled</code>{" "}
        with your workspace <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">CRON_SECRET</code>.
        On Vercel Hobby, enable the GitHub Action in{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.github/workflows/process-scheduled-cron.yml</code>{" "}
        (repo secrets <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">PRNIT_SITE_URL</code>,{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">PRNIT_CRON_SECRET</code>) or use another
        every-minute HTTP cron pointed at the same URL.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No upcoming posts in the queue.</p>
      ) : null}
      {rows.length > 0 ? (
      <ul className="space-y-2">
        {rows.map((row) => {
          const channelLabel =
            row.channel === "instagram"
              ? "Instagram"
              : row.channel === "both"
                ? "Facebook + Instagram"
                : "Facebook";
          return (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">
                  {formatDashboardDateTime(row.scheduled_at)}
                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-normal text-slate-700">
                    {channelLabel}
                  </span>
                  {row.status === "processing" ? (
                    <span className="ml-2 text-xs font-normal text-amber-700">
                      (publishing…)
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 line-clamp-2 text-slate-600">{row.caption}</p>
              </div>
              {row.status === "pending" ? (
                <form action={cancelScheduledPost}>
                  <input type="hidden" name="id" value={row.id} />
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
      ) : null}
    </section>
  );
}
