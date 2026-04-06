export function getMetaAppConfig(): { appId: string; appSecret: string } | null {
  const appId =
    process.env.META_APP_ID?.trim() || process.env.FACEBOOK_APP_ID?.trim();
  const appSecret =
    process.env.META_APP_SECRET?.trim() ||
    process.env.FACEBOOK_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;
  return { appId, appSecret };
}

/** Scopes for Facebook Login + Pages + Instagram publishing (requires app review for production). */
export const META_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "business_management",
  "instagram_basic",
  "instagram_content_publish",
].join(",");

export const META_GRAPH_VERSION = "v21.0";
