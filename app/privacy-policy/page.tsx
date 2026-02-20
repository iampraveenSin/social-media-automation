import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
  title: "Privacy Policy — Automate",
  description: "Privacy policy for Automate — AI Social Media Automation. How we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0d] text-white">
      <SiteHeader />
      <main className="relative mx-auto max-w-3xl px-6 py-16">
        <div className="prose prose-invert prose-amber max-w-none">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">1. Introduction</h2>
            <p className="text-white/80 leading-relaxed">
              Automate (&quot;we,&quot; &quot;our,&quot; or &quot;the app&quot;) is an AI-powered social media automation platform. This Privacy Policy explains how we collect, use, store, and protect your information when you use our service, including our website and dashboard.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">2. Information We Collect</h2>
            <p className="text-white/80 leading-relaxed">
              We collect information you provide directly and data we receive from connected services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-white/80">
              <li><strong>Account data:</strong> Email address and a hashed password when you sign up or log in.</li>
              <li><strong>Instagram &amp; Facebook:</strong> When you connect your Instagram (via Meta), we store access tokens and related identifiers so we can publish posts and read basic profile information on your behalf. We do not store your Meta password.</li>
              <li><strong>Google Drive:</strong> If you connect Google Drive, we store OAuth tokens and folder/file identifiers to let you pick images for posts. We only access the files and folders you authorize.</li>
              <li><strong>Content you create:</strong> Captions, hashtags, scheduled post times, media references (e.g. image URLs), and optional logo settings. This is stored to run scheduling and publish to your connected accounts.</li>
              <li><strong>Usage:</strong> We may log errors and basic usage (e.g. failed/successful publish) to operate and improve the service.</li>
            </ul>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">3. How We Use Your Information</h2>
            <p className="text-white/80 leading-relaxed">
              We use the information above to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-white/80">
              <li>Provide login, dashboard, and scheduling features.</li>
              <li>Publish posts to Instagram (and optionally Facebook) at the times you choose.</li>
              <li>Access selected images from Google Drive when you use that feature.</li>
              <li>Generate captions and hashtags with AI when you request it (if that feature is enabled).</li>
              <li>Store your preferences and post history so you can manage and retry posts.</li>
              <li>Operate, secure, and debug the service.</li>
            </ul>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">4. Data Storage &amp; Third Parties</h2>
            <p className="text-white/80 leading-relaxed">
              Your data may be stored and processed by:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-white/80">
              <li><strong>Our infrastructure:</strong> We use Supabase (or local/file storage in some setups) for accounts, posts, and media metadata. When Supabase is used, their servers may store your data in accordance with their privacy policy.</li>
              <li><strong>Meta (Facebook/Instagram):</strong> Publishing and connecting accounts involves Meta&apos;s APIs and their processing of your content and tokens. Meta&apos;s policies apply to that processing.</li>
              <li><strong>Google:</strong> When you connect Drive, Google&apos;s OAuth and APIs are used; Google&apos;s privacy policy applies to that data.</li>
              <li><strong>AI providers:</strong> If you use caption/hashtag generation, the text and image references you submit may be sent to third-party AI services (e.g. OpenAI) as configured by the app.</li>
            </ul>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">5. Security</h2>
            <p className="text-white/80 leading-relaxed">
              We use industry-standard practices to protect your data: passwords are hashed, OAuth tokens are stored securely, and access to the app and database is restricted. No method of transmission or storage is 100% secure; we encourage strong passwords and prompt disconnection of accounts you no longer use.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">6. Your Rights</h2>
            <p className="text-white/80 leading-relaxed">
              You can access and update your profile and content from the dashboard. You may disconnect Instagram, Facebook, or Google Drive at any time, which revokes our access to those services. You can stop using the app and request deletion of your account and data by contacting us (see below). Applicable law may give you additional rights (e.g. access, correction, deletion, portability).
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">7. Changes</h2>
            <p className="text-white/80 leading-relaxed">
              We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the top will reflect the latest version. Continued use of the app after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-xl font-semibold text-amber-400/90">8. Contact</h2>
            <p className="text-white/80 leading-relaxed">
              For questions about this Privacy Policy or your data, contact us at the support or contact method provided in the app or on the main website.
            </p>
          </section>

          <p className="mt-14 pt-8 border-t border-white/10 text-white/50 text-sm">
            By using Automate, you agree to this Privacy Policy.
          </p>
        </div>

        <div className="mt-12">
          <Link
            href="/"
            className="inline-flex items-center text-amber-400 hover:text-amber-300 transition"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
