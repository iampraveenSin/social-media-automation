/** Right column visual for auth screens (static, no client JS). */
export function AuthHeroPanel() {
  return (
    <div className="relative flex min-h-[min(40vh,28rem)] flex-1 flex-col justify-end overflow-hidden bg-slate-950 lg:min-h-dvh">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 90% 70% at 20% 10%, rgb(99 102 241 / 0.45), transparent 55%),
            radial-gradient(ellipse 80% 60% at 90% 30%, rgb(167 139 250 / 0.35), transparent 50%),
            radial-gradient(ellipse 70% 50% at 40% 90%, rgb(45 212 191 / 0.2), transparent 45%)
          `,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(rgb(255 255 255) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />
      <div className="relative z-10 p-10 pb-14 lg:p-14 lg:pb-20">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
            From Drive to feed
          </p>
          <p className="mt-3 text-lg font-medium leading-snug text-white">
            Schedule Instagram &amp; Facebook posts with Drive media and
            AI-assisted captions — one workspace.
          </p>
          <div className="mt-5 flex gap-2">
            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15">
              Meta OAuth
            </span>
            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15">
              Google Drive
            </span>
          </div>
        </div>
        <p className="mt-8 max-w-sm text-sm leading-relaxed text-slate-400">
          Trusted-session ready: after you sign in, the dashboard opens and we
          keep your session fresh on each request.
        </p>
      </div>
    </div>
  );
}
