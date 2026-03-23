import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAccounts } from "@/lib/store";
import { setInstagramCommentHidden } from "@/lib/instagram-comments";

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    commentId?: string;
    hidden?: boolean;
  };
  const commentId = typeof body.commentId === "string" ? body.commentId : "";
  const hidden = body.hidden === true;
  if (!commentId) return NextResponse.json({ error: "commentId is required" }, { status: 400 });

  const accounts = await getAccounts(session.userId);
  const account = accounts[0];
  if (!account) return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });

  const result = await setInstagramCommentHidden(commentId, hidden, account.accessToken);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

