import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAccounts, deleteAccount } from "@/lib/store";

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const accounts = await getAccounts(session.userId);
    const current = accounts[0] ?? null;
    if (!current) {
      return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });
    }
    await deleteAccount(current.id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
