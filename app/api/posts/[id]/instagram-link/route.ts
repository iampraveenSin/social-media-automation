import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getPost, getAccountByUserId, getAccounts } from "@/lib/store";
import { getInstagramMediaPermalink } from "@/lib/instagram";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const post = await getPost(id, session.userId);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (!post.instagramMediaId) {
    return NextResponse.json({ error: "Post has no Instagram media id yet" }, { status: 400 });
  }
  if (!post.userId) {
    return NextResponse.json({ error: "Post is missing Instagram account owner metadata." }, { status: 400 });
  }

  const account = await getAccountByUserId(post.userId);
  if (!account) {
    const accounts = await getAccounts(session.userId);
    const active = accounts[0] ?? null;
    if (!active) return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });
    return NextResponse.json(
      { error: "This post belongs to a different Instagram account. Reconnect the original account to open its Instagram link." },
      { status: 400 }
    );
  }

  const permalink = await getInstagramMediaPermalink(post.instagramMediaId, account.accessToken);
  if (!permalink) {
    return NextResponse.json({ error: "Could not resolve Instagram permalink yet. Try again shortly." }, { status: 400 });
  }

  return NextResponse.redirect(permalink);
}

