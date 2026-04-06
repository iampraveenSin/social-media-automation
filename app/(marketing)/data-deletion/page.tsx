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
      <p className="mt-2 text-sm text-muted">Last updated: April 4, 2026</p>
      <div className="mt-10 max-w-none space-y-6 text-base leading-relaxed text-muted">
        <p>
          You can request deletion of your Prnit account and associated personal
          data. This page is a placeholder for development; wire it to your
          support process or self-serve flow before production.
        </p>
        <h2 className="text-xl font-semibold text-foreground">
          How to request deletion
        </h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Log in to your account (once authentication is available) and use
            the in-app account deletion option, if provided; or
          </li>
          <li>
            Email your request from the address on your account to the contact
            you will publish for production support.
          </li>
        </ol>
        <h2 className="text-xl font-semibold text-foreground">What we delete</h2>
        <p>
          Upon a valid request, we will delete or anonymize personal data we hold
          for your account, subject to legal retention requirements. Third-party
          platforms (Meta, Google) have their own data controls.
        </p>
        <p>
          Read our{" "}
          <Link href="/privacy" className="font-medium text-primary underline">
            Privacy Policy
          </Link>{" "}
          for more context.
        </p>
      </div>
    </article>
  );
}
