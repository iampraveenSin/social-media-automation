/**
 * Human-readable “how was this published?” — used on Posts → Published.
 * Prefer top-level `publish_source` column when present (reliable); else JSON; else channel.
 */
export type PublishedSourceInput = {
  channel?: string | null;
  /** DB column — preferred */
  publish_source?: string | null;
  media_summary?: {
    publish_source?: "manual" | "scheduled" | "auto";
  } | null;
};

function resolveSource(
  row: PublishedSourceInput,
): "manual" | "scheduled" | "auto" | undefined {
  const col = String(row.publish_source ?? "").trim().toLowerCase();
  if (col === "scheduled" || col === "auto" || col === "manual") {
    return col;
  }
  const raw = row.media_summary?.publish_source;
  if (raw === "scheduled" || raw === "auto" || raw === "manual") {
    return raw;
  }
  return undefined;
}

export function getPublishedPostSourceLabel(row: PublishedSourceInput): string {
  const src = resolveSource(row);

  if (src === "scheduled") return "Scheduled post";
  if (src === "auto") return "Auto post";

  const ch = String(row.channel ?? "").toLowerCase();
  if (ch === "instagram") return "Publish to Instagram";
  return "Publish to Facebook";
}

export function getPublishedPostSourceTitle(row: PublishedSourceInput): string {
  const raw = resolveSource(row);
  if (raw === "scheduled") {
    return "Saved under Posts → Scheduled; sent when the cron job runs at your chosen time.";
  }
  if (raw === "auto") {
    return "Posted by the Auto tab (hands-off posting from Drive).";
  }
  const ch = String(row.channel ?? "").toLowerCase();
  if (ch === "instagram") {
    return "You clicked Publish to Instagram on the Main workspace.";
  }
  return "You clicked Publish to Facebook on the Main workspace.";
}

export function getPublishedPostSourceBadgeClass(
  row: PublishedSourceInput,
): string {
  const raw = resolveSource(row);
  if (raw === "scheduled") return "bg-amber-100 text-amber-950";
  if (raw === "auto") return "bg-violet-100 text-violet-900";
  const ch = String(row.channel ?? "").toLowerCase();
  if (ch === "instagram") return "bg-pink-100 text-pink-900";
  return "bg-blue-100 text-blue-900";
}
