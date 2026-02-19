import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDriveTokensFromCode } from "@/lib/drive";
import { saveDriveAccount } from "@/lib/store";

function originForLocalhost(origin: string): string {
  try {
    const u = new URL(origin);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") u.protocol = "http:";
    return u.origin;
  } catch {
    return origin;
  }
}

export async function GET(request: NextRequest) {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
  const baseUrl = originForLocalhost(raw.replace(/\/+$/, ""));
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.redirect(`${baseUrl}/login?redirect=/dashboard`);
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const googleError = searchParams.get("error");
  const googleErrorDesc = searchParams.get("error_description");

  if (!code) {
    const params = new URLSearchParams({ error: "drive_no_code" });
    if (googleError) params.set("reason", googleError);
    if (googleErrorDesc) params.set("hint", googleErrorDesc.slice(0, 150));
    return NextResponse.redirect(`${baseUrl}/dashboard?${params.toString()}`);
  }

  const tokens = await getDriveTokensFromCode(code, baseUrl);
  if (!tokens) {
    return NextResponse.redirect(`${baseUrl}/dashboard?error=drive_token_failed`);
  }

  await saveDriveAccount(session.userId, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    connectedAt: new Date().toISOString(),
  });

  return NextResponse.redirect(`${baseUrl}/dashboard?drive_connected=1`);
}
