const META_GRAPH_BASE = "https://graph.facebook.com/v25.0";

export const INSTAGRAM_PENDING_COOKIE = "ig_connect_pending";

export interface PendingInstagramConnect {
  accessToken: string;
  metaUserId: string;
}

export interface FacebookPageOption {
  id: string;
  name: string;
}

export function encodePendingInstagramConnect(data: PendingInstagramConnect): string {
  return Buffer.from(JSON.stringify(data), "utf-8").toString("base64url");
}

export function decodePendingInstagramConnect(raw: string | null | undefined): PendingInstagramConnect | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8")) as PendingInstagramConnect;
    if (!parsed?.accessToken || !parsed?.metaUserId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchFacebookPages(accessToken: string): Promise<{
  pages: Array<{ id: string; name: string; access_token: string }>;
  error?: string;
}> {
  const pagesUrl = `${META_GRAPH_BASE}/me/accounts?fields=id,name,access_token&access_token=${accessToken}`;
  const pagesRes = await fetch(pagesUrl, { cache: "no-store" });
  const pagesData = (await pagesRes.json()) as {
    data?: Array<{ id: string; name: string; access_token: string }>;
    error?: { message?: string };
  };
  if (!pagesRes.ok || pagesData.error) {
    return { pages: [], error: pagesData.error?.message ?? "Failed to fetch Facebook Pages" };
  }
  return { pages: pagesData.data ?? [] };
}

export async function findInstagramForPage(
  pageId: string,
  pageAccessToken: string
): Promise<{ igBusinessId: string | null; error?: string }> {
  const igAccountUrl = `${META_GRAPH_BASE}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`;
  const igRes = await fetch(igAccountUrl, { cache: "no-store" });
  const igData = (await igRes.json()) as {
    instagram_business_account?: { id: string };
    error?: { message?: string };
  };
  if (!igData.error) {
    const id = igData.instagram_business_account?.id;
    if (id) return { igBusinessId: id };
  }

  const backedUrl = `${META_GRAPH_BASE}/${pageId}/page_backed_instagram_accounts?fields=id,username&access_token=${pageAccessToken}`;
  const backedRes = await fetch(backedUrl, { cache: "no-store" });
  const backedData = (await backedRes.json()) as {
    data?: Array<{ id: string; username?: string }>;
    error?: { message?: string };
  };
  if (!backedData.error && backedData.data && backedData.data.length > 0) {
    return { igBusinessId: backedData.data[0].id };
  }
  return { igBusinessId: null, error: backedData.error?.message ?? igData.error?.message };
}

