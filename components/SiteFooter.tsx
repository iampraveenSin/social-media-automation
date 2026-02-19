"use client";

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-white/[0.02]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-sm font-medium text-white/80 hover:text-white transition">
            Automate
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
            <a href="/#features" className="hover:text-white transition">Features</a>
            <Link href="/login" className="hover:text-white transition">Log in</Link>
            <Link href="/dashboard" className="hover:text-white transition">Dashboard</Link>
            <a href="/api/auth/instagram" className="hover:text-white transition">Connect Instagram</a>
          </nav>
        </div>
        <p className="mt-8 text-center text-xs text-white/40 sm:text-left">
          © {new Date().getFullYear()} Automate. AI-powered social media scheduling.
        </p>
      </div>
    </footer>
  );
}
