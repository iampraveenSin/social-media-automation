import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getAccounts } from "@/lib/store";

const META_GRAPH_BASE = "https://graph.facebook.com/v25.0";

interface PagePostRaw {
  id?: string;
  message?: string;
  created_time?: string;
  full_picture?: string;
  permalink_url?: string;
  reactions?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
  shares?: { count?: number };
}

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await getAccounts(session.userId);
  const account = accounts[0];
  if (!account?.facebookPageId) {
    return NextResponse.json({ error: "No connected Facebook Page" }, { status: 400 });
  }

  const pageInfoUrl = `${META_GRAPH_BASE}/${account.facebookPageId}?fields=id,name,fan_count&access_token=${encodeURIComponent(
    account.accessToken
  )}`;
  const pageInfoRes = await fetch(pageInfoUrl, { cache: "no-store" });
  const pageInfo = (await pageInfoRes.json()) as {
    id?: string;
    name?: string;
    fan_count?: number;
    error?: { message?: string };
  };
  if (!pageInfoRes.ok || pageInfo.error) {
    return NextResponse.json(
      { error: pageInfo.error?.message ?? "Failed to fetch Facebook Page info" },
      { status: 400 }
    );
  }

  const postsUrl = `${META_GRAPH_BASE}/${account.facebookPageId}/posts?fields=id,message,created_time,full_picture,permalink_url,reactions.summary(true),comments.summary(true),shares&limit=15&access_token=${encodeURIComponent(
    account.accessToken
  )}`;
  const postsRes = await fetch(postsUrl, { cache: "no-store" });
  const postsData = (await postsRes.json()) as { data?: PagePostRaw[]; error?: { message?: string } };
  if (!postsRes.ok || postsData.error) {
    const msg = postsData.error?.message ?? "";
    if (msg.includes("(#10)") || msg.includes("pages_read_engagement")) {
      return NextResponse.json(
        {
          error:
            "pages_read_engagement permission is missing or not approved for this app/account. Grant this permission in Meta App Review and reconnect.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: postsData.error?.message ?? "Failed to fetch Facebook posts" },
      { status: 400 }
    );
  }

  const posts = (postsData.data ?? [])
    .filter((p) => typeof p.id === "string")
    .map((p) => ({
      id: p.id as string,
      message: p.message ?? "",
      createdTime: p.created_time,
      fullPicture: p.full_picture,
      permalinkUrl: p.permalink_url,
      reactionsCount: p.reactions?.summary?.total_count ?? 0,
      commentsCount: p.comments?.summary?.total_count ?? 0,
      sharesCount: p.shares?.count ?? 0,
    }));

  return NextResponse.json({
    page: {
      id: pageInfo.id ?? account.facebookPageId,
      name: pageInfo.name ?? "Facebook Page",
      fanCount: pageInfo.fan_count ?? 0,
    },
    posts,
  });
}

