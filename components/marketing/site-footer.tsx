import Link from "next/link";

const legal = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/data-deletion", label: "Data deletion" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-gradient-to-b from-card to-slate-50/80">
      <div className="marketing-dot-grid mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span
                className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-md shadow-indigo-600/25"
                aria-hidden
              >
                P
              </span>
              <span className="text-lg font-semibold tracking-tight text-foreground">
                Prnit
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Compose and schedule for Instagram &amp; Facebook. Pull media from
              Google Drive, add AI captions, and keep your publishing rhythm
              without the chaos.
            </p>
          </div>
          <nav
            className="flex flex-col gap-6 sm:flex-row sm:gap-12"
            aria-label="Footer"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Legal
              </p>
              <ul className="mt-3 space-y-2 text-sm font-medium">
                {legal.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-foreground/75 transition hover:text-indigo-600"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Account
              </p>
              <ul className="mt-3 space-y-2 text-sm font-medium">
                <li>
                  <Link
                    href="/login"
                    className="text-foreground/75 transition hover:text-indigo-600"
                  >
                    Log in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login?mode=signup"
                    className="text-foreground/75 transition hover:text-indigo-600"
                  >
                    Sign up
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-8 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Prnit. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Built for creators and teams who outgrow spreadsheets.
          </p>
        </div>
      </div>
    </footer>
  );
}
