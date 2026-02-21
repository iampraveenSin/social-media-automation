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
        className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 transition hover:border-amber-300 hover:bg-amber-100"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">📁</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-stone-800">Connect Google Drive</p>
          <p className="text-sm text-stone-600">
            Link a folder of images. Pick from Drive instead of uploading each time.
          </p>
        </div>
        <span className="text-amber-600">→</span>
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
      className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 space-y-4"
    >
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-lg text-amber-700">✓</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-amber-900">Google Drive connected</p>
          <p className="text-sm text-stone-700">Pick images from your Drive folder to create posts.</p>
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
      </div>
      {onFolderSave && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-amber-200">
          <input
            type="text"
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            placeholder="Paste folder link or folder ID (optional)"
            className="min-w-0 flex-1 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
          />
          <button
            type="button"
            onClick={handleSaveFolder}
            disabled={savingFolder || !folderInput.trim()}
            className="shrink-0 rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-medium text-amber-900 transition hover:bg-amber-200 disabled:opacity-50"
          >
            {savingFolder ? "Saving…" : "Save folder"}
          </button>
        </div>
      )}
    </motion.div>
  );
}
