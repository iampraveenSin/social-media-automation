const META_GRAPH_BASE = "https://graph.facebook.com/v25.0";

export interface InstagramCommentReply {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
  hidden?: boolean;
}

export interface InstagramComment {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
  hidden?: boolean;
  replies: InstagramCommentReply[];
}

function parseGraphError(data: unknown, fallback: string): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error?: unknown }).error === "object" &&
    (data as { error?: unknown }).error !== null &&
    "message" in ((data as { error?: { message?: unknown } }).error ?? {})
  ) {
    const msg = ((data as { error?: { message?: unknown } }).error?.message ?? "") as unknown;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

export async function listInstagramComments(
  igMediaId: string,
  accessToken: string
): Promise<{ comments: InstagramComment[] } | { error: string }> {
  const url = `${META_GRAPH_BASE}/${encodeURIComponent(
    igMediaId
  )}/comments?fields=id,text,username,timestamp,hidden,replies{id,text,username,timestamp,hidden}&limit=50&access_token=${encodeURIComponent(
    accessToken
  )}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json()) as {
    data?: Array<{
      id?: string;
      text?: string;
      username?: string;
      timestamp?: string;
      hidden?: boolean;
      replies?: { data?: Array<{ id?: string; text?: string; username?: string; timestamp?: string; hidden?: boolean }> };
    }>;
    error?: { message?: string };
  };
  if (!res.ok || data.error) {
    return { error: parseGraphError(data, "Failed to fetch Instagram comments") };
  }
  const comments: InstagramComment[] = (data.data ?? [])
    .filter((c) => typeof c.id === "string")
    .map((c) => ({
      id: c.id as string,
      text: c.text,
      username: c.username,
      timestamp: c.timestamp,
      hidden: c.hidden,
      replies: (c.replies?.data ?? [])
        .filter((r) => typeof r.id === "string")
        .map((r) => ({
          id: r.id as string,
          text: r.text,
          username: r.username,
          timestamp: r.timestamp,
          hidden: r.hidden,
        })),
    }));
  return { comments };
}

export async function replyToInstagramComment(
  commentId: string,
  message: string,
  accessToken: string
): Promise<{ id: string } | { error: string }> {
  const url = `${META_GRAPH_BASE}/${encodeURIComponent(commentId)}/replies`;
  const body = new URLSearchParams({
    message,
    access_token: accessToken,
  });
  const res = await fetch(url, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const data = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || data.error || !data.id) {
    return { error: parseGraphError(data, "Failed to reply to comment") };
  }
  return { id: data.id };
}

export async function setInstagramCommentHidden(
  commentId: string,
  hidden: boolean,
  accessToken: string
): Promise<{ ok: true } | { error: string }> {
  const url = `${META_GRAPH_BASE}/${encodeURIComponent(commentId)}`;
  const body = new URLSearchParams({
    hide: hidden ? "true" : "false",
    access_token: accessToken,
  });
  const res = await fetch(url, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: { message?: string } };
  if (!res.ok || data.error) {
    return { error: parseGraphError(data, "Failed to update comment visibility") };
  }
  return { ok: true };
}

