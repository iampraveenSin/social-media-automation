"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface ConnectInstagramProps {
  connected: boolean;
  username?: string;
  onDisconnect?: () => void | Promise<void>;
}

export function ConnectInstagram({ connected, username, onDisconnect }: ConnectInstagramProps) {
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!onDisconnect) return;
    setDisconnecting(true);
    try {
      await onDisconnect();
    } finally {
      setDisconnecting(false);
    }
  };

  if (connected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-lg text-emerald-400">✓</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-emerald-200">Instagram connected</p>
          <p className="text-sm text-emerald-300/80">@{username} — posts go to Instagram and your linked Facebook Page.</p>
        </div>
        {onDisconnect && (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="shrink-0 rounded-xl border border-emerald-500/40 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.a
      href="/api/auth/instagram"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 transition hover:border-white/20 hover:bg-white/5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg">📷</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-white/90">Connect Instagram</p>
        <p className="text-sm text-white/60">
          You’ll sign in with Facebook (Instagram is linked via Meta), then we connect your account.
        </p>
      </div>
      <span className="text-white/40">→</span>
    </motion.a>
  );
}
