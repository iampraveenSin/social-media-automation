import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAccounts, saveAccount } from "@/lib/store";
import { getInstagramProfile } from "@/lib/instagram";
import { inferNicheFromProfile } from "@/lib/openai";

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const accounts = await getAccounts(session.userId);
    const account = accounts[0] ?? null;
    if (!account) {
      return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });
    }

    const profile = await getInstagramProfile(account.instagramBusinessAccountId, account.accessToken);
    if (!profile) {
      return NextResponse.json({ error: "Could not fetch Instagram profile" }, { status: 502 });
    }

    const suggestedNiche = await inferNicheFromProfile({
      username: profile.username,
      name: profile.name,
      biography: profile.biography,
    });

    const updated = {
      ...account,
      suggestedNiche,
      analyzedAt: new Date().toISOString(),
    };
    await saveAccount(updated);

    return NextResponse.json({ suggestedNiche });
  } catch (e) {
    console.error("Account analyze error:", e);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
