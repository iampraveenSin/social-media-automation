import { NextRequest, NextResponse } from "next/server";
import { getInstagramLoginUrl } from "@/lib/instagram";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
  const url = getInstagramLoginUrl(baseUrl);
  if (!url || !process.env.META_APP_ID) {
    return NextResponse.json(
      { error: "Instagram login not configured. Set META_APP_ID and META_APP_SECRET." },
      { status: 503 }
    );
  }
  return NextResponse.redirect(url);
}
