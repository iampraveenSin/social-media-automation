"use client";

import { useEffect, useMemo, useState } from "react";

interface PublishedPostOption {
  id: string;
  instagramMediaId: string;
  mediaUrl?: string;
  caption?: string;
  publishedAt?: string | null;
}

interface CommentReply {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
  hidden?: boolean;
}

interface CommentItem {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
  hidden?: boolean;
  replies: CommentReply[];
}

interface CommentsPanelProps {
  connected: boolean;
}

export function CommentsPanel({ connected }: CommentsPanelProps) {
  const [posts, setPosts] = useState<PublishedPostOption[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyTextById, setReplyTextById] = useState<Record<string, string>>({});
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null);

  const selectedPost = useMemo(
    () => posts.find((p) => p.id === selectedPostId) ?? null,
    [posts, selectedPostId]
  );

  const loadPosts = async () => {
    setLoadingPosts(true);
    setError(null);
    try {
      const res = await fetch("/api/comments/posts", { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as { posts?: PublishedPostOption[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch published posts");
      const list = Array.isArray(data.posts) ? data.posts : [];
      setPosts(list);
      if (!selectedPostId && list.length > 0) setSelectedPostId(list[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch published posts");
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadComments = async (postId: string) => {
    setLoadingComments(true);
    setError(null);
    try {
      const res = await fetch(`/api/comments/posts/${encodeURIComponent(postId)}`, { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as { comments?: CommentItem[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch comments");
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch comments");
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (!connected) return;
    loadPosts();
  }, [connected]);

  useEffect(() => {
    if (!selectedPostId) return;
    loadComments(selectedPostId);
  }, [selectedPostId]);

  const handleReply = async (commentId: string) => {
    const text = (replyTextById[commentId] ?? "").trim();
    if (!text) return;
    setBusyCommentId(commentId);
    setError(null);
    try {
      const res = await fetch("/api/comments/reply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, text }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to reply");
      setReplyTextById((s) => ({ ...s, [commentId]: "" }));
      if (selectedPostId) await loadComments(selectedPostId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reply");
    } finally {
      setBusyCommentId(null);
    }
  };

  const handleToggleHidden = async (commentId: string, hidden: boolean) => {
    setBusyCommentId(commentId);
    setError(null);
    try {
      const res = await fetch("/api/comments/hide", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, hidden }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to update comment");
      if (selectedPostId) await loadComments(selectedPostId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update comment");
    } finally {
      setBusyCommentId(null);
    }
  };

  if (!connected) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-[#fffef9] p-6 shadow-xl">
        <p className="text-sm text-stone-700">Connect Instagram to manage comments.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-[#fffef9] p-6 shadow-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-xl text-stone-800">Instagram Comments</h3>
        <button
          type="button"
          onClick={() => {
            loadPosts();
            if (selectedPostId) loadComments(selectedPostId);
          }}
          disabled={loadingPosts || loadingComments}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          {loadingPosts || loadingComments ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-stone-700">Published post</label>
        <select
          value={selectedPostId}
          onChange={(e) => setSelectedPostId(e.target.value)}
          className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-500 focus:outline-none"
          disabled={loadingPosts || posts.length === 0}
        >
          {posts.length === 0 && <option value="">No published posts available</option>}
          {posts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.caption?.slice(0, 60) || "Published post"} {p.publishedAt ? `(${new Date(p.publishedAt).toLocaleString()})` : ""}
            </option>
          ))}
        </select>
      </div>

      {selectedPost?.instagramMediaId && (
        <div className="mb-3">
          <a
            href={`/api/posts/${selectedPost.id}/instagram-link`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-amber-700 hover:underline"
          >
            Open this post on Instagram
          </a>
        </div>
      )}

      <div className="space-y-3">
        {loadingComments ? (
          <p className="text-sm text-stone-600">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-stone-600">No comments yet on this post.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-xl border border-amber-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-stone-800">@{c.username || "user"}</p>
                  <p className="text-sm text-stone-700">{c.text || "(no text)"}</p>
                  <p className="mt-1 text-xs text-stone-500">{c.timestamp ? new Date(c.timestamp).toLocaleString() : ""}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleHidden(c.id, !c.hidden)}
                  disabled={busyCommentId === c.id}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  {busyCommentId === c.id ? "Saving..." : c.hidden ? "Unhide" : "Hide"}
                </button>
              </div>

              {c.replies.length > 0 && (
                <div className="mt-3 space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
                  {c.replies.map((r) => (
                    <div key={r.id}>
                      <p className="text-xs font-medium text-stone-700">@{r.username || "reply"}</p>
                      <p className="text-xs text-stone-600">{r.text || "(no text)"}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={replyTextById[c.id] ?? ""}
                  onChange={(e) => setReplyTextById((s) => ({ ...s, [c.id]: e.target.value }))}
                  placeholder="Write a reply..."
                  className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleReply(c.id)}
                  disabled={busyCommentId === c.id || !(replyTextById[c.id] ?? "").trim()}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {busyCommentId === c.id ? "Replying..." : "Reply"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

