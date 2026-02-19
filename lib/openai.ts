import OpenAI from "openai";
import type { CaptionGenerationResult } from "./types";

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

const NICHE_OPTIONS = ["lifestyle", "photography", "fitness", "food", "tech", "fashion", "education", "motivation"] as const;
export type NicheOption = (typeof NICHE_OPTIONS)[number];

/** Map keywords in profile or model response to our niche. Checked in order; first match wins. */
const KEYWORD_TO_NICHE: { keywords: string[]; niche: NicheOption }[] = [
  { keywords: ["restaurant", "restaurants", "dining", "meal", "meals", "cafe", "café", "takeaway", "food", "cuisine", "chef", "menu"], niche: "food" },
  { keywords: ["fitness", "gym", "workout", "exercise", "training", "health", "muscle", "yoga"], niche: "fitness" },
  { keywords: ["tech", "software", "IT", "developer", "coding", "programming", "startup", "app", "digital"], niche: "tech" },
  { keywords: ["fashion", "style", "outfit", "clothing", "wear"], niche: "fashion" },
  { keywords: ["photography", "photo", "photographer", "camera", "lens"], niche: "photography" },
  { keywords: ["education", "learn", "course", "teaching", "student"], niche: "education" },
  { keywords: ["motivation", "mindset", "inspire", "goals", "success"], niche: "motivation" },
  { keywords: ["adventure", "travel", "explore", "wanderlust"], niche: "lifestyle" },
];

function inferNicheFromKeywords(text: string): NicheOption {
  const lower = text.toLowerCase();
  for (const { keywords, niche } of KEYWORD_TO_NICHE) {
    if (keywords.some((k) => lower.includes(k))) return niche;
  }
  return "lifestyle";
}

export interface InstagramProfileForAnalysis {
  username: string;
  name?: string;
  biography?: string;
}

/** Infer the best-matching niche from an Instagram profile (username, name, bio). Returns one of the app's niche options. */
export async function inferNicheFromProfile(profile: InstagramProfileForAnalysis): Promise<NicheOption> {
  const text = [profile.username, profile.name, profile.biography].filter(Boolean).join(" | ") || profile.username || "";
  if (!text.trim()) return "lifestyle";

  const fromKeywords = inferNicheFromKeywords(text);
  if (fromKeywords !== "lifestyle") return fromKeywords;

  const client = getOpenAI();
  if (!client) return "lifestyle";

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 50,
      messages: [
        {
          role: "system",
          content: `You classify Instagram profiles into exactly ONE niche. Reply with only one word from this list: ${NICHE_OPTIONS.join(", ")}.

Mapping rules (use these):
- Restaurant, dining, meals, café, takeaway, food, cuisine, chef, menu → food
- Fitness, gym, workout, exercise, training, yoga → fitness
- Tech, IT, software, developer, coding, app, digital → tech
- Fashion, style, outfit, clothing → fashion
- Photography, photographer, camera → photography
- Education, learning, course, teaching → education
- Motivation, mindset, inspire, goals → motivation
- Travel, adventure, lifestyle, general → lifestyle`,
        },
        {
          role: "user",
          content: `Profile: ${text.slice(0, 500)}`,
        },
      ],
    });
    const raw = (res.choices[0]?.message?.content ?? "").trim().toLowerCase();
    const match = NICHE_OPTIONS.find((n) => raw === n || raw.includes(n));
    if (match) return match;
    if (raw.includes("restaurant") || raw.includes("dining") || raw.includes("food") || raw.includes("cafe")) return "food";
    if (raw.includes("fitness") || raw.includes("gym") || raw.includes("workout")) return "fitness";
    if (raw.includes("tech") || raw.includes("software") || raw.includes("IT")) return "tech";
    return inferNicheFromKeywords(raw) !== "lifestyle" ? inferNicheFromKeywords(raw) : "lifestyle";
  } catch (err) {
    console.error("OpenAI inferNicheFromProfile error:", err);
    return inferNicheFromKeywords(text);
  }
}

/** Describe an image in 1-2 sentences for caption context. Uses Vision API. Accepts URL or data:image/...;base64,... */
export async function describeImage(imageUrlOrDataUrl: string): Promise<string> {
  const client = getOpenAI();
  if (!client) return "";
  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this image in 1-2 short sentences: what or who is shown, mood, and key elements. Be specific (e.g. person, place, object names). For Instagram caption context." },
            { type: "image_url", image_url: { url: imageUrlOrDataUrl } },
          ],
        },
      ],
    });
    return res.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Result of analyzing an image for relatable caption context. All fields derived from the image. */
export interface ImageAnalysisForCaption {
  sceneDescription: string;
  mood: string;
  suggestedTopic: string;
  suggestedVibe: string;
  suggestedAudience: string;
  keyElements: string[];
}

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

/** Analyze image to extract scene, mood, topic, vibe, audience and key elements. All output is derived from the image. */
export async function analyzeImageForCaption(imageUrlOrDataUrl: string): Promise<ImageAnalysisForCaption | null> {
  const client = getOpenAI();
  if (!client) return null;
  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: ANALYZE_IMAGE_PROMPT },
            { type: "image_url", image_url: { url: imageUrlOrDataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });
    const raw = res.choices[0]?.message?.content ?? "{}";
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
    console.error("OpenAI image analysis error:", err);
    return null;
  }
}

const CAPTION_SYSTEM_PROMPT = `You are an Instagram copywriter. Generate a natural, human caption and hashtags.

Format rules (follow exactly):
1. Caption: 2–4 short lines. Tone: warm and relatable. Write like a real person, not a brand.
2. Add exactly 1 question for engagement (can include a light emoji like 🌿 or ✨). Put it after a blank line.
3. Hashtags: 8–12 relevant hashtags, in one line (no line breaks). Mix niche-specific and broader. Do NOT list keywords line by line.
4. Do NOT output keywords or bullet points. Output only the caption text and the hashtag array.

Output JSON only: {"caption":"...","hashtags":["#tag1","#tag2",...]}
- caption: the full caption block (2–4 lines + blank line + engagement question). Use \\n for line breaks.
- hashtags: array of 8–12 hashtags (each string can include # or not; we normalize).`;

function getFallback(niche: string): CaptionGenerationResult {
  return {
    caption: `Finding joy in the everyday. ✨\n\nWhat's one small thing that made you smile today?`,
    hashtags: ["#lifestyle", "#dailyjoy", "#mindfulliving", "#simplelife", "#goodvibesonly", "#selfgrowth", "#contentcreator", "#reallife"],
  };
}

export interface CaptionKeywords {
  topic?: string;
  vibe?: string;
  audience?: string;
  niche?: string;
}

/** Build context from image analysis (and optional user overrides). Everything is from the image unless user overrides. */
function buildContextFromAnalysis(
  analysis: ImageAnalysisForCaption | null,
  userOverrides?: CaptionKeywords
): string {
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
  if (analysis?.keyElements?.length) parts.push(`Key elements (use for hashtags/caption): ${analysis.keyElements.join(", ")}`);
  if (parts.length === 0) parts.push(`Niche: ${niche}`);
  return parts.join(". ");
}

export async function generateCaptionAndHashtags(
  imageAnalysis: ImageAnalysisForCaption | null,
  userOverrides?: CaptionKeywords
): Promise<CaptionGenerationResult> {
  const niche = userOverrides?.niche ?? "lifestyle";
  const client = getOpenAI();
  if (!client) {
    return getFallback(niche);
  }

  const contextLine = buildContextFromAnalysis(imageAnalysis, userOverrides);

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CAPTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: imageAnalysis
            ? `All context below was extracted FROM THIS IMAGE. Write a warm, relatable caption (2–4 lines) that directly reflects what's in the image, then one engagement question, then 8–12 hashtags based on the key elements and mood. Do not use generic phrases—reference the actual scene. JSON only.\n\n${contextLine}`
            : `Context: ${contextLine}. No image. Write a warm, relatable caption (2–4 lines), one engagement question, and 8–12 hashtags. JSON only.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { caption?: string; hashtags?: string[] };
    const caption = typeof parsed.caption === "string" ? parsed.caption.trim() : getFallback(niche).caption;
    let hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : getFallback(niche).hashtags;
    hashtags = hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`));
    return { caption, hashtags };
  } catch (err) {
    console.error("OpenAI caption error:", err);
    return getFallback(niche);
  }
}
