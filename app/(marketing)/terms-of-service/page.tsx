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
      <p className="mt-2 text-sm text-muted">Last updated: June 6, 2026</p>
      <div className="mt-10 max-w-none space-y-6 text-base leading-relaxed text-muted">
        <p>
          These Terms govern your use of Prnit. By using the service, you agree
          to follow these terms.
        </p>
        <h2 className="text-xl font-semibold text-foreground">The service</h2>
        <p>
          Prnit provides tools to help you manage social media publishing,
          scheduling, and content workflow.
        </p>
        <h2 className="text-xl font-semibold text-foreground">Your account</h2>
        <p>
          You are responsible for keeping your account credentials secure and
          for any activity initiated through your account.
        </p>
        <h2 className="text-xl font-semibold text-foreground">
          Usage requirements
        </h2>
        <p>
          Use the service responsibly and do not attempt to access another user's
          account or content without permission.
        </p>
        <h2 className="text-xl font-semibold text-foreground">
          Disclaimers & limitation
        </h2>
        <p>
          The service is provided “as is.” To the extent permitted by law, the
          provider disclaims warranties and limits liability for the use of the
          application.
        </p>
        <p>
          See also our{" "}
          <Link
            href="/privacy-policy"
            className="font-medium text-primary underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
