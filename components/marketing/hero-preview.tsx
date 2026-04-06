/** Decorative product preview — no client JS */
export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:mx-0">
      <div
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-teal-400/15 blur-2xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)] ring-1 ring-black/[0.04]">
        <div className="flex items-center gap-2 border-b border-border bg-slate-50/80 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400/90" />
            <span className="size-2.5 rounded-full bg-amber-400/90" />
            <span className="size-2.5 rounded-full bg-emerald-400/90" />
          </div>
          <div className="mx-auto flex-1 truncate rounded-md border border-border bg-white px-3 py-1 text-center text-xs text-muted">
            app.prnit.io / main
          </div>
        </div>
        <div className="grid gap-0 sm:grid-cols-[7.5rem_1fr]">
          <aside className="hidden border-r border-border bg-slate-50/50 p-3 sm:block">
            <div className="space-y-2">
              {["Main", "Posts", "Profile", "Auto"].map((label, i) => (
                <div
                  key={label}
                  className={`rounded-lg px-2 py-2 text-xs font-medium ${
                    i === 0
                      ? "bg-indigo-100 text-indigo-900"
                      : "text-muted"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
          </aside>
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
                Facebook connected
              </span>
              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-900 ring-1 ring-sky-200/80">
                Drive linked
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square rounded-lg bg-gradient-to-br from-indigo-200 to-violet-300 ring-1 ring-black/5" />
              <div className="aspect-square rounded-lg bg-gradient-to-br from-teal-200 to-cyan-300 ring-1 ring-black/5" />
              <div className="aspect-square rounded-lg bg-gradient-to-br from-amber-200 to-orange-300 ring-1 ring-black/5" />
            </div>
            <div className="rounded-xl border border-dashed border-indigo-300/60 bg-indigo-50/40 p-3">
              <p className="text-xs font-medium text-indigo-950">
                AI caption preview
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-indigo-900/70">
                Summer drop is live — double tap if you&apos;re ready. #launch
                #brand
              </p>
            </div>
            <div className="flex gap-2">
              <div className="h-9 flex-1 rounded-lg bg-slate-100 ring-1 ring-black/[0.04]" />
              <div className="h-9 w-24 rounded-lg bg-indigo-600 shadow-md shadow-indigo-600/25" />
            </div>
          </div>
        </div>
      </div>
      <div
        className="absolute -bottom-6 -left-6 hidden w-40 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-soft)] sm:block"
        aria-hidden
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
          Next post
        </p>
        <p className="mt-1 text-xs font-medium text-foreground">Today · 2:00 PM</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
        </div>
      </div>
    </div>
  );
}
