import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getRecurrenceSettings, saveRecurrenceSettings } from "@/lib/store";
import { computeNextRunAtWithTimes } from "@/lib/recurrence";
import type { RecurrenceFrequency } from "@/lib/types";
import { DEFAULT_POST_TIMES } from "@/lib/types";

const VALID_FREQUENCIES: RecurrenceFrequency[] = ["daily", "every_3_days", "weekly", "monthly"];

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getRecurrenceSettings(session.userId);
  const payload = settings ?? { appUserId: session.userId, enabled: false, frequency: "daily" as RecurrenceFrequency, nextRunAt: null, postTimes: DEFAULT_POST_TIMES, nextTimeIndex: 0, niche: null, topic: null, vibe: null, audience: null };
  let nextRunAt = payload.nextRunAt ?? null;
  if (payload.enabled && nextRunAt) {
    const now = new Date();
    if (new Date(nextRunAt) <= now) {
      const result = computeNextRunAtWithTimes(
        payload.frequency ?? "daily",
        now,
        payload.postTimes ?? DEFAULT_POST_TIMES,
        payload.nextTimeIndex ?? 0
      );
      nextRunAt = result.nextRunAt;
    }
  }
  return NextResponse.json({
    ...payload,
    postTimes: payload.postTimes ?? DEFAULT_POST_TIMES,
    nextTimeIndex: payload.nextTimeIndex ?? 0,
    nextRunAt,
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { enabled?: boolean; frequency?: string; driveFolderId?: string | null; postTimes?: string[]; niche?: string | null; topic?: string | null; vibe?: string | null; audience?: string | null } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const appUserId = session.userId;
    const current = await getRecurrenceSettings(appUserId);
    const frequency = VALID_FREQUENCIES.includes((body.frequency as RecurrenceFrequency) ?? "")
      ? (body.frequency as RecurrenceFrequency)
      : (current?.frequency ?? "daily");
    const enabled = typeof body.enabled === "boolean" ? body.enabled : (current?.enabled ?? false);
    const driveFolderId = body.driveFolderId !== undefined ? body.driveFolderId : (current?.driveFolderId ?? null);
    const niche = body.niche !== undefined ? (body.niche === "" ? null : body.niche) : (current?.niche ?? null);
    const topic = body.topic !== undefined ? (body.topic === "" ? null : body.topic) : (current?.topic ?? null);
    const vibe = body.vibe !== undefined ? (body.vibe === "" ? null : body.vibe) : (current?.vibe ?? null);
    const audience = body.audience !== undefined ? (body.audience === "" ? null : body.audience) : (current?.audience ?? null);
    const postTimes = Array.isArray(body.postTimes) && body.postTimes.length > 0
      ? body.postTimes.slice(0, 3).map((t) => (typeof t === "string" && /^\d{1,2}:\d{2}$/.test(t) ? t : "09:00"))
      : (current?.postTimes ?? DEFAULT_POST_TIMES);
    let nextTimeIndex = current?.nextTimeIndex ?? 0;

    let nextRunAt: string | null = current?.nextRunAt ?? null;
    if (enabled) {
      const from = new Date();
      const mustRecalc = !nextRunAt || new Date(nextRunAt) <= from ||
        (body.frequency && VALID_FREQUENCIES.includes(body.frequency as RecurrenceFrequency)) ||
        (body.postTimes !== undefined);
      if (mustRecalc) {
        const result = computeNextRunAtWithTimes(frequency, from, postTimes, nextTimeIndex);
        nextRunAt = result.nextRunAt;
        nextTimeIndex = result.nextTimeIndex;
      }
    } else {
      nextRunAt = null;
    }

    const settings = {
      appUserId,
      enabled,
      frequency,
      nextRunAt,
      driveFolderId: driveFolderId ?? null,
      postTimes,
      nextTimeIndex,
      niche: niche ?? null,
      topic: topic ?? null,
      vibe: vibe ?? null,
      audience: audience ?? null,
    };
    await saveRecurrenceSettings(appUserId, settings);
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[recurrence] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save recurrence" },
      { status: 500 }
    );
  }
}
