import type { Metadata } from "next";
import { ProfileAccountInsights } from "@/components/dashboard/profile-account-insights";
import { ProfileAccountOverview } from "@/components/dashboard/profile-account-overview";
import { DASHBOARD_NAV } from "@/lib/dashboard/nav-config";

export const metadata: Metadata = {
  title: "Profile",
};

export const dynamic = "force-dynamic";

export default function DashboardProfilePage() {
  const blurb = DASHBOARD_NAV.find((n) => n.href.includes("/profile"));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Profile
        </h1>
        <p className="mt-2 text-slate-600">{blurb?.description}</p>
      </div>

      <ProfileAccountOverview />

      <ProfileAccountInsights />
    </div>
  );
}
