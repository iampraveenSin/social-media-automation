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
      <p className="mt-2 text-sm text-muted">Last updated: July 7, 2026</p>
      <div className="mt-10 max-w-none space-y-6 text-base leading-relaxed text-muted">
        <h2 className="text-xl font-semibold text-foreground">About Prnit</h2>
        <p>
          Prnit is a social media automation service that lets businesses and
          creators connect their Facebook Page and linked Instagram
          Business/Creator account to compose, schedule, and publish organic
          content, with optional Google Drive integration and AI-assisted
          captions.
        </p>
        <p>
          Legal entity operating this service: Praveen Singh Shekhawat. Located
          in: India. Contact:{" "}
          <a
            href="mailto:hello@prnit.com"
            className="font-medium text-primary underline"
          >
            hello@prnit.com
          </a>
          .
        </p>

        <h2 className="text-xl font-semibold text-foreground">
          Acceptance of Terms
        </h2>
        <p>
          By creating an account or using Prnit, you agree to these Terms of
          Service and our{" "}
          <Link
            href="/privacy-policy"
            className="font-medium text-primary underline"
          >
            Privacy Policy
          </Link>
          . If you do not agree, please do not use the service.
        </p>

        <h2 className="text-xl font-semibold text-foreground">
          Who Can Use Prnit
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>You must be at least 16 years old to use Prnit.</li>
          <li>
            You must have the legal right to manage the Facebook Page and
            Instagram Business/Creator account you connect, such as the account
            owner, an authorized team member, or through Meta Business Manager
            access granted to you.
          </li>
          <li>
            You are responsible for ensuring your use of connected social
            accounts complies with Meta&apos;s own Platform Terms and Community
            Standards.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground">Your Account</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            You are responsible for keeping your login credentials secure and
            for all activity under your account.
          </li>
          <li>You must provide accurate information when creating an account.</li>
          <li>
            We may suspend or terminate accounts that violate these Terms,
            misuse connected platform data, or attempt to abuse the service,
            such as spam posting or unauthorized account access.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground">
          Connecting Third-Party Accounts
        </h2>
        <p>When you connect Facebook, Instagram, or Google Drive to Prnit:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            You authorize Prnit to access only the specific data and actions
            described in our Privacy Policy.
          </li>
          <li>
            You can disconnect any connected account at any time from within the
            app.
          </li>
          <li>
            You remain responsible for the content you choose to publish through
            Prnit. Prnit does not review or approve content before it is
            published on your behalf.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground">
          Content You Publish
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            You retain ownership of any content, including images, captions, and
            media, that you upload or publish through Prnit.
          </li>
          <li>
            You are solely responsible for ensuring your published content
            complies with Facebook and Instagram&apos;s Community Standards,
            applicable law, and any third-party rights, such as copyright.
          </li>
          <li>
            Prnit is not liable for content you choose to schedule, auto-post,
            or publish.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground">
          Automated / Scheduled Posting
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Features like scheduled posts and auto-posting publish content on
            your behalf at times you configure, without further manual
            confirmation at the time of publishing.
          </li>
          <li>
            You are responsible for reviewing and approving any media/captions
            before scheduling or enabling auto-post, since publishing happens
            automatically once configured.
          </li>
          <li>
            We use reasonable efforts to ensure scheduled/auto-posts are
            delivered reliably, but do not guarantee delivery in the event of
            Meta API outages, token expiration, or similar circumstances outside
            our control.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground">
          Service Availability
        </h2>
        <p>
          Prnit is provided &quot;as is.&quot; We aim for reliable uptime but do
          not guarantee uninterrupted or error-free service. We may update,
          modify, or discontinue features with reasonable notice where
          practical.
        </p>

        <h2 className="text-xl font-semibold text-foreground">Termination</h2>
        <p>
          You may stop using Prnit and delete your account at any time via our{" "}
          <Link
            href="/data-deletion"
            className="font-medium text-primary underline"
          >
            Data Deletion
          </Link>{" "}
          process. We may suspend or terminate your access if you violate these
          Terms or misuse the service.
        </p>

        <h2 className="text-xl font-semibold text-foreground">
          Limitation of Liability
        </h2>
        <p>
          To the maximum extent permitted by law, Prnit and its operator are not
          liable for indirect, incidental, or consequential damages arising from
          your use of the service, including issues caused by third-party
          platforms such as Meta or Google that are outside our control.
        </p>

        <h2 className="text-xl font-semibold text-foreground">
          Changes to These Terms
        </h2>
        <p>
          We may update these Terms from time to time. Material changes will be
          reflected by updating the &quot;Last updated&quot; date above.
          Continued use of Prnit after changes constitutes acceptance of the
          updated Terms.
        </p>

        <h2 className="text-xl font-semibold text-foreground">Contact Us</h2>
        <p>
          For any questions about these Terms of Service, email{" "}
          <a
            href="mailto:hello@prnit.com"
            className="font-medium text-primary underline"
          >
            hello@prnit.com
          </a>
          . Responsible entity: Praveen Singh Shekhawat, India.
        </p>
      </div>
    </article>
  );
}
