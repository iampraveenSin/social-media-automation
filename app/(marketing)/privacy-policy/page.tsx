import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Prnit handles information when you use the service.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-sm font-medium text-primary">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted">Last updated: June 6, 2026</p>
      <div className="mt-10 max-w-none space-y-6 text-base leading-relaxed text-muted">
        <p>
          This Privacy Policy explains how Prnit uses the information you provide
          while using the website and service.
        </p>
        <h2 className="text-xl font-semibold text-foreground">
          How information is used
        </h2>
        <p>
          Information is used to deliver the product, keep your account active,
          support your actions inside the app, and help maintain a reliable
          experience.
        </p>
        <h2 className="text-xl font-semibold text-foreground">
          Service operation
        </h2>
        <p>
          We use the information you provide to run the service, show the right
          features, and let you manage your workflows.
        </p>
        <h2 className="text-xl font-semibold text-foreground">Retention</h2>
        <p>
          We retain information only as long as needed to support your account
          and the service. If you close your account, we will remove associated
          records in accordance with our deletion process.
        </p>
        <h2 className="text-xl font-semibold text-foreground">Your choices</h2>
        <p>
          You can request account closure or data removal through the data
          deletion process described on our{" "}
          <Link href="/data-deletion" className="font-medium text-primary underline">
            Data Deletion
          </Link>{" "}
          page.
        </p>
      </div>
    </article>
  );
}
