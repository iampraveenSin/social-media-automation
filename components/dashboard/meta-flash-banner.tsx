const FLASH: Record<
  string,
  { tone: "success" | "error" | "info"; message: string }
> = {
  connected: {
    tone: "success",
    message:
      "Facebook account linked. Select the Page you want to use for posting.",
  },
  page_connected: {
    tone: "success",
    message: "Page connected successfully. You can post to this Page (and its linked Instagram account when available).",
  },
  denied: {
    tone: "error",
    message: "Facebook login was cancelled.",
  },
  error: {
    tone: "error",
    message: "Something went wrong connecting to Facebook. Try again or check app settings.",
  },
  page_error: {
    tone: "error",
    message: "Could not save the selected Page. Reconnect or pick another Page.",
  },
  disconnected: {
    tone: "info",
    message: "Meta account disconnected from Prnit.",
  },
};

export function MetaFlashBanner({ code }: { code?: string }) {
  if (!code) return null;
  const entry = FLASH[code];
  if (!entry) return null;

  const styles = {
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-950",
    error: "border-red-200 bg-red-50 text-red-950",
    info: "border-slate-200 bg-slate-50 text-slate-800",
  } as const;

  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3 text-sm font-medium ${styles[entry.tone]}`}
    >
      {entry.message}
    </div>
  );
}
