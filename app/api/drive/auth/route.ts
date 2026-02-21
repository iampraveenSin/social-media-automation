import { NextRequest, NextResponse } from "next/server";
import { getDriveAuthUrl } from "@/lib/drive";

export async function GET(request: NextRequest) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin).replace(/\/+$/, "");
  const url = getDriveAuthUrl(baseUrl);
  if (!url || !process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: "Google Drive is not configured" }, { status: 503 });
  }
  return NextResponse.redirect(url);
}
