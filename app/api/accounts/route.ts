import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAccounts } from "@/lib/store";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ connected: false }, { status: 401 });
  try {
    const accounts = await getAccounts(session.userId);
    const account = accounts[0] ?? null;
    return NextResponse.json(
      account
        ? { connected: true, username: account.username, suggestedNiche: account.suggestedNiche ?? null }
        : { connected: false }
    );
  } catch (e) {
    return NextResponse.json({ connected: false }, { status: 500 });
  }
}
