"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { format, addHours } from "date-fns";

export function SchedulePicker() {
  const { scheduledAt, setScheduledAt } = useAppStore();
  const defaultAt = addHours(new Date(), 1);
  const [date, setDate] = useState(
    scheduledAt ? format(scheduledAt, "yyyy-MM-dd") : format(defaultAt, "yyyy-MM-dd")
  );
  const [time, setTime] = useState(
    scheduledAt ? format(scheduledAt, "HH:mm") : format(defaultAt, "HH:mm")
  );

  useEffect(() => {
    if (useAppStore.getState().scheduledAt == null) {
      setScheduledAt(addHours(new Date(), 1));
    }
  }, [setScheduledAt]);

  const apply = () => {
    const at = new Date(`${date}T${time}`);
    if (!Number.isNaN(at.getTime())) setScheduledAt(at);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-stone-800">Schedule</p>
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
        />
      </div>
      <button
        type="button"
        onClick={apply}
        className="rounded-xl bg-amber-100 px-4 py-2 text-sm text-amber-900 hover:bg-amber-200 transition"
      >
        Set time
      </button>
      {scheduledAt && (
        <p className="text-xs text-stone-600">
          Will post at {format(scheduledAt, "PPp")}
        </p>
      )}
    </div>
  );
}
