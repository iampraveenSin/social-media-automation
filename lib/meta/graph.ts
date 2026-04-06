import { META_GRAPH_VERSION } from "@/lib/env/meta";
import type { MetaGraphPage } from "@/lib/meta/types";

const BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export async function exchangeCodeForShortLivedUserToken(
  code: string,
  redirectUri: string,
  appId: string,
  appSecret: string,
): Promise<{ accessToken: string; expiresIn?: number }> {
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(`${BASE}/oauth/access_token?${params}`, {
    cache: "no-store",
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message: string };
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error?.message || "Failed to exchange authorization code.",
    );
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function exchangeForLongLivedUserToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string,
): Promise<{ accessToken: string; expiresIn?: number }> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(`${BASE}/oauth/access_token?${params}`, {
    cache: "no-store",
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message: string };
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error?.message || "Failed to obtain long-lived user token.",
    );
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function getFacebookUserId(
  userAccessToken: string,
): Promise<string> {
  const params = new URLSearchParams({
    fields: "id",
    access_token: userAccessToken,
  });
  const res = await fetch(`${BASE}/me?${params}`, { cache: "no-store" });
  const data = (await res.json()) as { id?: string; error?: { message: string } };
  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || "Failed to read Facebook user id.");
  }
  return data.id;
}

export async function fetchManagedPages(
  userAccessToken: string,
): Promise<MetaGraphPage[]> {
  const params = new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account{id,username}",
    access_token: userAccessToken,
  });
  const res = await fetch(`${BASE}/me/accounts?${params}`, {
    cache: "no-store",
  });
  const data = (await res.json()) as {
    data?: MetaGraphPage[];
    error?: { message: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to list Facebook Pages.");
  }
  return data.data ?? [];
}

/** Public-ish Page fields for the Business dashboard (Page access token). */
export type MetaPagePublicDetails = {
  id: string;
  name: string;
  link?: string;
  fan_count?: number;
  category?: string;
  about?: string;
  phone?: string;
  website?: string;
};

export async function fetchPagePublicDetails(
  pageId: string,
  pageAccessToken: string,
): Promise<MetaPagePublicDetails | null> {
  const fields = [
    "id",
    "name",
    "link",
    "fan_count",
    "category",
    "about",
    "phone",
    "website",
  ].join(",");
  const params = new URLSearchParams({
    fields,
    access_token: pageAccessToken,
  });
  const res = await fetch(`${BASE}/${encodeURIComponent(pageId)}?${params}`, {
    cache: "no-store",
  });
  const data = (await res.json()) as {
    id?: string;
    name?: string;
    link?: string;
    fan_count?: number;
    category?: string;
    about?: string;
    phone?: string;
    website?: string;
    error?: { message: string };
  };
  if (!res.ok || data.error || !data.name) {
    return null;
  }
  return {
    id: data.id ?? pageId,
    name: data.name,
    link: data.link,
    fan_count: data.fan_count,
    category: data.category,
    about: data.about,
    phone: data.phone,
    website: data.website,
  };
}

/** Instagram Business account fields (Page access token). */
export type MetaInstagramUserDetails = {
  username?: string;
  followers_count?: number;
  media_count?: number;
  profile_picture_url?: string;
};

export async function fetchInstagramUserPublicDetails(
  instagramUserId: string,
  pageAccessToken: string,
): Promise<MetaInstagramUserDetails | null> {
  const fields = "username,followers_count,media_count,profile_picture_url";
  const params = new URLSearchParams({
    fields,
    access_token: pageAccessToken,
  });
  const res = await fetch(
    `${BASE}/${encodeURIComponent(instagramUserId)}?${params}`,
    { cache: "no-store" },
  );
  const data = (await res.json()) as {
    username?: string;
    followers_count?: number;
    media_count?: number;
    profile_picture_url?: string;
    error?: { message: string };
  };
  if (!res.ok || data.error) {
    return null;
  }
  return {
    username: data.username,
    followers_count: data.followers_count,
    media_count: data.media_count,
    profile_picture_url: data.profile_picture_url,
  };
}

export type MetaInstagramInsights = MetaInstagramUserDetails & {
  biography?: string;
  website?: string;
  name?: string;
};

export async function fetchInstagramUserInsights(
  instagramUserId: string,
  pageAccessToken: string,
): Promise<MetaInstagramInsights | null> {
  const fields =
    "username,followers_count,media_count,profile_picture_url,biography,website,name";
  const params = new URLSearchParams({
    fields,
    access_token: pageAccessToken,
  });
  const res = await fetch(
    `${BASE}/${encodeURIComponent(instagramUserId)}?${params}`,
    { cache: "no-store" },
  );
  const data = (await res.json()) as {
    username?: string;
    followers_count?: number;
    media_count?: number;
    profile_picture_url?: string;
    biography?: string;
    website?: string;
    name?: string;
    error?: { message: string };
  };
  if (!res.ok || data.error) {
    return null;
  }
  return {
    username: data.username,
    followers_count: data.followers_count,
    media_count: data.media_count,
    profile_picture_url: data.profile_picture_url,
    biography: data.biography,
    website: data.website,
    name: data.name,
  };
}

export type IgMediaGridItem = {
  id: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
};

export async function fetchInstagramMediaGrid(
  instagramUserId: string,
  pageAccessToken: string,
  limit = 9,
): Promise<IgMediaGridItem[]> {
  const params = new URLSearchParams({
    fields: "id,media_type,media_url,thumbnail_url,permalink",
    access_token: pageAccessToken,
    limit: String(Math.min(Math.max(limit, 1), 25)),
  });
  const res = await fetch(
    `${BASE}/${encodeURIComponent(instagramUserId)}/media?${params}`,
    { cache: "no-store" },
  );
  const data = (await res.json()) as {
    data?: IgMediaGridItem[];
    error?: { message: string };
  };
  if (!res.ok || data.error) {
    return [];
  }
  return data.data ?? [];
}
