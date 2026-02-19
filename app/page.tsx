"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(251,191,36,0.06),transparent)] pointer-events-none" />
      <SiteHeader />

      <main className="relative">
        {/* Hero */}
        <section className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="mx-auto max-w-3xl text-center">
            <motion.p
              className="text-sm font-medium uppercase tracking-widest text-amber-400/90"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              AI-Powered Social Media
            </motion.p>
            <motion.h1
              className="mt-4 bg-gradient-to-r from-amber-200 via-amber-100 to-orange-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
            >
              Schedule Instagram posts in one place
            </motion.h1>
            <motion.p
              className="mt-6 text-lg leading-relaxed text-white/65"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Connect your account, upload or pick images from Drive, generate captions and hashtags with AI, add your logo, and publish or schedule—all from a single dashboard.
            </motion.p>
            <motion.div
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-full bg-amber-500 px-8 py-4 text-base font-semibold text-black shadow-lg shadow-amber-500/25 transition hover:bg-amber-400 hover:shadow-amber-400/30"
              >
                Open Dashboard
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-base font-medium text-white/90 transition hover:border-white/30 hover:bg-white/10"
              >
                Log in
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="relative border-t border-white/10 bg-white/[0.02] py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Everything you need to post
              </h2>
              <p className="mt-3 text-white/60">
                One workflow from image to published post.
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Connect accounts",
                  description: "Link Instagram via Facebook (Business/Creator). Posts go to Instagram and your linked Facebook Page.",
                  icon: "✓",
                  color: "emerald",
                },
                {
                  title: "Images from Drive or upload",
                  description: "Pick from a Google Drive folder or upload directly. One click to load and use.",
                  icon: "✓",
                  color: "sky",
                },
                {
                  title: "AI captions & hashtags",
                  description: "Generate caption and 8–12 hashtags from your image. Set niche, topic, vibe, and audience for better results.",
                  icon: "✓",
                  color: "amber",
                },
                {
                  title: "Add your logo",
                  description: "Upload a PNG logo, choose position (corners or center) and size. Rendered on the image before posting.",
                  icon: "✓",
                  color: "amber",
                },
                {
                  title: "Schedule or publish now",
                  description: "Post immediately or schedule for later. Worker + Redis run scheduled posts at the set time.",
                  icon: "✓",
                  color: "amber",
                },
                {
                  title: "One dashboard",
                  description: "Create posts and see all scheduled and published posts in one place. Retry failed posts with one click.",
                  icon: "✓",
                  color: "amber",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="rounded-2xl border border-white/10 bg-[#0a0a0d] p-6 shadow-sm"
                >
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                      item.color === "emerald"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : item.color === "sky"
                        ? "bg-sky-500/20 text-sky-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative border-t border-white/10 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ready to automate your posts?
            </h2>
            <p className="mt-3 text-white/60">
              Log in and connect Instagram to get started.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="rounded-full bg-amber-500 px-8 py-3.5 font-semibold text-black transition hover:bg-amber-400"
              >
                Go to Dashboard
              </Link>
              <a
                href="/api/auth/instagram"
                className="rounded-full border border-white/20 bg-white/5 px-8 py-3.5 font-medium text-white/90 transition hover:bg-white/10"
                title="Connect Instagram (Facebook sign-in)"
              >
                Connect Instagram
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
