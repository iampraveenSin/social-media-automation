import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAccounts } from "@/lib/store";
import { sendInstagramMessage } from "@/lib/instagram-messaging";

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    recipientId?: string;
    text?: string;
  };
  const recipientId = typeof body.recipientId === "string" ? body.recipientId : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!recipientId || !text) {
    return NextResponse.json({ error: "recipientId and text are required" }, { status: 400 });
  }

  const accounts = await getAccounts(session.userId);
  const account = accounts[0];
  if (!account) return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });

  const result = await sendInstagramMessage(
    account.instagramBusinessAccountId,
    recipientId,
    text,
    account.accessToken
  );
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, id: result.id });
}

