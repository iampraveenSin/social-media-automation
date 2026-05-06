import { getZonedWallClock, utcFromLocalWall } from "@/lib/auto-post/smart-run-time";

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

function addDaysProleptic(
  y: number,
  mo: number,
  d: number,
  n: number,
): [number, number, number] {
  const u = new Date(Date.UTC(y, mo - 1, d + n));
  return [u.getUTCFullYear(), u.getUTCMonth() + 1, u.getUTCDate()];
}

function addMonthProleptic(y: number, mo: number, d: number): [number, number, number] {
  let nm = mo + 1;
  let ny = y;
  if (nm > 12) {
    nm = 1;
    ny += 1;
  }
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const dd = Math.min(d, lastDay);
  return [ny, nm, dd];
}

/**
 * Next run: same local clock time in `timeZone`, advanced by cadence on the calendar
 * (e.g. daily = next local day at same hour; every_3_days = +3 local days).
 */
export function addCadenceInTimeZone(
  anchor: Date,
  cadence: AutoCadence,
  timeZone: string,
): Date {
  const w = getZonedWallClock(anchor.getTime(), timeZone);
  let y = w.y;
  let mo = w.mo;
  let d = w.d;
  const h = w.h;
  const m = w.m;

  switch (cadence) {
    case "daily":
      [y, mo, d] = addDaysProleptic(y, mo, d, 1);
      break;
    case "every_3_days":
      [y, mo, d] = addDaysProleptic(y, mo, d, 3);
      break;
    case "weekly":
      [y, mo, d] = addDaysProleptic(y, mo, d, 7);
      break;
    case "monthly":
      [y, mo, d] = addMonthProleptic(y, mo, d);
      break;
    default:
      [y, mo, d] = addDaysProleptic(y, mo, d, 1);
  }

  return utcFromLocalWall(y, mo, d, h, m, timeZone);
}

/** @deprecated Prefer `addCadenceInTimeZone` with the user’s IANA timezone. */
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
