import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of Prnit.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-sm font-medium text-primary">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted">Last updated: April 4, 2026</p>
      <div className="mt-10 max-w-none space-y-6 text-base leading-relaxed text-muted">
        <p>
          These Terms of Service govern your use of Prnit. This is placeholder
          content for development — have it reviewed by legal counsel before
          launch.
        </p>
        <h2 className="text-xl font-semibold text-foreground">The service</h2>
        <p>
          Prnit provides tools to help you manage social media posting and related
          workflows. Features may change as we improve the product.
        </p>
        <h2 className="text-xl font-semibold text-foreground">Your account</h2>
        <p>
          You are responsible for your account credentials and for content you
          publish through the service. You must comply with Meta, Google, and
          other platforms&apos; terms when using integrations.
        </p>
        <h2 className="text-xl font-semibold text-foreground">
          Disclaimers &amp; limitation
        </h2>
        <p>
          The service is provided &ldquo;as is.&rdquo; To the maximum extent
          permitted by law, we disclaim warranties and limit liability as your
          counsel advises for your jurisdiction.
        </p>
        <p>
          See also our{" "}
          <Link href="/privacy" className="font-medium text-primary underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
