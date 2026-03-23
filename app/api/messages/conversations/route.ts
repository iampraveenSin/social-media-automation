import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAccounts } from "@/lib/store";
import { listInstagramConversations } from "@/lib/instagram-messaging";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accounts = await getAccounts(session.userId);
  const account = accounts[0];
  if (!account) return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });

  const result = await listInstagramConversations(account.instagramBusinessAccountId, account.accessToken);
  if ("error" in result) {
    const msg = result.error;
    if (msg.includes("(#3)") || msg.toLowerCase().includes("capability")) {
      return NextResponse.json(
        {
          error:
            "Instagram Messaging is not enabled for this app/account in Meta App Review. Add instagram_manage_messages permission and ensure the app/account has messaging capability.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ conversations: result.conversations });
}

