import Link from "next/link";
import { HeroPreview } from "@/components/marketing/hero-preview";

function Section({
  id,
  eyebrow,
  title,
  children,
  className = "",
}: {
  id: string;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 py-16 sm:py-24 ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {eyebrow ? (
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
        <div className="mt-8 text-base leading-relaxed text-muted sm:text-[1.05rem] sm:leading-relaxed">
          {children}
        </div>
      </div>
    </section>
  );
}

function BenefitIcon({ type }: { type: "drive" | "clock" | "list" | "brand" }) {
  const common = "size-11 shrink-0 rounded-xl bg-gradient-to-br p-2.5 text-white shadow-md ring-1 ring-white/25";
  const gradients = {
    drive: "from-indigo-500 to-violet-600",
    clock: "from-teal-500 to-emerald-600",
    list: "from-amber-500 to-orange-600",
    brand: "from-rose-500 to-pink-600",
  } as const;
  return (
    <div className={`${common} ${gradients[type]}`} aria-hidden>
      {type === "drive" && (
        <svg viewBox="0 0 24 24" fill="none" className="size-full" stroke="currentColor" strokeWidth="2">
          <path d="M4 16l4.5-9h7L20 16H4z" strokeLinejoin="round" />
          <path d="M9 16l1.5-3h3L15 16" strokeLinecap="round" />
        </svg>
      )}
      {type === "clock" && (
        <svg viewBox="0 0 24 24" fill="none" className="size-full" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6l4 2" strokeLinecap="round" />
        </svg>
      )}
      {type === "list" && (
        <svg viewBox="0 0 24 24" fill="none" className="size-full" stroke="currentColor" strokeWidth="2">
          <path d="M8 6h13M8 12h13M8 18h13" strokeLinecap="round" />
          <path d="M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" />
        </svg>
      )}
      {type === "brand" && (
        <svg viewBox="0 0 24 24" fill="none" className="size-full" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 9h6v6H9z" />
        </svg>
      )}
    </div>
  );
}

const benefits: { icon: "drive" | "clock" | "list" | "brand"; text: string }[] =
  [
    {
      icon: "drive",
      text: "Fewer tab switches: compose where your media already lives in Drive.",
    },
    {
      icon: "clock",
      text: "Consistent cadence: schedule and auto-post with rotating time slots.",
    },
    {
      icon: "list",
      text: "Clear feedback: pending, published, and failed posts in one list.",
    },
    {
      icon: "brand",
      text: "Optional branding: logo overlay on image posts when you want it.",
    },
  ];

const steps = [
  {
    n: "01",
    title: "Connect Meta",
    body: "Sign in and link Facebook with the pages you choose — permissions stay explicit.",
  },
  {
    n: "02",
    title: "Link Drive",
    body: "Browse images, videos, and GIFs in folders; pick assets or use a smart random pick.",
  },
  {
    n: "03",
    title: "Publish smart",
    body: "AI captions from your brief, schedule or auto-post, then track every outcome.",
  },
] as const;

const testimonials = [
  {
    quote:
      "Scheduling from Drive cut our creative round-trip in half. The team finally posts on time.",
    name: "Priya S.",
    role: "Marketing lead, retail brand",
    initial: "P",
  },
  {
    quote:
      "One place for Facebook Page + Instagram. Onboarding was clear and permissions felt explicit.",
    name: "Jordan M.",
    role: "Founder, local services",
    initial: "J",
  },
  {
    quote:
      "Rotating time slots stopped us from always publishing at the same dead hour.",
    name: "Alex R.",
    role: "Content manager, agency",
    initial: "A",
  },
] as const;

function Stars() {
  return (
    <div className="flex gap-0.5 text-amber-400" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="size-4 fill-current">
          <path d="M10 1.5l2.6 5.3 5.8.8-4.2 4.1 1 5.7L10 15.9 4.8 17.4l1-5.7-4.2-4.1 5.8-.8L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border marketing-hero-mesh">
        <div
          className="pointer-events-none absolute inset-0 marketing-dot-grid opacity-40"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-center lg:gap-16 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/90 px-3 py-1 text-xs font-semibold text-indigo-900 shadow-sm">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-indigo-400 opacity-40" />
                <span className="relative inline-flex size-2 rounded-full bg-indigo-500" />
              </span>
              Social management
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
              Instagram &amp; Facebook,{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-teal-600 bg-clip-text text-transparent">
                one calm workflow
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
              Connect Meta, pull media from Google Drive, add AI captions, then
              post now or on a schedule — without duplicating every file in our
              servers.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/35 ring-1 ring-indigo-500/40 transition hover:from-indigo-500 hover:to-indigo-600"
            >
              Create account
            </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50"
              >
                Log in
              </Link>
            </div>
            <dl className="mt-12 grid grid-cols-3 gap-4 border-t border-border/60 pt-10 sm:max-w-md">
              {[
                ["Drive-native", "Media at source"],
                ["AI captions", "On-brand copy"],
                ["Auto-post", "Rotating times"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {k}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroPreview />
        </div>
      </section>

      <Section id="what" eyebrow="Overview" title="What Prnit is" className="bg-card">
        <p className="max-w-3xl">
          Prnit is a web app for teams and creators who publish to{" "}
          <strong className="font-semibold text-foreground">Facebook</strong> and{" "}
          <strong className="font-semibold text-foreground">Instagram</strong>.
          You connect accounts, choose media from Google Drive or upload, generate
          captions with AI, then post now, schedule, or run automated posting on
          your cadence.
        </p>
      </Section>

      <section
        id="how"
        className="scroll-mt-24 border-y border-border bg-gradient-to-b from-slate-50/90 to-background py-16 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Flow
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            How you use it
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className="group relative rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition hover:border-indigo-200 hover:shadow-lg"
              >
                <span className="text-4xl font-bold tabular-nums text-indigo-100 transition group-hover:text-indigo-200">
                  {s.n}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {s.body}
                </p>
                {i < steps.length - 1 ? (
                  <div
                    className="pointer-events-none absolute -right-3 top-1/2 hidden h-px w-6 -translate-y-1/2 bg-gradient-to-r from-border to-transparent md:block"
                    aria-hidden
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Section id="benefits" eyebrow="Why teams pick us" title="Benefits">
        <ul className="grid gap-5 sm:grid-cols-2">
          {benefits.map((item) => (
            <li
              key={item.text}
              className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-indigo-200/80 hover:shadow-[var(--shadow-soft)]"
            >
              <BenefitIcon type={item.icon} />
              <p className="pt-1 text-foreground/90">{item.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="security"
        eyebrow="Trust"
        title="Security & data"
        className="bg-card"
      >
        <div className="max-w-3xl rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-card p-6 shadow-inner sm:p-8">
          <p>
            We use industry-standard OAuth for Facebook and Google. Tokens are
            handled on the server; Drive-sourced posts can publish from live
            Drive URLs so we don&apos;t duplicate that media. Manual uploads may
            be stored for a stable publish URL — see our{" "}
            <Link
              href="/privacy"
              className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
            >
              Privacy Policy
            </Link>
            .
          </p>
          <p className="mt-4">
            Review{" "}
            <Link
              href="/terms"
              className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-2"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/data-deletion"
              className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-2"
            >
              Data deletion
            </Link>{" "}
            anytime.
          </p>
        </div>
      </Section>

      <section
        id="stories"
        className="scroll-mt-24 border-t border-border bg-gradient-to-b from-background to-slate-50/50 py-16 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Social proof
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            What people say
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <figure
                key={t.name}
                className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
              >
                <Stars />
                <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-foreground/90">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                  <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md">
                    {t.initial}
                  </span>
                  <div>
                    <span className="block text-sm font-semibold text-foreground">
                      {t.name}
                    </span>
                    <span className="text-xs text-muted">{t.role}</span>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div
          className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-violet-700 to-indigo-900"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-30 mix-blend-soft-light"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 0%, transparent 35%), radial-gradient(circle at 80% 80%, #a78bfa 0%, transparent 40%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Ready to streamline your social posts?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-indigo-100/95">
            Create an account for the dashboard, or log in if you&apos;re already
            with us.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/login?mode=signup"
              className="inline-flex rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-indigo-700 shadow-lg shadow-black/20 transition hover:bg-indigo-50"
            >
              Sign up
            </Link>
            <Link
              href="/login"
              className="inline-flex rounded-xl border border-white/35 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
