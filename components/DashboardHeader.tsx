"use client";

import Link from "next/link";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0d]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-white/90 hover:text-white transition"
          >
            Automate
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <span className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white">
              Dashboard
            </span>
          </nav>
        </div>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/";
          }}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
