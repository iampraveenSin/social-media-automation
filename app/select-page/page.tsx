"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface PageOption {
  pageId: string;
  pageName: string;
  igBusinessId: string;
  igUsername: string;
  igProfilePicture?: string;
}

export default function SelectPagePage() {
  const router = useRouter();
  const [pages, setPages] = useState<PageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/instagram/pages", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load pages");
        return r.json();
      })
      .then((data) => {
        if (data.pages && data.pages.length > 0) {
          setPages(data.pages);
        } else {
          setError("No Facebook Pages with linked Instagram accounts found.");
        }
      })
      .catch(() => setError("Failed to load your Facebook Pages. Please try connecting again."))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (page: PageOption) => {
    setSelecting(page.pageId);
    try {
      const res = await fetch("/api/auth/instagram/select-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pageId: page.pageId }),
      });
      if (!res.ok) throw new Error("Failed to connect");
      router.push("/dashboard?connected=1");
    } catch {
      setError("Failed to connect this page. Please try again.");
      setSelecting(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffef9] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <h1 className="text-2xl font-bold text-stone-900 mb-2">Select a Facebook Page</h1>
        <p className="text-stone-600 mb-6">
          Choose which Facebook Page (and its linked Instagram account) you want to connect for publishing.
        </p>

        {loading && (
          <div className="flex items-center gap-3 text-stone-500">
            <span className="animate-spin text-lg">⏳</span> Loading your pages...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 mb-4">
            {error}
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-2 block text-sm font-medium text-red-600 underline"
            >
              Back to Dashboard
            </button>
          </div>
        )}

        <div className="space-y-3">
          {pages.map((page) => (
            <motion.button
              key={page.pageId}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleSelect(page)}
              disabled={selecting !== null}
              className="w-full flex items-center gap-4 rounded-2xl border border-amber-200 bg-white px-5 py-4 text-left transition hover:border-amber-400 hover:shadow-sm disabled:opacity-60"
            >
              {page.igProfilePicture ? (
                <img
                  src={page.igProfilePicture}
                  alt={page.igUsername}
                  className="h-12 w-12 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xl">📄</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900">{page.pageName}</p>
                <p className="text-sm text-stone-600">@{page.igUsername} on Instagram</p>
              </div>
              {selecting === page.pageId ? (
                <span className="text-sm text-amber-600 animate-pulse">Connecting...</span>
              ) : (
                <span className="text-amber-600 font-medium text-sm">Connect →</span>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
