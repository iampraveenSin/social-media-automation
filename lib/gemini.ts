 /**
 * Gemini API for caption/hashtag generation. Used as fallback when OpenAI is not configured or fails.
 * Requires GEMINI_API_KEY in .env.local (get one at https://aistudio.google.com/apikey).
 */
import { GoogleGenAI } from "@google/genai";
import type { CaptionGenerationResult } from "./types";
import type { ImageAnalysisForCaption, CaptionKeywords } from "./openai";

const ANALYZE_IMAGE_PROMPT = `You are an image analyst for Instagram content. Look at this image and extract relatable context for writing a caption.

Return JSON only, no other text:
{
  "sceneDescription": "1-2 sentences: what is in the image (people, place, objects, activity, time of day, setting). Be specific.",
  "mood": "one short phrase for the overall mood (e.g. cozy morning, energetic, peaceful, nostalgic)",
  "suggestedTopic": "what this image is about as a post topic (e.g. morning coffee, sunset at the beach, desk setup, workout)",
  "suggestedVibe": "2-3 words for the vibe (e.g. warm and calm, bold and energetic)",
  "suggestedAudience": "who would relate to this image (e.g. coffee lovers, remote workers, fitness enthusiasts)",
  "keyElements": ["list", "of", "6-10", "specific", "things", "in", "the", "image", "for", "hashtags and caption"]
}

keyElements: concrete items (objects, colors, activities, places, feelings) that can inspire hashtags and caption. No generic words.`;

const CAPTION_SYSTEM_PROMPT = `You are an Instagram copywriter. Generate a natural, human caption and hashtags.

Format rules (follow exactly):
1. Caption: 2–4 short lines. Tone: warm and relatable. Write like a real person, not a brand.
2. Add exactly 1 question for engagement (can include a light emoji like 🌿 or ✨). Put it after a blank line.
3. Hashtags: 8–12 relevant hashtags, in one line (no line breaks). Mix niche-specific and broader.
4. Output JSON only: {"caption":"...","hashtags":["#tag1","#tag2",...]}
- caption: the full caption block (2–4 lines + blank line + engagement question). Use \\n for line breaks.
- hashtags: array of 8–12 hashtags (each string can include # or not).`;

const GEMINI_MODEL = "gemini-2.0-flash";

function getGemini() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

/** Get text from generateContent response (handles class getter and plain object). */
function getResponseText(response: unknown, logLabel?: string): string {
  if (!response || typeof response !== "object") return "";
  const r = response as Record<string, unknown>;
  const direct = r.text;
  if (typeof direct === "string" && direct.length > 0) return direct;
  const candidates = r.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
  if (Array.isArray(candidates) && candidates[0]?.content?.parts) {
    const text = (candidates[0].content.parts as Array<{ text?: string }>)
      .map((p) => p.text)
      .filter(Boolean)
      .join("");
    if (text) return text;
  }
  if (process.env.NODE_ENV !== "production" && logLabel) {
    const block = (r.promptFeedback as { blockReason?: string } | undefined)?.blockReason;
    console.warn(`[Gemini] ${logLabel}: no text. blockReason=${block ?? "none"} candidates=${candidates?.length ?? 0}`);
  }
  return "";
}

/** Parse data URL or fetch image URL to get { mimeType, base64 }. */
async function imageToBase64(imageUrlOrDataUrl: string): Promise<{ mimeType: string; data: string } | null> {
  if (imageUrlOrDataUrl.startsWith("data:image")) {
    const match = imageUrlOrDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], data: match[2] };
    }
  }
  if (imageUrlOrDataUrl.startsWith("http://") || imageUrlOrDataUrl.startsWith("https://")) {
    try {
      const res = await fetch(imageUrlOrDataUrl);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const base64 = Buffer.from(buf).toString("base64");
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const mimeType = contentType.split(";")[0].trim();
      return { mimeType, data: base64 };
    } catch {
      return null;
    }
  }
  return null;
}

/** Analyze image with Gemini vision. Returns same shape as OpenAI analyzeImageForCaption. */
export async function analyzeImageForCaption(imageUrlOrDataUrl: string): Promise<ImageAnalysisForCaption | null> {
  const ai = getGemini();
  if (!ai) return null;

  const imageData = await imageToBase64(imageUrlOrDataUrl);
  if (!imageData) return null;

  try {
    const contents: { role: string; parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> } = {
      role: "user",
      parts: [
        { inlineData: { mimeType: imageData.mimeType, data: imageData.data } },
        { text: ANALYZE_IMAGE_PROMPT },
      ],
    };

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [contents],
      config: { maxOutputTokens: 1024, responseMimeType: "application/json" },
    });

    const raw = getResponseText(response, "analyzeImage");
    if (!raw || !raw.trim()) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const arr = parsed.keyElements;
    return {
      sceneDescription: typeof parsed.sceneDescription === "string" ? parsed.sceneDescription : "",
      mood: typeof parsed.mood === "string" ? parsed.mood : "",
      suggestedTopic: typeof parsed.suggestedTopic === "string" ? parsed.suggestedTopic : "",
      suggestedVibe: typeof parsed.suggestedVibe === "string" ? parsed.suggestedVibe : "",
      suggestedAudience: typeof parsed.suggestedAudience === "string" ? parsed.suggestedAudience : "",
      keyElements: Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string").slice(0, 12) : [],
    };
  } catch (err) {
    console.error("Gemini image analysis error:", err);
    return null;
  }
}

function logGeminiFallback(reason: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[Gemini] Using fallback:", reason);
  }
}

function getFallback(niche: string): CaptionGenerationResult {
  return {
    caption: `Finding joy in the everyday. ✨\n\nWhat's one small thing that made you smile today?`,
    hashtags: ["#lifestyle", "#dailyjoy", "#mindfulliving", "#simplelife", "#goodvibesonly", "#selfgrowth", "#contentcreator", "#reallife"],
  };
}

function buildContextFromAnalysis(analysis: ImageAnalysisForCaption | null, userOverrides?: CaptionKeywords): string {
  const topic = (userOverrides?.topic ?? analysis?.suggestedTopic ?? "").trim();
  const vibe = (userOverrides?.vibe ?? analysis?.suggestedVibe ?? "").trim();
  const audience = (userOverrides?.audience ?? analysis?.suggestedAudience ?? "").trim();
  const niche = userOverrides?.niche ?? "lifestyle";

  const parts: string[] = [];
  if (analysis?.sceneDescription) parts.push(`Scene: ${analysis.sceneDescription}`);
  if (analysis?.mood) parts.push(`Mood: ${analysis.mood}`);
  if (topic) parts.push(`Topic: ${topic}`);
  if (vibe) parts.push(`Vibe: ${vibe}`);
  if (audience) parts.push(`Audience: ${audience}`);
  if (analysis?.keyElements?.length) parts.push(`Key elements: ${analysis.keyElements.join(", ")}`);
  if (parts.length === 0) parts.push(`Niche: ${niche}`);
  return parts.join(". ");
}

/** Generate caption and hashtags from analysis (text-only call). Same interface as OpenAI. */
export async function generateCaptionAndHashtags(
  imageAnalysis: ImageAnalysisForCaption | null,
  userOverrides?: CaptionKeywords
): Promise<CaptionGenerationResult> {
  const niche = userOverrides?.niche ?? "lifestyle";
  const ai = getGemini();
  if (!ai) {
    logGeminiFallback("GEMINI_API_KEY not set");
    return getFallback(niche);
  }

  const contextLine = buildContextFromAnalysis(imageAnalysis, userOverrides);
  const userPrompt = imageAnalysis
    ? `All context below was extracted FROM THE IMAGE. Write a warm, relatable caption (2–4 lines) that directly reflects what's in the image, then one engagement question, then 8–12 hashtags based on the key elements and mood. Do not use generic phrases—reference the actual scene. JSON only.\n\n${contextLine}`
    : `Context: ${contextLine}. No image. Write a warm, relatable caption (2–4 lines), one engagement question, and 8–12 hashtags. JSON only.`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: CAPTION_SYSTEM_PROMPT + "\n\n" + userPrompt }] }],
      config: { maxOutputTokens: 1024, responseMimeType: "application/json" },
    });

    const raw = getResponseText(response, "caption");
    if (!raw || !raw.trim()) {
      logGeminiFallback("Empty response from Gemini");
      return getFallback(niche);
    }
    let parsed: { caption?: string; hashtags?: string[] };
    try {
      parsed = JSON.parse(raw) as { caption?: string; hashtags?: string[] };
    } catch (parseErr) {
      console.warn("[Gemini] Caption response was not valid JSON. First 200 chars:", raw.slice(0, 200));
      logGeminiFallback("Invalid JSON in response");
      return getFallback(niche);
    }
    const caption = typeof parsed.caption === "string" ? parsed.caption.trim() : getFallback(niche).caption;
    let hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : getFallback(niche).hashtags;
    hashtags = hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`));
    if (process.env.NODE_ENV !== "production") {
      console.log("[Gemini] Caption generated successfully");
    }
    return { caption, hashtags };
  } catch (err) {
    console.error("Gemini caption error:", err);
    logGeminiFallback(String(err instanceof Error ? err.message : err));
    return getFallback(niche);
  }
}
