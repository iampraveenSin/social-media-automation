"use client";

import { useEffect, useMemo, useState } from "react";

interface ConversationParticipant {
  id: string;
  username?: string;
  name?: string;
  profilePictureUrl?: string;
}

interface Conversation {
  id: string;
  updatedTime?: string;
  participants: ConversationParticipant[];
}

interface MessageItem {
  id: string;
  text?: string;
  createdTime?: string;
  from?: {
    id: string;
    username?: string;
  };
}

interface MessagingPanelProps {
  connected: boolean;
}

export function MessagingPanel({ connected }: MessagingPanelProps) {
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [myIgId, setMyIgId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const recipient = useMemo(() => {
    if (!selectedConversation || !myIgId) return null;
    return selectedConversation.participants.find((p) => p.id !== myIgId) ?? selectedConversation.participants[0] ?? null;
  }, [selectedConversation, myIgId]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    setError(null);
    try {
      const res = await fetch("/api/messages/conversations", { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as { conversations?: Conversation[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch conversations");
      const list = Array.isArray(data.conversations) ? data.conversations : [];
      setConversations(list);
      if (list.length > 0 && !selectedConversationId) {
        setSelectedConversationId(list[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch conversations");
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/conversations/${encodeURIComponent(conversationId)}`, {
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        messages?: MessageItem[];
        instagramBusinessAccountId?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch messages");
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setMyIgId(data.instagramBusinessAccountId ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch messages");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!connected) return;
    loadConversations();
  }, [connected]);

  useEffect(() => {
    if (!selectedConversationId) return;
    loadMessages(selectedConversationId);
  }, [selectedConversationId]);

  const sendReply = async () => {
    if (!recipient?.id || !replyText.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages/reply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: recipient.id, text: replyText.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send reply");
      setReplyText("");
      if (selectedConversationId) await loadMessages(selectedConversationId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  if (!connected) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-[#fffef9] p-6 shadow-xl">
        <p className="text-sm text-stone-700">Connect Instagram to access messages.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-[#fffef9] p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl text-stone-800">Instagram Messages</h3>
        <button
          type="button"
          onClick={loadConversations}
          disabled={loadingConversations}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          {loadingConversations ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
        <div className="max-h-[520px] space-y-2 overflow-auto rounded-xl border border-amber-200 bg-amber-50/50 p-2">
          {loadingConversations ? (
            <p className="p-2 text-sm text-stone-600">Loading conversations...</p>
          ) : conversations.length === 0 ? (
            <p className="p-2 text-sm text-stone-600">No conversations found.</p>
          ) : (
            conversations.map((c) => {
              const other = c.participants.find((p) => p.id !== myIgId) ?? c.participants[0];
              const title = other?.username || other?.name || `Conversation ${c.id.slice(0, 6)}`;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedConversationId(c.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left ${
                    selectedConversationId === c.id
                      ? "border-amber-400 bg-white"
                      : "border-transparent hover:border-amber-300 hover:bg-white/60"
                  }`}
                >
                  <p className="truncate text-sm font-medium text-stone-800">{title}</p>
                  <p className="truncate text-xs text-stone-500">{other?.id ?? ""}</p>
                </button>
              );
            })
          )}
        </div>

        <div className="flex min-h-[520px] flex-col rounded-xl border border-amber-200 bg-white">
          <div className="border-b border-amber-200 px-4 py-3">
            <p className="text-sm font-medium text-stone-800">
              {recipient?.username || recipient?.name || "Select a conversation"}
            </p>
          </div>
          <div className="flex-1 space-y-2 overflow-auto px-4 py-3">
            {loadingMessages ? (
              <p className="text-sm text-stone-600">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-stone-600">No messages in this conversation.</p>
            ) : (
              [...messages].reverse().map((m) => {
                const mine = !!myIgId && m.from?.id === myIgId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                        mine ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-800"
                      }`}
                    >
                      <p>{m.text || "(non-text message)"}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="border-t border-amber-200 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type a reply..."
                className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={sendReply}
                disabled={sending || !recipient?.id || !replyText.trim()}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {sending ? "Sending..." : "Reply"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

