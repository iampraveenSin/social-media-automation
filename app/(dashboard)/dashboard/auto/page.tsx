import type { Metadata } from "next";
import { AutoPostPanel } from "@/components/dashboard/auto-post-panel";
import { PlaceholderPanel } from "@/components/dashboard/placeholder-panel";
import { DASHBOARD_NAV } from "@/lib/dashboard/nav-config";

export const metadata: Metadata = {
  title: "Auto",
};

export const dynamic = "force-dynamic";

export default function DashboardAutoPage() {
  const blurb = DASHBOARD_NAV.find((n) => n.href.includes("/auto"));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Auto management
        </h1>
        <p className="mt-2 text-slate-600">{blurb?.description}</p>
      </div>

      <AutoPostPanel />

      <PlaceholderPanel title="More automation" showComingSoonNote={false}>
        <p>
          Future ideas: fixed posting windows and multi-file carousels from a folder.
          You can already choose Facebook, Instagram, or both for each automatic run.
        </p>
      </PlaceholderPanel>
    </div>
  );
}
