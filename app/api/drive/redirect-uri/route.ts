import { NextRequest, NextResponse } from "next/server";
import { getRedirectUri } from "@/lib/drive";

/**
 * Returns the exact redirect_uri this app sends to Google for the current request.
 * Use this to copy-paste into Google Cloud Console → APIs & Services → Credentials
 * → your OAuth 2.0 Client → Authorized redirect URIs.
 * Open your app (localhost or production URL), then
 * visit this endpoint to get the URI to add.
 */
export async function GET(request: NextRequest) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin).replace(/\/+$/, "");
  const redirectUri = getRedirectUri(baseUrl);
  return NextResponse.json({
    redirectUri,
    hint: "Add this exact URI to Google Cloud Console → Credentials → OAuth 2.0 Client → Authorized redirect URIs",
  });
}
