import type { AutoPostChannel } from "@/lib/auto-post/channel";

/** 0 = Sunday … 6 = Saturday (aligned with `Date.prototype.getUTCDay` when using noon anchor). */
type Dow = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type Slot = {
  /** Inclusive start minutes from midnight in `timeZone`. */
  startMin: number;
  /** Exclusive end minutes from midnight (last eligible minute is endMin - 1). */
  endMin: number;
  /** If set, slot only applies on these weekdays (local). */
  dows?: Dow[];
};

/** Wall clock parts for `ms` in IANA `timeZone` (for cadence + smart scheduling). */
export function getZonedWallClock(ms: number, timeZone: string) {
  const d = new Date(ms);
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const parts = Object.fromEntries(
    f.formatToParts(d).map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  const map: Record<string, Dow> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    y: Number(parts.year),
    mo: Number(parts.month),
    d: Number(parts.day),
    dow: map[parts.weekday] ?? 0,
    h: Number(parts.hour),
    m: Number(parts.minute),
  };
}

/**
 * UTC instant whose wall clock in `timeZone` is y-mo-d h:mi.
 * Binary search — stable for zones without DST quirks; IST-safe.
 */
export function utcFromLocalWall(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  timeZone: string,
): Date {
  const target =
    y * 1e10 + mo * 1e8 + d * 1e6 + h * 1e3 + mi;
  let lo = Date.UTC(y, mo - 1, d, h, mi) - 40 * 3_600_000;
  let hi = Date.UTC(y, mo - 1, d, h, mi) + 40 * 3_600_000;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const w = getZonedWallClock(mid, timeZone);
    const key = w.y * 1e10 + w.mo * 1e8 + w.d * 1e6 + w.h * 1e3 + w.m;
    if (key < target) lo = mid;
    else hi = mid;
  }
  return new Date(Math.round(hi));
}

function addCalendarDay(y: number, mo: number, d: number): [number, number, number] {
  const u = new Date(Date.UTC(y, mo - 1, d + 1));
  return [u.getUTCFullYear(), u.getUTCMonth() + 1, u.getUTCDate()];
}

function zonedWeekdaySun0(
  y: number,
  mo: number,
  d: number,
  timeZone: string,
): Dow {
  const noon = utcFromLocalWall(y, mo, d, 12, 0, timeZone);
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  });
  const w = f.format(noon);
  const map: Record<string, Dow> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[w] ?? 0;
}

function instagramSlots(): Slot[] {
  const wd: Dow[] = [1, 2, 3, 4, 5];
  return [
    { dows: wd, startMin: 7 * 60, endMin: 9 * 60 },
    { dows: wd, startMin: 12 * 60, endMin: 14 * 60 },
    { startMin: 18 * 60, endMin: 21 * 60 },
    { dows: [3], startMin: 11 * 60, endMin: 13 * 60 },
    { dows: [0], startMin: 10 * 60, endMin: 14 * 60 },
  ];
}

function facebookSlots(): Slot[] {
  const wd: Dow[] = [1, 2, 3, 4, 5];
  return [
    { dows: wd, startMin: 9 * 60, endMin: 11 * 60 },
    { dows: wd, startMin: 13 * 60, endMin: 15 * 60 },
    {
      dows: [1, 2, 3, 4, 5, 6],
      startMin: 18 * 60,
      endMin: 20 * 60,
    },
    { dows: [6], startMin: 12 * 60, endMin: 13 * 60 },
  ];
}

function slotsForChannel(channel: AutoPostChannel): Slot[] {
  if (channel === "facebook") return facebookSlots();
  if (channel === "instagram") return instagramSlots();
  const seen = new Set<string>();
  const out: Slot[] = [];
  for (const s of [...facebookSlots(), ...instagramSlots()]) {
    const key = `${s.dows?.join(",") ?? "all"}-${s.startMin}-${s.endMin}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function slotApplies(slot: Slot, dow: Dow): boolean {
  if (slot.dows && slot.dows.length > 0) {
    return slot.dows.includes(dow);
  }
  return true;
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Picks a random wall time inside engagement-oriented windows for the channel,
 * on or after `earliest`, interpreted in `timeZone` (IANA).
 */
export function pickNextSmartRunUtc(opts: {
  channel: AutoPostChannel;
  earliest: Date;
  timeZone: string;
}): Date {
  const slots = slotsForChannel(opts.channel);
  const earliestMs = opts.earliest.getTime();
  const startWall = getZonedWallClock(earliestMs, opts.timeZone);
  let cy = startWall.y;
  let cmo = startWall.mo;
  let cd = startWall.d;

  const minMs = earliestMs + 30_000;

  for (let dayOff = 0; dayOff <= 28; dayOff++) {
    if (dayOff > 0) {
      [cy, cmo, cd] = addCalendarDay(cy, cmo, cd);
    }
    const dow = zonedWeekdaySun0(cy, cmo, cd, opts.timeZone);
    const daySlots = slots.filter((s) => slotApplies(s, dow));
    const dayCandidates: Date[] = [];
    for (const slot of daySlots) {
      if (slot.endMin <= slot.startMin) continue;
      for (let minutePick = slot.startMin; minutePick < slot.endMin; minutePick++) {
        const h = Math.floor(minutePick / 60);
        const mi = minutePick % 60;
        const utc = utcFromLocalWall(cy, cmo, cd, h, mi, opts.timeZone);
        if (utc.getTime() >= minMs) {
          dayCandidates.push(utc);
        }
      }
    }
    if (dayCandidates.length > 0) {
      return dayCandidates[randomInt(0, dayCandidates.length - 1)]!;
    }
  }

  return new Date(
    Math.max(earliestMs + 60 * 60 * 1000, Date.now() + 60_000),
  );
}
