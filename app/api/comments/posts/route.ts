import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getPosts } from "@/lib/store";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const posts = await getPosts(session.userId);
  const published = posts
    .filter((p) => p.status === "published" && !!p.instagramMediaId)
    .slice(0, 30)
    .map((p) => ({
      id: p.id,
      instagramMediaId: p.instagramMediaId,
      mediaUrl: p.mediaUrl,
      caption: p.caption,
      publishedAt: p.publishedAt,
    }));

  return NextResponse.json({ posts: published });
}

