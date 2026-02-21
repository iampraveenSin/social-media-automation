"use client";

import Link from "next/link";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#070709]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-white hover:text-white/90 transition"
          >
            Automate
          </Link>
          <span className="text-white/40 font-normal text-sm">Dashboard</span>
        </div>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/";
          }}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
