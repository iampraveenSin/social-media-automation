import { google } from "googleapis";
import { getAppUrl } from "@/lib/env/app-url";
import { getGoogleClientConfig } from "@/lib/env/google";

export function createGoogleOAuth2Client() {
  const config = getGoogleClientConfig();
  if (!config) {
    throw new Error("Google OAuth is not configured.");
  }
  const redirectUri = `${getAppUrl()}/api/google/callback`;
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    redirectUri,
  );
}
