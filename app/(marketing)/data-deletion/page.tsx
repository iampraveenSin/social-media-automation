import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Data deletion",
  description: "How to request deletion of your Prnit account and data.",
};

export default function DataDeletionPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-sm font-medium text-primary">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Data deletion
      </h1>
      <p className="mt-2 text-sm text-muted">Last updated: June 6, 2026</p>
      <div className="mt-10 max-w-none space-y-6 text-base leading-relaxed text-muted">
        <p>
          If you want to remove your account and associated information, follow
          the request process below.
        </p>
        <h2 className="text-xl font-semibold text-foreground">
          How to request deletion
        </h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Log in to your account and use any available in-app deletion option.
          </li>
          <li>
            If an in-app option is not available, contact the published support
            address and request account deletion.
          </li>
        </ol>
        <h2 className="text-xl font-semibold text-foreground">What happens next</h2>
        <p>
          Upon a valid request, the account and related information will be
          removed in line with our standard process.
        </p>
        <p>
          Read our{" "}
          <Link
            href="/privacy-policy"
            className="font-medium text-primary underline"
          >
            Privacy Policy
          </Link>{" "}
          for additional information.
        </p>
      </div>
    </article>
  );
}
