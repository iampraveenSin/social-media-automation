"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import type { ScheduledPost } from "@/lib/types";

interface PostCardProps {
  post: ScheduledPost;
  onPublishNow?: (postId: string) => void | Promise<void>;
}

const statusColors: Record<string, string> = {
  draft: "text-white/60",
  scheduled: "text-amber-400",
  publishing: "text-blue-400",
  published: "text-emerald-400",
  failed: "text-red-400",
};

export function PostCard({ post, onPublishNow }: PostCardProps) {
  const [publishing, setPublishing] = useState(false);
  const canPublishNow = (post.status === "scheduled" || post.status === "failed") && onPublishNow;

  const handlePublishNow = async () => {
    if (!onPublishNow) return;
    setPublishing(true);
    try {
      await onPublishNow(post.id);
    } finally {
      setPublishing(false);
    }
  };

  const meta = [post.topic, post.vibe, post.audience].filter(Boolean);
  const hashtagLine = Array.isArray(post.hashtags) ? post.hashtags.join(" ") : "";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/15"
    >
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl">
        <img src={post.mediaUrl} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-xs text-white/50">
          <span className="font-medium text-white/70">Schedule:</span> {format(new Date(post.scheduledAt), "PPp")} ·{" "}
          <span className={statusColors[post.status] ?? "text-white/50"}>{post.status}</span>
        </p>
        {meta.length > 0 && (
          <p className="text-xs text-white/50">
            <span className="font-medium text-white/70">Topic · Vibe · Audience:</span> {meta.join(" · ")}
          </p>
        )}
        <p className="text-sm text-white/90 line-clamp-4 break-words">{post.caption || "No caption"}</p>
        {hashtagLine && (
          <p className="text-xs text-white/40 line-clamp-2 break-words">{hashtagLine}</p>
        )}
        {post.logoConfig?.url && (
          <p className="text-xs text-white/40">Logo: {post.logoConfig.position}, {post.logoConfig.sizePercent}%</p>
        )}
        {post.error && (
          <p className="text-xs text-red-400">{post.error}</p>
        )}
        {canPublishNow && (
          <button
            type="button"
            onClick={handlePublishNow}
            disabled={publishing}
            className="mt-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {publishing ? "Publishing…" : "Publish now"}
          </button>
        )}
      </div>
    </motion.article>
  );
}
