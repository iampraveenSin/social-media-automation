import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getPost, getAccountByUserId, getAccounts } from "@/lib/store";
import { listInstagramComments } from "@/lib/instagram-comments";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await context.params;
  const post = await getPost(postId, session.userId);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (!post.instagramMediaId) {
    return NextResponse.json({ error: "Selected post has no Instagram media id" }, { status: 400 });
  }

  let account = post.userId ? await getAccountByUserId(post.userId) : null;
  if (!account) {
    const accounts = await getAccounts(session.userId);
    account = accounts[0] ?? null;
  }
  if (!account) return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });

  const result = await listInstagramComments(post.instagramMediaId, account.accessToken);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ comments: result.comments });
}

