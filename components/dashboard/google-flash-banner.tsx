const FLASH: Record<
  string,
  { tone: "success" | "error" | "info"; message: string }
> = {
  connected: {
    tone: "success",
    message: "Google Drive connected. Browse folders and pick media below.",
  },
  denied: {
    tone: "error",
    message: "Google sign-in was cancelled.",
  },
  error: {
    tone: "error",
    message: "Could not connect Google Drive. Check client ID, secret, and redirect URI.",
  },
  no_refresh: {
    tone: "error",
    message:
      "Google did not return a refresh token. Open Google Account → Security → Third-party access, remove this app, then connect again (use “prompt: consent”).",
  },
  disconnected: {
    tone: "info",
    message: "Google Drive disconnected.",
  },
};

export function GoogleFlashBanner({ code }: { code?: string }) {
  if (!code) return null;
  const entry = FLASH[code];
  if (!entry) return null;

  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
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
