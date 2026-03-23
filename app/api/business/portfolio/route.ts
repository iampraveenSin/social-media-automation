import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAccounts } from "@/lib/store";

const META_GRAPH_BASE = "https://graph.facebook.com/v25.0";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await getAccounts(session.userId);
  const account = accounts[0];
  if (!account) return NextResponse.json({ error: "No Instagram account connected" }, { status: 400 });

  const token = account.userAccessToken ?? account.accessToken;
  const meUrl = `${META_GRAPH_BASE}/me?fields=id,name&access_token=${encodeURIComponent(token)}`;
  const meRes = await fetch(meUrl, { cache: "no-store" });
  const meData = (await meRes.json()) as { id?: string; name?: string; error?: { message?: string } };
  if (!meRes.ok || meData.error) {
    return NextResponse.json({ error: meData.error?.message ?? "Failed to fetch account info" }, { status: 400 });
  }

  const businessesUrl = `${META_GRAPH_BASE}/me/businesses?fields=id,name,verification_status,created_time&limit=25&access_token=${encodeURIComponent(
    token
  )}`;
  const businessesRes = await fetch(businessesUrl, { cache: "no-store" });
  const businessesData = (await businessesRes.json()) as {
    data?: Array<{ id?: string; name?: string; verification_status?: string; created_time?: string }>;
    error?: { message?: string };
  };
  if (!businessesRes.ok || businessesData.error) {
    return NextResponse.json(
      { error: businessesData.error?.message ?? "Failed to fetch business portfolios" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    account: { id: meData.id ?? "", name: meData.name ?? "" },
    portfolios: (businessesData.data ?? []).filter((b) => !!b.id).map((b) => ({
      id: b.id as string,
      name: b.name ?? "Business",
      verificationStatus: b.verification_status ?? "unknown",
      createdTime: b.created_time,
    })),
  });
}

