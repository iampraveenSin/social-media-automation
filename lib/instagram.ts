// Meta Graph API client for Instagram Business/Creator accounts.
// Requires: Business or Creator account linked to a Facebook Page.

const META_GRAPH_BASE = "https://graph.facebook.com/v21.0";

export interface PublishMediaResponse {
  id: string;
}

/** Instagram can only fetch images from public URLs. localhost is not reachable by Meta's servers. */
export function isPublicImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1" && (u.protocol === "http:" || u.protocol === "https:");
  } catch {
    return false;
  }
}

export const LOCALHOST_MEDIA_MESSAGE =
  "Image URL must be publicly accessible. Instagram cannot fetch images from localhost. Deploy your app (e.g. Vercel) and set NEXT_PUBLIC_APP_URL to your production URL (e.g. https://automation-aditya.vercel.app).";

/** Publish to Instagram. Uses image_url only (public URL); Meta fetches the image. No fs.readFile. */
export async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
): Promise<PublishMediaResponse | { error: string }> {
  if (!isPublicImageUrl(imageUrl)) {
    return { error: LOCALHOST_MEDIA_MESSAGE };
  }

  const createUrl = `${META_GRAPH_BASE}/${igUserId}/media`;
  const params = new URLSearchParams({
    image_url: imageUrl,
    caption: caption,
    access_token: accessToken,
  });

  const createRes = await fetch(createUrl, {
    method: "POST",
    body: params,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const createJson = (await createRes.json()) as { id?: string; error?: { message: string } };
  if (createJson.error) {
    return { error: createJson.error.message ?? "Failed to create media container" };
  }
  const containerId = createJson.id;
  if (!containerId) return { error: "No container id returned" };

  // Instagram requires the container to reach FINISHED before media_publish (avoids "Media ID is not available").
  const statusError = await waitForContainerReady(containerId, accessToken);
  if (statusError) return { error: statusError };

  const publishUrl = `${META_GRAPH_BASE}/${igUserId}/media_publish`;
  const publishParams = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });

  const publishRes = await fetch(publishUrl, {
    method: "POST",
    body: publishParams,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const publishJson = (await publishRes.json()) as { id?: string; error?: { message: string } };
  if (publishJson.error) {
    return { error: publishJson.error.message ?? "Failed to publish" };
  }
  return { id: publishJson.id ?? containerId };
}

const CONTAINER_POLL_INTERVAL_MS = 2000;
const CONTAINER_POLL_MAX_ATTEMPTS = 20; // ~40 seconds max

/** Poll container status until FINISHED (or ERROR/EXPIRED). Returns error message or null. */
async function waitForContainerReady(
  containerId: string,
  accessToken: string
): Promise<string | null> {
  const statusUrl = `${META_GRAPH_BASE}/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`;
  for (let i = 0; i < CONTAINER_POLL_MAX_ATTEMPTS; i++) {
    const res = await fetch(statusUrl);
    const data = (await res.json()) as { status_code?: string; error?: { message: string } };
    if (data.error) return data.error.message ?? "Failed to check container status";
    const status = data.status_code;
    if (status === "FINISHED") return null;
    if (status === "ERROR" || status === "EXPIRED") {
      return status === "EXPIRED" ? "Media container expired before publish" : "Media container failed";
    }
    await new Promise((r) => setTimeout(r, CONTAINER_POLL_INTERVAL_MS));
  }
  return "Media container did not become ready in time";
}

/** Publish a photo to the connected Facebook Page (same Page linked to Instagram). */
export async function publishToFacebookPage(
  pageId: string,
  pageAccessToken: string,
  imageUrl: string,
  caption: string
): Promise<{ id: string } | { error: string }> {
  if (!isPublicImageUrl(imageUrl)) {
    return { error: LOCALHOST_MEDIA_MESSAGE };
  }

  const url = `${META_GRAPH_BASE}/${pageId}/photos`;
  const params = new URLSearchParams({
    url: imageUrl,
    caption: caption,
    access_token: pageAccessToken,
  });

  const res = await fetch(url, {
    method: "POST",
    body: params,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const json = (await res.json()) as { id?: string; error?: { message: string } };
  if (json.error) {
    return { error: json.error.message ?? "Failed to post to Facebook Page" };
  }
  return { id: json.id ?? "" };
}

/** Fetch Instagram profile (username, name, biography) for account analysis. */
export async function getInstagramProfile(
  igUserId: string,
  accessToken: string
): Promise<{ username: string; name?: string; biography?: string } | null> {
  const url = `${META_GRAPH_BASE}/${igUserId}?fields=username,name,biography&access_token=${encodeURIComponent(accessToken)}`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as { username?: string; name?: string; biography?: string; error?: { message: string } };
    if (data.error) return null;
    return {
      username: data.username ?? "",
      name: data.name,
      biography: data.biography,
    };
  } catch {
    return null;
  }
}

/** Use http for localhost so OAuth callback works (dev server has no HTTPS). */
function normalizeOriginForOAuth(origin: string): string {
  const base = origin.replace(/\/+$/, "");
  try {
    const u = new URL(base);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") u.protocol = "http:";
    return u.origin;
  } catch {
    return base.startsWith("https") ? base : base;
  }
}

/** baseUrl = request origin (e.g. http://localhost:3000) so redirect comes back to same host and cookie is sent */
export function getInstagramLoginUrl(baseUrl?: string): string {
  const appId = process.env.META_APP_ID ?? "";
  const raw = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const origin = normalizeOriginForOAuth(raw);
  const redirectUri = `${origin}/api/auth/instagram/callback`;
  const scopes = [
    "instagram_basic",
    "instagram_content_publish",
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts", // Required to post to the Facebook Page (fixes #200 Permissions error)
    "ads_read",
    "business_management", // Required since Graph API v19 for /me/accounts to return Pages
  ];
  return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes.join(",")}&response_type=code`;
}
