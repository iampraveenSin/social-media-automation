import type { Metadata } from "next";
import Link from "next/link";
import { BusinessPageOverview } from "@/components/dashboard/business-page-overview";
import { PlaceholderPanel } from "@/components/dashboard/placeholder-panel";
import { DASHBOARD_NAV } from "@/lib/dashboard/nav-config";

export const metadata: Metadata = {
  title: "Business",
};

export const dynamic = "force-dynamic";

export default function DashboardBusinessPage() {
  const blurb = DASHBOARD_NAV.find((n) => n.href.includes("/business"));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Business management
        </h1>
        <p className="mt-2 text-slate-600">{blurb?.description}</p>
      </div>

      <BusinessPageOverview />

      <PlaceholderPanel title="Ads &amp; Business Manager">
        <p>
          Meta Ads, Business Manager assets, and multi-Page portfolios could be
          wired here later. Publishing and scheduling stay on{" "}
          <Link href="/dashboard/main" className="font-medium text-indigo-600 underline">
            Main
          </Link>
          .
        </p>
      </PlaceholderPanel>
    </div>
  );
}
