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
  draft: "text-stone-600",
  scheduled: "text-amber-700",
  publishing: "text-amber-600",
  published: "text-amber-700",
  failed: "text-red-600",
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
  const isVideo = post.mediaType === "video";
  const mediaUrl =
    !post.mediaUrl
      ? ""
      : post.mediaUrl.startsWith("http")
        ? post.mediaUrl
        : typeof window !== "undefined"
          ? `${window.location.origin}${post.mediaUrl.startsWith("/") ? "" : "/"}${post.mediaUrl}`
          : post.mediaUrl;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 rounded-2xl border border-amber-200 bg-[#fffef9] p-4 transition hover:border-amber-300"
    >
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-100">
        {mediaUrl &&
          (isVideo ? (
            <video
              src={mediaUrl}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
          ))}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-xs text-stone-600">
          <span className="font-medium text-stone-800">Schedule:</span> {format(new Date(post.scheduledAt), "PPp")} ·{" "}
          <span className={statusColors[post.status] ?? "text-stone-600"}>{post.status}</span>
        </p>
        {meta.length > 0 && (
          <p className="text-xs text-stone-600">
            <span className="font-medium text-stone-800">Topic · Vibe · Audience:</span> {meta.join(" · ")}
          </p>
        )}
        <p className="text-sm text-stone-800 line-clamp-4 break-words">{post.caption || "No caption"}</p>
        {hashtagLine && (
          <p className="text-xs text-stone-500 line-clamp-2 break-words">{hashtagLine}</p>
        )}
        {post.logoConfig?.url && (
          <p className="text-xs text-stone-500">Logo: {post.logoConfig.position}, {post.logoConfig.sizePercent}%</p>
        )}
        {post.error && (
          <p className="text-xs text-red-700">{post.error}</p>
        )}
        {canPublishNow && (
          <button
            type="button"
            onClick={handlePublishNow}
            disabled={publishing}
            className="mt-2 rounded-xl border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-200 disabled:opacity-50"
          >
            {publishing ? "Publishing…" : "Publish now"}
          </button>
        )}
      </div>
    </motion.article>
  );
}
