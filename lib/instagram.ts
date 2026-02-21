// Meta Graph API client for Instagram Business/Creator accounts.
// Requires: Business or Creator account linked to a Facebook Page.

const META_GRAPH_BASE = "https://graph.facebook.com/v21.0";

export interface PublishMediaResponse {
  id: string;
}

/** Instagram can only fetch media from public URLs. localhost is not reachable by Meta's servers. */
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
  "Media URL must be publicly accessible. Instagram cannot fetch from localhost. Deploy your app (e.g. Vercel) and set NEXT_PUBLIC_APP_URL to your production URL.";

export type InstagramMediaType = "image" | "video" | "reels";

/** Build full caption text (caption + hashtags) for Instagram/Facebook. Used for all media types: image, video, GIF. */
export function buildCaptionWithHashtags(caption: string, hashtags: string[]): string {
  const list = [caption ?? "", ...(Array.isArray(hashtags) ? hashtags : [])].filter(Boolean);
  return list.join("\n\n");
}

/** Publish image, video, or GIF to Instagram. Caption (with hashtags) is shown on all media types. */
export async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  mediaUrl: string,
  caption: string,
  mediaType: InstagramMediaType = "image"
): Promise<PublishMediaResponse | { error: string }> {
  if (!isPublicImageUrl(mediaUrl)) {
    return { error: LOCALHOST_MEDIA_MESSAGE };
  }

  const result = await createAndPublishContainer(igUserId, accessToken, mediaUrl, caption, mediaType);
  if (!("error" in result)) return result;

  const errMsg = result.error ?? "";
  const reelsRejected =
    mediaType === "reels" &&
    (errMsg.toLowerCase().includes("invalid parameter") ||
      errMsg.toLowerCase().includes("unsupported") ||
      errMsg.toLowerCase().includes("invalid request"));
  if (reelsRejected) {
    return createAndPublishContainer(igUserId, accessToken, mediaUrl, caption, "video");
  }
  return result;
}

async function createAndPublishContainer(
  igUserId: string,
  accessToken: string,
  mediaUrl: string,
  caption: string,
  mediaType: InstagramMediaType
): Promise<PublishMediaResponse | { error: string }> {
  const createUrl = `${META_GRAPH_BASE}/${igUserId}/media`;
  const params = new URLSearchParams({
    caption,
    access_token: accessToken,
  });
  if (mediaType === "video" || mediaType === "reels") {
    params.set("media_type", mediaType === "reels" ? "REELS" : "VIDEO");
    params.set("video_url", mediaUrl);
  } else {
    params.set("image_url", mediaUrl);
  }

  const createRes = await fetch(createUrl, {
    method: "POST",
    body: params,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const createJson = (await createRes.json()) as { id?: string; error?: { message?: string; code?: number; error_subcode?: number } | string };
  const createErr = parseMetaError(createJson.error);
  if (createErr) {
    if (mediaType === "video" || mediaType === "reels") {
      console.error("[Instagram] Video create container failed:", {
        message: createErr,
        code: typeof createJson.error === "object" && createJson.error && "code" in createJson.error ? createJson.error.code : undefined,
        error_subcode: typeof createJson.error === "object" && createJson.error && "error_subcode" in createJson.error ? (createJson.error as { error_subcode?: number }).error_subcode : undefined,
      });
    }
    return { error: createErr };
  }
  const containerId = createJson.id;
  if (!containerId) return { error: "No container id returned" };

  const isVideo = mediaType === "video" || mediaType === "reels";
  const statusError = await waitForContainerReady(containerId, accessToken, isVideo);
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

  const publishJson = (await publishRes.json()) as { id?: string; error?: { message?: string; code?: number; error_subcode?: number } | string };
  const publishErr = parseMetaError(publishJson.error);
  if (publishErr) {
    if (mediaType === "video" || mediaType === "reels") {
      console.error("[Instagram] Video publish failed:", {
        message: publishErr,
        code: typeof publishJson.error === "object" && publishJson.error && "code" in publishJson.error ? publishJson.error.code : undefined,
        error_subcode: typeof publishJson.error === "object" && publishJson.error && "error_subcode" in publishJson.error ? (publishJson.error as { error_subcode?: number }).error_subcode : undefined,
      });
    }
    return { error: publishErr };
  }
  return { id: publishJson.id ?? containerId };
}

function parseMetaError(err: unknown): string | null {
  if (err == null) return null;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: string }).message;
    return typeof m === "string" ? m : null;
  }
  return null;
}

const CONTAINER_POLL_INTERVAL_MS = 2000;
const CONTAINER_POLL_MAX_ATTEMPTS_IMAGE = 20; // ~40 seconds
const CONTAINER_POLL_MAX_ATTEMPTS_VIDEO = 60; // ~2 minutes for video

/** Poll container status until FINISHED (or ERROR/EXPIRED). Returns error message or null. */
async function waitForContainerReady(
  containerId: string,
  accessToken: string,
  isVideo = false
): Promise<string | null> {
  const maxAttempts = isVideo ? CONTAINER_POLL_MAX_ATTEMPTS_VIDEO : CONTAINER_POLL_MAX_ATTEMPTS_IMAGE;
  const statusUrl = `${META_GRAPH_BASE}/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`;
  for (let i = 0; i < maxAttempts; i++) {
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
  return isVideo ? "Video container did not become ready in time (try a shorter/smaller video)" : "Media container did not become ready in time";
}

export type FacebookPageMediaType = "image" | "video";

/** Publish a photo, video, or GIF to the connected Facebook Page. Caption is shown on all media types. */
export async function publishToFacebookPage(
  pageId: string,
  pageAccessToken: string,
  mediaUrl: string,
  caption: string,
  mediaType: FacebookPageMediaType = "image"
): Promise<{ id: string } | { error: string }> {
  if (!isPublicImageUrl(mediaUrl)) {
    return { error: LOCALHOST_MEDIA_MESSAGE };
  }

  if (mediaType === "video") {
    const url = `${META_GRAPH_BASE}/${pageId}/videos`;
    const params = new URLSearchParams({
      file_url: mediaUrl,
      description: caption,
      access_token: pageAccessToken,
    });
    const res = await fetch(url, {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const json = (await res.json()) as { id?: string; error?: { message: string } };
    if (json.error) {
      return { error: json.error.message ?? "Failed to post video to Facebook Page" };
    }
    return { id: json.id ?? "" };
  }

  const url = `${META_GRAPH_BASE}/${pageId}/photos`;
  const params = new URLSearchParams({
    url: mediaUrl,
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
