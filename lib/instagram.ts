// Meta Graph API client for Instagram Business/Creator accounts.
// Requires: Business or Creator account linked to a Facebook Page.

const META_GRAPH_BASE = "https://graph.facebook.com/v25.0";

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

  let result = await createAndPublishContainer(igUserId, accessToken, mediaUrl, caption, mediaType);
  if (!("error" in result)) return result;

  const errMsg = result.error ?? "";
  const subcode = "error_subcode" in result ? result.error_subcode : undefined;
  // If we sent VIDEO and got "Unknown media type" (2207023), try REELS (some apps/versions only accept REELS for video).
  const videoUnknownType =
    mediaType === "video" &&
    (subcode === 2207023 || errMsg.toLowerCase().includes("unknown") || errMsg.toLowerCase().includes("invalid parameter"));
  if (videoUnknownType) {
    result = await createAndPublishContainer(igUserId, accessToken, mediaUrl, caption, "reels");
    if (!("error" in result)) return result;
  }

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

type CreateContainerError = { error: string; error_subcode?: number };

async function createAndPublishContainer(
  igUserId: string,
  accessToken: string,
  mediaUrl: string,
  caption: string,
  mediaType: InstagramMediaType
): Promise<PublishMediaResponse | CreateContainerError> {
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

  // Meta docs show params as query string; some environments reject form body for this endpoint.
  const urlWithQuery = `${createUrl}?${params.toString()}`;
  const createRes = await fetch(urlWithQuery, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const createJson = (await createRes.json()) as { id?: string; error?: { message?: string; code?: number; error_subcode?: number } | string };
  const createErr = parseMetaError(createJson.error);
  const subcode =
    typeof createJson.error === "object" && createJson.error !== null && "error_subcode" in createJson.error
      ? (createJson.error as { error_subcode?: number }).error_subcode
      : undefined;
  if (createErr) {
    if (mediaType === "video" || mediaType === "reels") {
      console.error("[Instagram] Video create container failed:", { message: createErr, code: typeof createJson.error === "object" && createJson.error && "code" in createJson.error ? createJson.error.code : undefined, error_subcode: subcode });
    }
    return { error: createErr, error_subcode: subcode };
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

/** Known Instagram container error subcodes → user-facing message (see error-codes reference). */
const CONTAINER_ERROR_MESSAGES: Record<number, string> = {
  2207003: "Instagram took too long to download the media. Try a smaller file or a faster host.",
  2207020: "Media expired. Please try again (re-upload or re-schedule).",
  2207026: "Video format not supported. Use MP4 (H.264, AAC). Re-export or convert and try again.",
  2207052: "Instagram could not fetch the media URL. Ensure the link is public and reachable (no auth, no localhost).",
  2207053: "Upload failed. Try again or use a shorter/smaller video.",
};

/** Poll container status until FINISHED (or ERROR/EXPIRED). Returns error message or null. */
async function waitForContainerReady(
  containerId: string,
  accessToken: string,
  isVideo = false
): Promise<string | null> {
  const maxAttempts = isVideo ? CONTAINER_POLL_MAX_ATTEMPTS_VIDEO : CONTAINER_POLL_MAX_ATTEMPTS_IMAGE;
  const statusUrl = `${META_GRAPH_BASE}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`;
  let errorPayload: { status_code?: string; status?: string | number } | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(statusUrl);
    const data = (await res.json()) as { status_code?: string; status?: string | number; error?: { message: string } };
    if (data.error) return data.error.message ?? "Failed to check container status";
    const statusCode = data.status_code;
    if (statusCode === "FINISHED") return null;
    if (statusCode === "EXPIRED") return "Media container expired before publish";
    if (statusCode === "ERROR") {
      errorPayload = { status_code: data.status_code, status: data.status };
      if (isVideo && i < 3) {
        await new Promise((r) => setTimeout(r, 10000));
        continue;
      }
      const rawStatus = data.status;
      const subcode =
        typeof rawStatus === "number" ? rawStatus : typeof rawStatus === "string" ? parseInt(rawStatus, 10) : NaN;
      const msg = !Number.isNaN(subcode) ? CONTAINER_ERROR_MESSAGES[subcode] : undefined;
      const detail =
        msg ||
        (!Number.isNaN(subcode) ? "code " + subcode : "status: " + String(rawStatus ?? "unknown"));
      console.error("[Instagram] Container ERROR:", JSON.stringify(errorPayload));
      return "Media container failed (" + detail + "). Try a shorter/smaller video, re-export as MP4 (H.264, AAC), and ensure the media URL is public.";
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
  return `https://www.facebook.com/v25.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes.join(",")}&response_type=code`;
}
