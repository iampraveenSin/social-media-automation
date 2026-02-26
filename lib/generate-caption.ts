/**
 * Shared caption generation for API and recurrence worker.
 * Same pipeline as manual/scheduled: analyze image (if image) then generate caption + hashtags.
 */

import type { ImageAnalysisForCaption } from "./openai";
import type { CaptionKeywords } from "./openai";
import {
  analyzeImageForCaption as openaiAnalyze,
  generateCaptionAndHashtags as openaiGenerate,
} from "./openai";
import {
  analyzeImageForCaption as geminiAnalyze,
  generateCaptionAndHashtags as geminiGenerate,
} from "./gemini";

export type GenerateCaptionForMediaResult = { caption: string; hashtags: string[] };

/**
 * Generate caption and hashtags for media (image or video).
 * - Image: analyzes image with Gemini or OpenAI, then generates caption from analysis + userOverrides.
 * - Video or no URL: generates caption from userOverrides only (no vision).
 * Returns null if no API key and no analysis; caller should use fallback.
 */
export async function generateCaptionForMedia(
  imageUrl: string | null,
  isImage: boolean,
  userOverrides: CaptionKeywords
): Promise<GenerateCaptionForMediaResult | null> {
  let imageAnalysis: ImageAnalysisForCaption | null = null;
  const hasAnyKey = !!(process.env.OPENAI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim());
  if (!hasAnyKey) return null;

  const imageInput =
    isImage && imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("data:"))
      ? imageUrl
      : null;

  if (imageInput && !imageInput.includes("localhost") && !imageInput.startsWith("http://127.0.0.1")) {
    const useGeminiFirst = !!process.env.GEMINI_API_KEY?.trim();
    if (useGeminiFirst) {
      try {
        imageAnalysis = await geminiAnalyze(imageInput);
      } catch (e) {
        console.warn("[generate-caption] Gemini image analysis failed:", e);
      }
    }
    if (!imageAnalysis && process.env.OPENAI_API_KEY?.trim()) {
      try {
        imageAnalysis = (await openaiAnalyze(imageInput)) ?? null;
      } catch (e) {
        console.warn("[generate-caption] OpenAI image analysis failed:", e);
      }
    }
    if (!imageAnalysis && !useGeminiFirst && process.env.GEMINI_API_KEY?.trim()) {
      try {
        imageAnalysis = await geminiAnalyze(imageInput);
      } catch (e) {
        console.warn("[generate-caption] Gemini image analysis (fallback) failed:", e);
      }
    }
  }

  const useGeminiFirst = !!process.env.GEMINI_API_KEY?.trim();
  let result: Awaited<ReturnType<typeof openaiGenerate>> | null = null;
  if (useGeminiFirst) {
    try {
      result = await geminiGenerate(imageAnalysis, userOverrides);
    } catch (e) {
      console.warn("[generate-caption] Gemini caption generation failed, trying OpenAI:", e);
    }
  }
  if (!result && process.env.OPENAI_API_KEY?.trim()) {
    try {
      result = await openaiGenerate(imageAnalysis, userOverrides);
    } catch (e) {
      console.warn("[generate-caption] OpenAI caption generation failed:", e);
    }
  }
  if (!result && !useGeminiFirst && process.env.GEMINI_API_KEY?.trim()) {
    try {
      result = await geminiGenerate(imageAnalysis, userOverrides);
    } catch (e) {
      console.warn("[generate-caption] Gemini caption generation (fallback) failed:", e);
    }
  }

  if (!result) return null;
  return { caption: result.caption, hashtags: result.hashtags ?? [] };
}
