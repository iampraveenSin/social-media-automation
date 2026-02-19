"use client";

import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0d]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-white hover:text-white transition"
        >
          Automate
        </Link>
        <nav className="flex items-center gap-8 text-sm">
          <a href="/#features" className="text-white/70 hover:text-white transition">
            Features
          </a>
          <Link href="/login" className="text-white/70 hover:text-white transition">
            Log in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full bg-amber-500 px-4 py-2 font-medium text-black transition hover:bg-amber-400"
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
