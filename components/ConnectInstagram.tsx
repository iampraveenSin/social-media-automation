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
        className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-lg text-amber-700">✓</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-amber-900">Instagram connected</p>
          <p className="text-sm text-stone-700">@{username} — posts go to Instagram and your linked Facebook Page.</p>
        </div>
        {onDisconnect && (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="shrink-0 rounded-xl border border-amber-400 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
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
      className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 transition hover:border-amber-300 hover:bg-amber-100"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">📷</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-stone-800">Connect Instagram</p>
        <p className="text-sm text-stone-600">
          You’ll sign in with Facebook (Instagram is linked via Meta), then we connect your account.
        </p>
      </div>
      <span className="text-amber-600">→</span>
    </motion.a>
  );
}
