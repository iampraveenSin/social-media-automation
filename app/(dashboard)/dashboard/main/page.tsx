import type { Metadata } from "next";
import Link from "next/link";
import { ComposerPreview } from "@/components/dashboard/composer-preview";
import { ComposerShell } from "@/components/dashboard/composer-shell";
import { DriveConnectSection } from "@/components/dashboard/drive-connect-section";
import { GoogleFlashBanner } from "@/components/dashboard/google-flash-banner";
import { MetaConnectSection } from "@/components/dashboard/meta-connect-section";
import { MetaFlashBanner } from "@/components/dashboard/meta-flash-banner";
import { PlaceholderPanel } from "@/components/dashboard/placeholder-panel";
import type { MetaAccountSummary } from "@/components/dashboard/composer-meta-publish";
import { DASHBOARD_NAV } from "@/lib/dashboard/nav-config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Main",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ facebook?: string; google?: string }>;
};

export default async function DashboardMainPage({ searchParams }: Props) {
  const { facebook, google } = await searchParams;
  const blurb = DASHBOARD_NAV.find((n) => n.href.endsWith("/main"));

  let metaAccount: MetaAccountSummary = {
    pageName: null,
    instagramUsername: null,
    instagramConnected: false,
  };
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: meta } = await supabase
        .from("meta_accounts")
        .select(
          "selected_page_name, instagram_username, instagram_account_id",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      const row = meta as {
        selected_page_name: string | null;
        instagram_username: string | null;
        instagram_account_id: string | null;
      } | null;
      if (row) {
        metaAccount = {
          pageName: row.selected_page_name ?? null,
          instagramUsername: row.instagram_username ?? null,
          instagramConnected: Boolean(row.instagram_account_id),
        };
      }
    }
  } catch {
    /* ignore — composer still works */
  }

  return (
    <ComposerShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Main workspace
          </h1>
          <p className="mt-2 text-slate-600">{blurb?.description}</p>
        </div>

        <MetaFlashBanner code={facebook} />
        <MetaConnectSection />

        <GoogleFlashBanner code={google} />
        <DriveConnectSection />

        <ComposerPreview metaAccount={metaAccount} />

        <PlaceholderPanel title="Posts & queue" showComingSoonNote={false}>
          <p>
            Use the composer above for Facebook and Instagram (still photos /
            carousel), scheduling, Drive media, and baked collage + logo. Your{" "}
            <Link href="/dashboard/post" className="font-medium text-indigo-600 underline">
              Posts
            </Link>{" "}
            tab shows the scheduled queue and publish history.
          </p>
        </PlaceholderPanel>
        <p className="text-sm text-slate-500">
          Marketing site:{" "}
          <Link href="/" className="font-medium text-indigo-600 underline">
            Home
          </Link>
        </p>
      </div>
    </ComposerShell>
  );
}
