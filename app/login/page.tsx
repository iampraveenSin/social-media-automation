"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0d] text-white flex flex-col items-center justify-center px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(251,191,36,0.06),transparent)] pointer-events-none" />
      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 shadow-xl">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block text-xl font-semibold tracking-tight text-white/90 hover:text-white">
              Automate
            </Link>
            <h1 className="mt-4 text-2xl font-semibold">Log in</h1>
            <p className="mt-2 text-sm text-white/55">Use your email and password. Each account has its own Instagram, Drive, and posts.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/35 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/35 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-amber-500 py-3.5 font-medium text-black shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-white/50">
            Don’t have an account?{" "}
            <Link href="/signup" className="text-amber-400/90 hover:text-amber-300 hover:underline transition">
              Sign up
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-white/50">
            <Link href="/" className="text-amber-400/90 hover:text-amber-300 hover:underline transition">
              ← Back to home
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0d] text-white flex flex-col items-center justify-center px-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 shadow-xl w-full max-w-md">
          <p className="text-center text-white/60">Loading…</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
