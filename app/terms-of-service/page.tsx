import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
  title: "Terms of Service — Automate",
  description: "Terms of Service for Automate — AI Social Media Automation. Rules and conditions for using the service.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0d] text-white">
      <SiteHeader />
      <main className="relative mx-auto max-w-3xl px-6 py-16">
        <div className="prose prose-invert prose-amber max-w-none">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">1. Acceptance of Terms</h2>
            <p className="text-white/80 leading-relaxed">
              By accessing or using Automate (&quot;the Service,&quot; &quot;we,&quot; &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. We may update these terms from time to time; continued use after changes constitutes acceptance.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">2. Description of Service</h2>
            <p className="text-white/80 leading-relaxed">
              Automate is an AI-powered platform that helps you create, schedule, and publish content to Instagram (and optionally Facebook) and use Google Drive to select media. Features include caption and hashtag generation, logo overlay, scheduling, and post management. We do not guarantee uninterrupted availability or that the Service will meet every use case.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">3. Your Account and Responsibilities</h2>
            <p className="text-white/80 leading-relaxed">
              You are responsible for maintaining the security of your account and for all activity under it. You must provide accurate information and comply with applicable laws. You may not use the Service to post content that is illegal, infringing, misleading, harassing, or that violates Meta&apos;s or Google&apos;s policies. You are responsible for ensuring you have rights to any content you publish (including images and text).
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">4. Third-Party Services</h2>
            <p className="text-white/80 leading-relaxed">
              The Service integrates with Instagram/Facebook (Meta), Google Drive, and may use third-party AI providers. Your use of those services is subject to their respective terms and policies. We are not responsible for their availability, actions, or policies. Disconnecting an account in our dashboard revokes our access but does not alter your separate relationship with those providers.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">5. Intellectual Property</h2>
            <p className="text-white/80 leading-relaxed">
              We own or license the Automate software, branding, and materials. You retain ownership of your content. By using the Service, you grant us the limited rights necessary to operate it (e.g. storing and transmitting your content to Meta/Google and to our infrastructure). We do not claim ownership of your images, captions, or posts.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">6. Disclaimers</h2>
            <p className="text-white/80 leading-relaxed">
              The Service is provided &quot;as is&quot; and &quot;as available.&quot; We disclaim all warranties, express or implied, including merchantability and fitness for a particular purpose. We do not guarantee that posts will publish successfully at the exact time scheduled, that AI-generated captions will be accurate or appropriate, or that the Service will be error-free.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">7. Limitation of Liability</h2>
            <p className="text-white/80 leading-relaxed">
              To the maximum extent permitted by law, we and our affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of data, revenue, or profits, arising from your use of the Service. Our total liability for any claims related to the Service shall not exceed the amount you paid us in the twelve months before the claim (or one hundred dollars if you have not paid).
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">8. Termination</h2>
            <p className="text-white/80 leading-relaxed">
              You may stop using the Service at any time. We may suspend or terminate your access if you breach these terms or for operational or legal reasons. Upon termination, your right to use the Service ends. We may retain certain data as required by law or for legitimate business purposes; see our Privacy Policy and Data Deletion page for how to request deletion.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">9. Governing Law</h2>
            <p className="text-white/80 leading-relaxed">
              These terms are governed by the laws of the jurisdiction in which we operate, without regard to conflict-of-law principles. Any disputes shall be resolved in the courts of that jurisdiction, except where prohibited.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">10. Contact</h2>
            <p className="text-white/80 leading-relaxed">
              For questions about these Terms of Service, contact us at the support or contact method provided in the app or on the main website.
            </p>
          </section>

          <p className="mt-14 pt-8 border-t border-white/10 text-white/50 text-sm">
            By using Automate, you agree to these Terms of Service.
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
            href="/data-deletion"
            className="inline-flex items-center text-white/70 hover:text-white transition"
          >
            Data Deletion
          </Link>
        </div>
      </main>
    </div>
  );
}
