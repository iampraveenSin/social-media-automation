import { NextRequest, NextResponse } from "next/server";
import {
  generateCaptionAndHashtags as openaiGenerate,
  analyzeImageForCaption as openaiAnalyze,
  type ImageAnalysisForCaption,
} from "@/lib/openai";
import {
  generateCaptionAndHashtags as geminiGenerate,
  analyzeImageForCaption as geminiAnalyze,
} from "@/lib/gemini";

const FALLBACK = {
  caption: "Finding joy in the everyday. ✨\n\nWhat's one small thing that made you smile today?",
  hashtags: ["#lifestyle", "#dailyjoy", "#mindfulliving", "#simplelife", "#goodvibesonly", "#selfgrowth", "#contentcreator", "#reallife"],
};

const NICHE_DEFAULTS: Record<string, { topic: string; vibe: string; audience: string }> = {
  food: { topic: "food & dining", vibe: "inviting, delicious", audience: "food lovers" },
  fitness: { topic: "fitness & wellness", vibe: "energetic, motivated", audience: "fitness enthusiasts" },
  tech: { topic: "tech & digital", vibe: "modern, innovative", audience: "tech-savvy users" },
  photography: { topic: "photography & visuals", vibe: "creative, aesthetic", audience: "visual storytellers" },
  fashion: { topic: "fashion & style", vibe: "trendy, expressive", audience: "style enthusiasts" },
  education: { topic: "learning & growth", vibe: "inspiring, clear", audience: "learners" },
  motivation: { topic: "motivation & mindset", vibe: "uplifting, empowering", audience: "go-getters" },
  lifestyle: { topic: "daily life & moments", vibe: "warm, relatable", audience: "everyday people" },
};

function getFromImagePayload(
  imageAnalysis: ImageAnalysisForCaption | null,
  niche: string
): { topic: string; vibe: string; audience: string; mood: string } {
  const defaults = NICHE_DEFAULTS[niche] ?? NICHE_DEFAULTS.lifestyle;
  if (!imageAnalysis) {
    return { ...defaults, mood: "" };
  }
  return {
    topic: imageAnalysis.suggestedTopic?.trim() || defaults.topic,
    vibe: imageAnalysis.suggestedVibe?.trim() || defaults.vibe,
    audience: imageAnalysis.suggestedAudience?.trim() || defaults.audience,
    mood: imageAnalysis.mood?.trim() || "",
  };
}

/** Allow larger body for base64 image (e.g. 10MB). */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const niche = "lifestyle";

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body. If the image is very large, try a smaller image or upload again." },
      { status: 400 }
    );
  }

  const imageUrl = body.imageUrl as string | undefined;
  const imageDataUrl = body.imageDataUrl as string | undefined;
  const userOverrides = {
    topic: (body.topic as string)?.trim() || undefined,
    vibe: (body.vibe as string)?.trim() || undefined,
    audience: (body.audience as string)?.trim() || undefined,
    niche: (body.niche as string) || niche,
  };

  const hasImageInput =
    (typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:image")) ||
    (typeof imageUrl === "string" && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("data:")));

  const hasAnyKey = !!(process.env.OPENAI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim());
  if (hasImageInput && !hasAnyKey) {
    return NextResponse.json(
      {
        error: "Add OPENAI_API_KEY or GEMINI_API_KEY to .env.local and restart the dev server. Get Gemini key at https://aistudio.google.com/apikey",
        fallback: FALLBACK,
      },
      { status: 503 }
    );
  }

  if (typeof imageUrl === "string" && (imageUrl.includes("localhost") || imageUrl.startsWith("http://127.0.0.1"))) {
    return NextResponse.json(
      { error: "Image URL is localhost. Send the image as base64 (data URL) or use a public URL.", fallback: FALLBACK },
      { status: 400 }
    );
  }

  let imageAnalysis: ImageAnalysisForCaption | null = null;
  const imageInput =
    typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:image")
      ? imageDataUrl
      : typeof imageUrl === "string" && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("data:"))
        ? imageUrl
        : null;
  const useGeminiFirst = !!process.env.GEMINI_API_KEY?.trim();
  if (process.env.NODE_ENV !== "production" && useGeminiFirst) {
    console.log("[generate-caption] Using Gemini first (GEMINI_API_KEY is set)");
  }

  if (imageInput) {
    if (useGeminiFirst) {
      try {
        imageAnalysis = await geminiAnalyze(imageInput);
      } catch (e) {
        console.warn("Gemini image analysis failed:", e);
      }
    }
    if (!imageAnalysis && process.env.OPENAI_API_KEY?.trim()) {
      try {
        imageAnalysis = (await openaiAnalyze(imageInput)) ?? null;
      } catch (e) {
        console.warn("OpenAI image analysis failed:", e);
      }
    }
    if (!imageAnalysis && !useGeminiFirst && process.env.GEMINI_API_KEY?.trim()) {
      try {
        imageAnalysis = await geminiAnalyze(imageInput);
      } catch (e) {
        console.error("Gemini image analysis error:", e);
      }
    }
  }

  let result: Awaited<ReturnType<typeof openaiGenerate>> | null = null;
  if (useGeminiFirst) {
    try {
      result = await geminiGenerate(imageAnalysis, userOverrides);
    } catch (e) {
      console.warn("Gemini caption generation failed, trying OpenAI:", e);
    }
  }
  if (!result && process.env.OPENAI_API_KEY?.trim()) {
    try {
      result = await openaiGenerate(imageAnalysis, userOverrides);
    } catch (e) {
      console.warn("OpenAI caption generation failed:", e);
    }
  }
  if (!result && !useGeminiFirst && process.env.GEMINI_API_KEY?.trim()) {
    result = await geminiGenerate(imageAnalysis, userOverrides);
  }

  if (!result) {
    console.warn("[generate-caption] No result from OpenAI or Gemini; returning fallback (502)");
    return NextResponse.json(
      {
        error: "Caption generation failed. Add OPENAI_API_KEY or GEMINI_API_KEY to .env.local and restart.",
        fallback: FALLBACK,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ...result,
    fromImage: hasImageInput ? getFromImagePayload(imageAnalysis, userOverrides.niche ?? niche) : undefined,
  });
}
