"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import {
  saveAutoPostSettings,
  type SaveAutoPostPayload,
} from "@/app/actions/auto-post-settings";

export type AutoPostFormInitial = {
  enabled: boolean;
  cadence: string;
  useAiCaption: boolean;
  nextRunAtIso: string | null;
  driveFolderId: string;
  lastError: string | null;
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function AutoPostSettingsForm({
  initial,
}: {
  initial: AutoPostFormInitial;
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [cadence, setCadence] = useState(initial.cadence);
  const [useAiCaption, setUseAiCaption] = useState(initial.useAiCaption);
  const [nextRunLocal, setNextRunLocal] = useState(() =>
    toDatetimeLocalValue(initial.nextRunAtIso),
  );
  const [driveFolderId, setDriveFolderId] = useState(initial.driveFolderId);
  const [lastError, setLastError] = useState(initial.lastError);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    let nextRunAtIso: string | null = null;
    if (enabled) {
      if (!nextRunLocal) {
        setError("Pick a date and time for the next automatic post.");
        return;
      }
      const parsed = new Date(nextRunLocal);
      if (Number.isNaN(parsed.getTime())) {
        setError("Invalid date or time.");
        return;
      }
      nextRunAtIso = parsed.toISOString();
    }

    const payload: SaveAutoPostPayload = {
      enabled,
      cadence,
      useAiCaption,
      nextRunAtIso,
      driveFolderId,
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
        your Google Drive (or from one folder if you set a folder ID), adds a
        caption using AI when available or starter text otherwise, and publishes to
        your selected Facebook Page.
      </p>

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
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Next run (your device timezone)
          </span>
          <input
            type="datetime-local"
            value={nextRunLocal}
            onChange={(e) => setNextRunLocal(e.target.value)}
            disabled={!enabled}
            className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
          />
        </label>

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

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Drive folder ID (optional)
          </span>
          <input
            type="text"
            value={driveFolderId}
            onChange={(e) => setDriveFolderId(e.target.value)}
            disabled={!enabled}
            placeholder="Leave empty = random from whole Drive"
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 disabled:opacity-50"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Paste a folder ID from the Drive URL; only images and videos in that
            folder are considered.
          </span>
        </label>
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
