/**
 * Stable date/time for dashboard UI (SSR + hydration must match).
 * Do not use `toLocaleString(undefined, …)` — server and browser locales differ.
 */
const LOCALE = "en-US" as const;
const OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

export function formatDashboardDateTime(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(LOCALE, OPTIONS);
}
