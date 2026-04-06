export type AutoCadence =
  | "daily"
  | "every_3_days"
  | "weekly"
  | "monthly";

export function isAutoCadence(s: string): s is AutoCadence {
  return (
    s === "daily" ||
    s === "every_3_days" ||
    s === "weekly" ||
    s === "monthly"
  );
}

/** Next run instant: same UTC clock time, shifted by cadence from the previous scheduled run. */
export function addCadenceToDate(d: Date, cadence: AutoCadence): Date {
  const out = new Date(d.getTime());
  switch (cadence) {
    case "daily":
      out.setUTCDate(out.getUTCDate() + 1);
      break;
    case "every_3_days":
      out.setUTCDate(out.getUTCDate() + 3);
      break;
    case "weekly":
      out.setUTCDate(out.getUTCDate() + 7);
      break;
    case "monthly":
      out.setUTCMonth(out.getUTCMonth() + 1);
      break;
    default:
      out.setUTCDate(out.getUTCDate() + 1);
  }
  return out;
}
