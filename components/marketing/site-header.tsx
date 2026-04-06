import Link from "next/link";

const nav = [
  { href: "/#what", label: "What it is" },
  { href: "/#how", label: "How it works" },
  { href: "/#benefits", label: "Benefits" },
  { href: "/#security", label: "Security" },
  { href: "/#stories", label: "Feedback" },
] as const;

const legal = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/data-deletion", label: "Data deletion" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-card/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span
            className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20 transition group-hover:shadow-lg group-hover:shadow-indigo-600/35"
            aria-hidden
          >
            P
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Prnit
          </span>
        </Link>
        <nav
          className="hidden items-center gap-0.5 text-sm font-medium md:flex"
          aria-label="Primary"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-foreground/70 transition hover:bg-indigo-50 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <span className="mx-2 h-4 w-px bg-border" aria-hidden />
          {legal.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-foreground/60 transition hover:bg-slate-100 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <details className="group relative md:hidden">
          <summary className="flex cursor-pointer list-none items-center rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm marker:hidden [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-border bg-card py-2 shadow-[var(--shadow-elevated)]">
            {[...nav, ...legal].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-2.5 text-sm text-foreground/90 hover:bg-indigo-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </details>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/login"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-slate-100 hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/login?mode=signup"
            className="rounded-xl bg-gradient-to-b from-indigo-600 to-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/35 ring-1 ring-indigo-500/30 transition hover:from-indigo-500 hover:to-indigo-600"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
