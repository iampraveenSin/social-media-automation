import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Prnit collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-sm font-medium text-primary">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted">Last updated: April 4, 2026</p>
      <div className="mt-10 max-w-none space-y-6 text-base leading-relaxed text-muted">
        <p>
          This Privacy Policy describes how Prnit (&ldquo;we,&rdquo; &ldquo;us&rdquo;)
          handles information when you use our website and services. It is a
          placeholder suitable for development; replace with counsel-reviewed text
          before production.
        </p>
        <h2 className="text-xl font-semibold text-foreground">
          Information we collect
        </h2>
        <p>
          We may collect account and profile information you provide, usage data,
          and information from connected services (such as Meta and Google) when
          you authorize them, strictly as needed to provide posting and
          scheduling features.
        </p>
        <h2 className="text-xl font-semibold text-foreground">How we use data</h2>
        <p>
          We use data to operate the product, authenticate you, publish content
          you request, improve reliability, and comply with law. We do not sell
          your personal information.
        </p>
        <h2 className="text-xl font-semibold text-foreground">Retention</h2>
        <p>
          We retain information as long as your account is active or as needed
          for the purposes above. You may request deletion as described on our{" "}
          <Link href="/data-deletion" className="font-medium text-primary underline">
            Data deletion
          </Link>{" "}
          page.
        </p>
        <h2 className="text-xl font-semibold text-foreground">Contact</h2>
        <p>
          For privacy questions, contact us using the address or email you will
          publish for your production app.
        </p>
      </div>
    </article>
  );
}
