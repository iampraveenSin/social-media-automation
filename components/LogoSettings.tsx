"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import type { LogoConfig } from "@/lib/types";

const POSITIONS: LogoConfig["position"][] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "center",
];

export function LogoSettings() {
  const { logoConfig, setLogoConfig } = useAppStore();
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [sizePercent, setSizePercent] = useState(logoConfig?.sizePercent ?? 15);
  const [position, setPosition] = useState<LogoConfig["position"]>(logoConfig?.position ?? "bottom-right");
  const [opacity, setOpacity] = useState(logoConfig?.opacity ?? 1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) return;
    const data = await res.json();
    const url = data.url as string;
    setLogoFile(url);
    setLogoConfig({ url, position, sizePercent, opacity });
  };

  const applyConfig = () => {
    if (!logoFile) return;
    setLogoConfig({
      url: logoFile,
      position,
      sizePercent,
      opacity,
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-white/80">Logo (optional)</p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/svg+xml"
        onChange={onFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/10 transition"
      >
        {logoFile ? "Change logo" : "Upload PNG logo"}
      </button>
      {logoFile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          <div className="flex gap-2">
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => { setPosition(pos); applyConfig(); }}
                className={`rounded-lg px-3 py-1.5 text-xs capitalize transition ${
                  position === pos ? "bg-amber-500/30 text-amber-200" : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                {pos.replace("-", " ")}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs text-white/60">Size %</label>
            <input
              type="range"
              min={5}
              max={30}
              value={sizePercent}
              onChange={(e) => { setSizePercent(Number(e.target.value)); applyConfig(); }}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs text-white/60">Opacity</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={opacity}
              onChange={(e) => { setOpacity(Number(e.target.value)); applyConfig(); }}
              className="w-full"
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
