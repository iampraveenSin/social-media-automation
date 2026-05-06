"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  saveAutoPostSettings,
  type SaveAutoPostPayload,
} from "@/app/actions/auto-post-settings";
import type { AutoPostChannel } from "@/lib/auto-post/channel";
import type { AutoPostNextRunTimeMode } from "@/lib/auto-post/next-run-time-mode";
import { pickNextSmartRunUtc } from "@/lib/auto-post/smart-run-time";

const MIN_LEAD_MS = 60_000;

export type AutoPostFormInitial = {
  enabled: boolean;
  cadence: string;
  channel: AutoPostChannel;
  useAiCaption: boolean;
  nextRunTimeMode: AutoPostNextRunTimeMode;
  scheduleTimezone: string | null;
  nextRunAtIso: string | null;
  driveFolderId: string;
  lastError: string | null;
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return dateToDatetimeLocalValue(d);
}

function dateToDatetimeLocalValue(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function AutoPostSettingsForm({
  initial,
  driveConnected,
}: {
  initial: AutoPostFormInitial;
  driveConnected: boolean;
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [cadence, setCadence] = useState(initial.cadence);
  const [channel, setChannel] = useState<AutoPostChannel>(initial.channel);
  const [timeMode, setTimeMode] = useState<AutoPostNextRunTimeMode>(
    initial.nextRunTimeMode,
  );
  const [useAiCaption, setUseAiCaption] = useState(initial.useAiCaption);
  const [nextRunLocal, setNextRunLocal] = useState(() =>
    toDatetimeLocalValue(initial.nextRunAtIso),
  );
  const [driveFolderId, setDriveFolderId] = useState(initial.driveFolderId);
  const [lastError, setLastError] = useState(initial.lastError);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const prevTimeMode = useRef(timeMode);
  const prevChannel = useRef(channel);

  const bumpSmartTime = useCallback(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const d = pickNextSmartRunUtc({
      channel,
      earliest: new Date(Date.now() + MIN_LEAD_MS),
      timeZone: tz,
    });
    setNextRunLocal(toDatetimeLocalValue(d.toISOString()));
  }, [channel]);

  useEffect(() => {
    if (!enabled || timeMode !== "smart") {
      prevTimeMode.current = timeMode;
      prevChannel.current = channel;
      return;
    }
    const switchedToSmart =
      prevTimeMode.current !== "smart" && timeMode === "smart";
    const channelChanged =
      prevChannel.current !== channel && timeMode === "smart";
    if (switchedToSmart || channelChanged) {
      bumpSmartTime();
    }
    prevTimeMode.current = timeMode;
    prevChannel.current = channel;
  }, [enabled, timeMode, channel, bumpSmartTime]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    let nextRunAtIso: string | null = null;
    if (enabled) {
      if (nextRunLocal) {
        const parsed = new Date(nextRunLocal);
        if (Number.isNaN(parsed.getTime())) {
          setError("Invalid date or time.");
          return;
        }
        nextRunAtIso = parsed.toISOString();
        if (Date.parse(nextRunAtIso) < Date.now() + MIN_LEAD_MS) {
          if (timeMode === "manual") {
            setError(
              "Pick a time at least 1 minute from now. Past dates and times aren’t allowed.",
            );
            return;
          }
          nextRunAtIso = null;
        }
      } else if (timeMode === "manual") {
        setError("Pick a date and time for the next automatic post.");
        return;
      }
    }

    const scheduleTimezone = enabled
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : null;

    const payload: SaveAutoPostPayload = {
      enabled,
      cadence,
      channel,
      useAiCaption,
      nextRunAtIso,
      driveFolderId,
      nextRunTimeMode: timeMode,
      scheduleTimezone,
    };

    startTransition(async () => {
      const res = await saveAutoPostSettings(payload);
      if (res.ok) {
        setMessage(
          enabled
            ? "Saved. Automatic posts will run on the schedule you set."
            : "Auto posting is off.",
        );
        setLastError(null);
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 className="text-lg font-semibold text-slate-900">
        Hands-off posting
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        When a run is due, Prnit picks a <strong>random image or video</strong> from
        the Google Drive account you connected on <strong>Main</strong> (whole Drive
        by default). Optionally narrow to one folder below—only use that if you want
        a subset, not a second connection.
      </p>

      {driveConnected ? (
        <p
          className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
          role="status"
        >
          Drive is connected. Auto-post will use it automatically—no folder ID
          required unless you want to limit picks to a single folder.
        </p>
      ) : (
        <p
          className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
        >
          Connect Google Drive on the Main tab first; auto-post reads media from that
          same account.
        </p>
      )}

      <label className="mt-6 flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm font-medium text-slate-900">
          Enable automatic posts
        </span>
      </label>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Post to
          </span>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as AutoPostChannel)}
            disabled={!enabled}
            className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
          >
            <option value="facebook">Facebook Page</option>
            <option value="instagram">Instagram</option>
            <option value="both">Instagram + Facebook</option>
          </select>
          <span className="mt-1 block text-xs text-slate-500">
            Instagram options need your Page linked to an Instagram account (Main
            tab).
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Cadence (from each successful run)
          </span>
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            disabled={!enabled}
            className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
          >
            <option value="daily">Daily</option>
            <option value="every_3_days">Every 3 days</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <span className="mt-1 block text-xs text-slate-500">
            Gaps use your device timezone: daily = next calendar day at the same clock
            time; every 3 days = +3 calendar days at the same time.
          </span>
        </label>

        <fieldset className="space-y-2" disabled={!enabled}>
          <legend className="mb-1 block text-xs font-medium text-slate-600">
            Next run time
          </legend>
          <p className="text-xs text-slate-500">
            Times use your device timezone. Recommended mode picks slots that match
            common Facebook / Instagram engagement windows (you can still edit the
            time below).
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="auto-time-mode"
                checked={timeMode === "manual"}
                onChange={() => setTimeMode("manual")}
                className="size-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-800">I’ll pick the time</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="auto-time-mode"
                checked={timeMode === "smart"}
                onChange={() => setTimeMode("smart")}
                className="size-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-800">
                Recommended windows (editable)
              </span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="datetime-local"
              value={nextRunLocal}
              min={dateToDatetimeLocalValue(new Date(Date.now() + MIN_LEAD_MS))}
              onChange={(e) => setNextRunLocal(e.target.value)}
              disabled={!enabled}
              className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
            />
            {enabled && timeMode === "smart" ? (
              <button
                type="button"
                onClick={() => bumpSmartTime()}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Pick another suggested time
              </button>
            ) : null}
          </div>
        </fieldset>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={useAiCaption}
            onChange={(e) => setUseAiCaption(e.target.checked)}
            disabled={!enabled}
            className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
          />
          <span className="text-sm text-slate-800">
            Use AI for captions when your workspace has it enabled (otherwise
            starter text).
          </span>
        </label>

        <details className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-slate-700">
            Optional: limit to one Drive folder
          </summary>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Folder ID (advanced)
            </span>
            <input
              type="text"
              value={driveFolderId}
              onChange={(e) => setDriveFolderId(e.target.value)}
              disabled={!enabled}
              placeholder="Empty = entire Drive (default)"
              className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 disabled:opacity-50"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Only if you want random picks from one folder. Paste the ID from the
              folder&apos;s Drive URL; leave blank for your whole library.
            </span>
          </label>
        </details>
      </div>

      {lastError ? (
        <p
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
        >
          Last run issue: {lastError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>

      {message ? (
        <p className="mt-3 text-sm font-medium text-emerald-800" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
