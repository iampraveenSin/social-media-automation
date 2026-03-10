import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
  title: "Data Deletion — Automate",
  description: "How to request deletion of your data from Automate — AI Social Media Automation. Account and data deletion process.",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0d] text-white">
      <SiteHeader />
      <main className="relative mx-auto max-w-3xl px-6 py-16">
        <div className="prose prose-invert prose-amber max-w-none">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Data Deletion
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">Your right to delete your data</h2>
            <p className="text-white/80 leading-relaxed">
              You can request deletion of your account and associated data from Automate at any time. This page explains what we delete, how to request it, and what to expect. We process deletion requests in line with applicable privacy laws (e.g. GDPR, CCPA).
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">What we delete</h2>
            <p className="text-white/80 leading-relaxed">
              When we process a full account deletion request, we remove or anonymize:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-white/80">
              <li><strong>Account:</strong> Your email, hashed password, and account profile.</li>
              <li><strong>Connected accounts:</strong> Stored OAuth tokens and identifiers for Instagram/Facebook and Google Drive. Disconnecting in the dashboard revokes access; deletion removes our stored copies.</li>
              <li><strong>Content:</strong> Captions, hashtags, scheduled post settings, media references (e.g. image URLs), logo settings, and any other content you created in the app.</li>
              <li><strong>Posts and scheduling data:</strong> Records of scheduled and published posts (IDs, status, timestamps) that we store.</li>
              <li><strong>Uploaded media metadata:</strong> References to files you uploaded through the app (actual file storage may be on our servers or third-party storage; we remove or anonymize our records).</li>
            </ul>
            <p className="text-white/80 leading-relaxed mt-4">
              We do not control data that was already sent to third parties (e.g. posts published to Instagram, or files in your Google Drive). Deleting your account does not delete content on Instagram, Facebook, or Google; you must manage that separately with those services.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">How to request deletion</h2>
            <p className="text-white/80 leading-relaxed">
              To request deletion of your account and data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-white/80">
              <li><strong>Contact us</strong> using the support or contact method provided in the app or on the main website (e.g. email or contact form).</li>
              <li>Include the <strong>email address</strong> associated with your Automate account so we can identify your data.</li>
              <li>Clearly state that you want to <strong>delete your account and all associated data</strong>.</li>
            </ul>
            <p className="text-white/80 leading-relaxed mt-4">
              If you are logged in, you may also use any in-app &quot;Delete account&quot; or &quot;Request data deletion&quot; option if we provide one; that will submit a deletion request to us.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">What to expect</h2>
            <ul className="list-disc pl-6 space-y-2 text-white/80">
              <li>We will confirm receipt of your request and, where required by law, verify your identity before processing.</li>
              <li>We aim to complete deletion within <strong>30 days</strong> of a verified request, unless a longer period is required or allowed by law.</li>
              <li>We may retain certain data where required by law (e.g. tax, legal hold) or for legitimate business purposes (e.g. security logs in anonymized form). We will not use retained data for marketing or to re-identify you beyond what is necessary.</li>
              <li>After deletion, you will not be able to recover your account or the deleted data through Automate.</li>
            </ul>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">Before you delete</h2>
            <p className="text-white/80 leading-relaxed">
              We recommend disconnecting Instagram, Facebook, and Google Drive from the dashboard before requesting deletion. That revokes our access to those services. Export or save any data you want to keep (e.g. captions, post history), as we cannot restore it after deletion.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">Contact</h2>
            <p className="text-white/80 leading-relaxed">
              For deletion requests or questions about your data, use the support or contact method provided in the app or on the main website.
            </p>
          </section>

          <p className="mt-14 pt-8 border-t border-white/10 text-white/50 text-sm">
            For more on how we collect and use data, see our <Link href="/privacy-policy" className="text-amber-400/90 hover:text-amber-400 underline">Privacy Policy</Link>.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap gap-6">
          <Link
            href="/"
            className="inline-flex items-center text-amber-400 hover:text-amber-300 transition"
          >
            ← Back to home
          </Link>
          <Link
            href="/privacy-policy"
            className="inline-flex items-center text-white/70 hover:text-white transition"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-of-service"
            className="inline-flex items-center text-white/70 hover:text-white transition"
          >
            Terms of Service
          </Link>
        </div>
      </main>
    </div>
  );
}
