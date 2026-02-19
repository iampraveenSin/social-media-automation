import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getPosts } from "@/lib/store";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const posts = await getPosts(session.userId);
    return NextResponse.json(posts);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Posts list error:", e);
    if (msg.includes("schema cache") || (e as { code?: string })?.code === "PGRST205") {
      return NextResponse.json(
        { error: "Supabase tables missing. Run supabase/migrations/20260218000000_automation_schema.sql in your Supabase project → SQL Editor." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to list posts" }, { status: 500 });
  }
}
