import { NextResponse } from "next/server";

/**
 * Safe check: are API keys set? (Never returns the actual keys.)
 * Use this to verify .env.local is loaded: GET /api/env-check
 */
export async function GET() {
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  const gemini = Boolean(process.env.GEMINI_API_KEY?.trim());
  const supabase = Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  return NextResponse.json({
    openaiKeySet: openai,
    geminiKeySet: gemini,
    supabaseSet: supabase,
    hint: openai || gemini ? "At least one key is loaded." : "Add OPENAI_API_KEY or GEMINI_API_KEY to .env.local and restart the dev server (npm run dev). Get Gemini key at https://aistudio.google.com/apikey",
  });
}
