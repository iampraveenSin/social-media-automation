import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAccounts } from "@/lib/store";
import { replyToInstagramComment } from "@/lib/instagram-comments";

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    commentId?: string;
    text?: string;
  };
  const commentId = typeof body.commentId === "string" ? body.commentId : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!commentId || !text) {
    return NextResponse.json({ error: "commentId and text are required" }, { status: 400 });
  }

  const accounts = await getAccounts(session.userId);
  const account = accounts[0];
  if (!account) return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });

  const result = await replyToInstagramComment(commentId, text, account.accessToken);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, id: result.id });
}

