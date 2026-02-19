"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";

export function CaptionEditor() {
  const {
    niche,
    topic,
    vibe,
    audience,
    setTopic,
    setVibe,
    setAudience,
    caption,
    hashtags,
    setCaptionAndHashtags,
    media,
    selectedMediaId,
  } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [fromImage, setFromImage] = useState<{ topic: string; vibe: string; audience: string; mood: string } | null>(null);

  const generate = async () => {
    setGenerateError(null);
    setFromImage(null);

    const selectedMedia = media.find((m) => m.id === selectedMediaId);
    if (!selectedMediaId || !selectedMedia) {
      setGenerateError("Please upload and select an image first. Caption is generated from the image.");
      return;
    }

    setLoading(true);
    try {
      const imageUrl = selectedMedia.url.startsWith("http")
        ? selectedMedia.url
        : `${typeof window !== "undefined" ? window.location.origin : ""}${selectedMedia.url}`;

      let imageDataUrl: string | undefined;
      try {
        const imgRes = await fetch(imageUrl);
        const blob = await imgRes.blob();
        imageDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) ?? "");
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        imageDataUrl = undefined;
      }

      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          topic: topic || undefined,
          vibe: vibe || undefined,
          audience: audience || undefined,
          imageUrl: imageDataUrl ? undefined : imageUrl,
          imageDataUrl,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error ?? "Failed to generate. Add OPENAI_API_KEY or GEMINI_API_KEY in .env.local for AI captions.";
        setGenerateError(msg);
        if (data.fallback?.caption) {
          const fallbackTags = Array.isArray(data.fallback.hashtags) ? data.fallback.hashtags : [];
          setCaptionAndHashtags(data.fallback.caption, fallbackTags);
        }
        return;
      }

      const hashtagList = Array.isArray(data.hashtags) ? data.hashtags : (data.hashtags ? String(data.hashtags).split(/\s+|,/).filter(Boolean) : []);
      setCaptionAndHashtags(data.caption ?? "", hashtagList);

      if (data.fromImage) {
        setFromImage(data.fromImage);
        setTopic(data.fromImage.topic ?? "");
        setVibe(data.fromImage.vibe ?? "");
        setAudience(data.fromImage.audience ?? "");
      }
    } catch (e) {
      setGenerateError("Network error. Check console and OPENAI_API_KEY or GEMINI_API_KEY in .env.local.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white/80">Caption & hashtags</p>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/30 disabled:opacity-50"
        >
          {loading ? "Analyzing image & generating…" : "Generate from image"}
        </button>
      </div>
      {fromImage && (
        <p className="text-xs text-white/50">
          From image: {[fromImage.topic, fromImage.vibe, fromImage.audience].filter(Boolean).join(" · ")}
          {fromImage.mood ? ` · Mood: ${fromImage.mood}` : ""}
        </p>
      )}
      {generateError && (
        <p className="text-xs text-red-400">{generateError}</p>
      )}
      <textarea
        value={caption}
        onChange={(e) => setCaptionAndHashtags(e.target.value, hashtags)}
        placeholder="Caption is generated from your image (scene, mood, topic, vibe). Click “Generate from image”."
        rows={3}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition"
      />
      <input
        type="text"
        value={hashtags.join(" ")}
        onChange={(e) => setCaptionAndHashtags(caption, e.target.value.trim().split(/\s+/).filter(Boolean))}
        placeholder="Hashtags generated from image (8–12). Edit if needed."
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition"
      />
    </div>
  );
}
