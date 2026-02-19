"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface ConnectDriveProps {
  connected: boolean;
  folderId?: string | null;
  onDisconnect?: () => void | Promise<void>;
  onFolderSave?: (folderIdOrLink: string) => void | Promise<void>;
}

export function ConnectDrive({ connected, folderId, onDisconnect, onFolderSave }: ConnectDriveProps) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [folderInput, setFolderInput] = useState(folderId ?? "");
  const [savingFolder, setSavingFolder] = useState(false);

  useEffect(() => {
    setFolderInput(folderId ?? "");
  }, [folderId]);

  const handleSaveFolder = async () => {
    if (!onFolderSave) return;
    setSavingFolder(true);
    try {
      await onFolderSave(folderInput);
    } finally {
      setSavingFolder(false);
    }
  };

  if (!connected) {
    return (
      <motion.a
        href="/api/drive/auth"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 transition hover:border-white/20 hover:bg-white/5"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg">📁</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white/90">Connect Google Drive</p>
          <p className="text-sm text-white/60">
            Link a folder of images. Pick from Drive instead of uploading each time.
          </p>
        </div>
        <span className="text-white/40">→</span>
      </motion.a>
    );
  }

  const handleDisconnect = async () => {
    if (!onDisconnect) return;
    setDisconnecting(true);
    try {
      await onDisconnect();
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-5 py-4 space-y-4"
    >
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-lg text-sky-400">✓</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sky-200">Google Drive connected</p>
          <p className="text-sm text-sky-300/80">Pick images from your Drive folder to create posts.</p>
        </div>
        {onDisconnect && (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="shrink-0 rounded-xl border border-sky-500/40 px-4 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-500/20 disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        )}
      </div>
      {onFolderSave && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-sky-500/20">
          <input
            type="text"
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            placeholder="Paste folder link or folder ID (optional)"
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition"
          />
          <button
            type="button"
            onClick={handleSaveFolder}
            disabled={savingFolder || !folderInput.trim()}
            className="shrink-0 rounded-xl bg-sky-500/20 px-4 py-2.5 text-sm font-medium text-sky-200 transition hover:bg-sky-500/30 disabled:opacity-50"
          >
            {savingFolder ? "Saving…" : "Save folder"}
          </button>
        </div>
      )}
    </motion.div>
  );
}
