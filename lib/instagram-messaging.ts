const META_GRAPH_BASE = "https://graph.facebook.com/v25.0";

export interface InstagramConversation {
  id: string;
  updatedTime?: string;
  participants: Array<{
    id: string;
    username?: string;
    name?: string;
    profilePictureUrl?: string;
  }>;
}

export interface InstagramMessage {
  id: string;
  text?: string;
  createdTime?: string;
  from?: {
    id: string;
    username?: string;
  };
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

export async function listInstagramConversations(
  igBusinessAccountId: string,
  accessToken: string
): Promise<{ conversations: InstagramConversation[] } | { error: string }> {
  const url = `${META_GRAPH_BASE}/${encodeURIComponent(
    igBusinessAccountId
  )}/conversations?fields=id,updated_time,participants{id,username,name,profile_pic}&limit=25&access_token=${encodeURIComponent(
    accessToken
  )}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json()) as {
    data?: Array<{
      id?: string;
      updated_time?: string;
      participants?: {
        data?: Array<{ id?: string; username?: string; name?: string; profile_pic?: string }>;
      };
    }>;
    paging?: { next?: string };
    error?: { message?: string };
  };
  if (!res.ok || data.error) {
    return { error: parseGraphError(data, "Failed to fetch conversations") };
  }
  const conversations: InstagramConversation[] = (data.data ?? [])
    .filter((c) => typeof c.id === "string" && c.id.length > 0)
    .map((c) => ({
      id: c.id as string,
      updatedTime: c.updated_time,
      participants: (c.participants?.data ?? [])
        .filter((p) => typeof p.id === "string")
        .map((p) => ({
          id: p.id as string,
          username: p.username,
          name: p.name,
          profilePictureUrl: p.profile_pic,
        })),
    }));
  return { conversations };
}

export async function listInstagramMessages(
  conversationId: string,
  accessToken: string
): Promise<{ messages: InstagramMessage[] } | { error: string }> {
  const url = `${META_GRAPH_BASE}/${encodeURIComponent(
    conversationId
  )}/messages?fields=id,message,created_time,from{id,username}&limit=50&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json()) as {
    data?: Array<{
      id?: string;
      message?: string;
      created_time?: string;
      from?: { id?: string; username?: string };
    }>;
    error?: { message?: string };
  };
  if (!res.ok || data.error) {
    return { error: parseGraphError(data, "Failed to fetch conversation messages") };
  }
  const messages: InstagramMessage[] = (data.data ?? [])
    .filter((m) => typeof m.id === "string")
    .map((m) => ({
      id: m.id as string,
      text: m.message,
      createdTime: m.created_time,
      from: m.from?.id
        ? {
            id: m.from.id,
            username: m.from.username,
          }
        : undefined,
    }));
  return { messages };
}

export async function sendInstagramMessage(
  igBusinessAccountId: string,
  recipientId: string,
  text: string,
  accessToken: string
): Promise<{ id: string } | { error: string }> {
  const url = `${META_GRAPH_BASE}/${encodeURIComponent(igBusinessAccountId)}/messages`;
  const body = new URLSearchParams({
    recipient: JSON.stringify({ id: recipientId }),
    message: text,
    access_token: accessToken,
  });
  const res = await fetch(url, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const data = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || data.error || !data.id) {
    return { error: parseGraphError(data, "Failed to send message") };
  }
  return { id: data.id };
}

