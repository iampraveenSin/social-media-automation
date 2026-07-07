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
      <p className="mt-2 text-sm text-muted">Last updated: July 7, 2026</p>
      <div className="mt-10 max-w-none space-y-6 text-base leading-relaxed text-muted">
        <p>
          This Privacy Policy explains how Prnit (&quot;we,&quot;
          &quot;our,&quot; &quot;the Service&quot;) collects, uses, and
          protects information when you use our website and application at
          social-media-automation-liart.vercel.app.
        </p>
        <p>
          Legal entity responsible for this service: Praveen Singh Shekhawat.
          Located in: India. Contact:{" "}
          <a
            href="mailto:hello@prnit.com"
            className="font-medium text-primary underline"
          >
            hello@prnit.com
          </a>
          .
        </p>
        <p>
          If you have any questions about this policy or how your data is
          handled, you can reach us at the email above.
        </p>

        <h2 className="text-xl font-semibold text-foreground">
          What Prnit Does
        </h2>
        <p>
          Prnit is a social media automation tool that lets businesses and
          creators connect their Facebook Page and linked Instagram
          Business/Creator account to compose, schedule, and publish organic
          content. Users can also connect Google Drive to pull media into their
          posts.
        </p>

        <h2 className="text-xl font-semibold text-foreground">
          Information We Collect
        </h2>
        <h3 className="text-lg font-semibold text-foreground">
          Information you provide directly
        </h3>
        <ul className="list-disc space-y-2 pl-5">
          <li>Email address and password for account creation and login.</li>
          <li>
            Content you create in the app, including captions, uploaded media,
            and scheduling preferences.
          </li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground">
          Information we receive from Meta when you connect your account
        </h3>
        <p>
          When you connect your Facebook and Instagram account via Facebook
          Login, we request the following permissions and receive the following
          data:
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-foreground">
                <th className="py-2 pr-4 font-semibold">Permission</th>
                <th className="py-2 pr-4 font-semibold">What we receive</th>
                <th className="py-2 font-semibold">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="py-3 pr-4 align-top font-medium text-foreground">
                  pages_show_list
                </td>
                <td className="py-3 pr-4 align-top">
                  List of Facebook Pages you manage.
                </td>
                <td className="py-3 align-top">
                  To let you select which Page to publish to.
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 align-top font-medium text-foreground">
                  instagram_business_basic
                </td>
                <td className="py-3 pr-4 align-top">
                  Instagram Business account username, profile picture,
                  follower/media counts, and recent media.
                </td>
                <td className="py-3 align-top">
                  To confirm the correct account is linked and show you a
                  preview inside the dashboard.
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 align-top font-medium text-foreground">
                  instagram_content_publish
                </td>
                <td className="py-3 pr-4 align-top">
                  No read data; this is write-only access.
                </td>
                <td className="py-3 align-top">
                  To publish photos, carousels, and Reels to your connected
                  Instagram account when you request it.
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 align-top font-medium text-foreground">
                  pages_read_engagement
                </td>
                <td className="py-3 pr-4 align-top">
                  Page name, profile picture, category, about info, and fan
                  count.
                </td>
                <td className="py-3 align-top">
                  To show a read-only summary of your connected Page.
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 align-top font-medium text-foreground">
                  business_management
                </td>
                <td className="py-3 pr-4 align-top">
                  Access to Pages and Instagram accounts managed through Meta
                  Business Manager.
                </td>
                <td className="py-3 align-top">
                  So users who manage Pages via Business Manager can still
                  connect and publish.
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 align-top font-medium text-foreground">
                  public_profile
                </td>
                <td className="py-3 pr-4 align-top">
                  Your basic Facebook profile info, such as name and profile
                  picture.
                </td>
                <td className="py-3 align-top">
                  Standard Facebook Login requirement.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-foreground">
          Information we receive from Google Drive if connected
        </h3>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            A list of files/folders you choose to browse, and the media files
            you select for publishing. We do not access files you have not
            explicitly browsed to or selected within the app.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground">
          How We Use Your Information
        </h2>
        <p>
          We use the information above solely to operate the Prnit service you
          requested:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Authenticate you and keep your account secure.</li>
          <li>
            Let you select and confirm the correct Facebook Page and Instagram
            account.
          </li>
          <li>
            Display a read-only summary of your connected accounts, such as
            profile picture, username, follower count, and recent posts, so you
            can verify the connection.
          </li>
          <li>
            Publish content to Facebook/Instagram at your direction, either
            immediately, on a schedule you set, or through auto-posting settings
            you configure.
          </li>
          <li>
            Generate AI-assisted captions using the media/content you provide
            via OpenAI or Gemini.
          </li>
        </ul>
        <p>
          We do not sell your data or any data received from Meta. We do not
          use Meta-provided data for advertising, ad targeting, or marketing
          analytics. We do not share your data with third parties except the
          service providers strictly necessary to run the app, and we do not
          access Instagram/Facebook accounts, Pages, or Drive files you have not
          explicitly connected or selected.
        </p>

        <h2 className="text-xl font-semibold text-foreground">
          Service Providers
        </h2>
        <p>
          We use the following infrastructure providers to operate the service.
          They process data only to provide their respective service to us and
          do not use it for their own purposes:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Supabase - database and authentication.</li>
          <li>Vercel - application hosting.</li>
          <li>
            OpenAI / Google Gemini - AI caption generation. Only the content
            you provide for caption generation is sent.
          </li>
          <li>
            Meta Graph API - to publish/read the connected Facebook/Instagram
            data described above.
          </li>
          <li>
            Google Drive API - to let you browse and select your own media.
          </li>
        </ul>
        <p>
          We do not have any other data processors handling Platform Data
          received from Meta.
        </p>

        <h2 className="text-xl font-semibold text-foreground">
          Data Retention
        </h2>
        <p>
          We retain your information for as long as your account is active and
          as needed to provide the service. If you delete your account, we
          remove associated records in accordance with our Data Deletion
          process.
        </p>

        <h2 className="text-xl font-semibold text-foreground">
          Your Choices and Rights
        </h2>
        <p>You can:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Disconnect your Facebook/Instagram/Google Drive account at any time
            from within the app.
          </li>
          <li>
            Request account closure and full data deletion via our{" "}
            <Link
              href="/data-deletion"
              className="font-medium text-primary underline"
            >
              Data Deletion
            </Link>{" "}
            page.
          </li>
          <li>
            Contact us at{" "}
            <a
              href="mailto:hello@prnit.com"
              className="font-medium text-primary underline"
            >
              hello@prnit.com
            </a>{" "}
            with any privacy questions or requests.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground">
          Data Security
        </h2>
        <p>
          We use industry-standard measures, including encrypted connections and
          access-controlled databases via Supabase Row Level Security, to
          protect your information. No system is 100% secure, but we take
          reasonable steps to safeguard your data.
        </p>

        <h2 className="text-xl font-semibold text-foreground">
          Children&apos;s Privacy
        </h2>
        <p>
          Prnit is not directed at children under 16, and we do not knowingly
          collect information from them.
        </p>

        <h2 className="text-xl font-semibold text-foreground">
          International Users
        </h2>
        <p>
          Our service is operated from India. If you access Prnit from outside
          India, your information will be processed in accordance with this
          policy.
        </p>

        <h2 className="text-xl font-semibold text-foreground">
          Changes to This Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. Material changes
          will be reflected by updating the &quot;Last updated&quot; date above.
        </p>

        <h2 className="text-xl font-semibold text-foreground">Contact Us</h2>
        <p>
          For any questions about this Privacy Policy or your data, email{" "}
          <a
            href="mailto:hello@prnit.com"
            className="font-medium text-primary underline"
          >
            hello@prnit.com
          </a>
          . Responsible entity: Praveen Singh Shekhawat, India.
        </p>
        <p>
          You can also review our{" "}
          <Link
            href="/data-deletion"
            className="font-medium text-primary underline"
          >
            Data Deletion
          </Link>{" "}
          page for account and data removal instructions.
        </p>
      </div>
    </article>
  );
}
