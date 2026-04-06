"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { DASHBOARD_NAV } from "@/lib/dashboard/nav-config";
import { NavIcon, iconForNavHref } from "./nav-icons";

function DashboardSidebar({
  userEmail,
  onNavigate,
  id,
}: {
  userEmail: string | null;
  onNavigate?: () => void;
  id?: string;
}) {
  const pathname = usePathname();

  return (
    <aside
      id={id}
      className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white"
    >
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <Link
          href="/dashboard/main"
          className="text-base font-semibold tracking-tight text-slate-900"
          onClick={onNavigate}
        >
          Prnit
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Dashboard">
        {DASHBOARD_NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href.endsWith("/main") && pathname === "/dashboard");
          const icon = iconForNavHref(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className={active ? "text-indigo-600" : "text-slate-400"}>
                <NavIcon name={icon} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        {userEmail ? (
          <p
            className="mb-3 truncate px-1 text-xs text-slate-500"
            title={userEmail}
          >
            {userEmail}
          </p>
        ) : null}
        <div className="[&_button]:w-full">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

export function DashboardShell({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-slate-50">
      <div className="hidden h-full shrink-0 lg:flex">
        <DashboardSidebar userEmail={userEmail} />
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          aria-label="Close menu"
          onClick={close}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-200 ease-out`}
      >
        <DashboardSidebar
          id="dashboard-sidebar"
          userEmail={userEmail}
          onNavigate={close}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
            aria-expanded={mobileOpen}
            aria-controls="dashboard-sidebar"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-semibold text-slate-900">Dashboard</span>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
