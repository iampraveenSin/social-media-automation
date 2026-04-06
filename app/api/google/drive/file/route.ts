import { NextResponse } from "next/server";
import { createGoogleOAuth2Client } from "@/lib/google/oauth-factory";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function sanitizeFileId(id: string | null): string | null {
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return id;
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileId = sanitizeFileId(new URL(request.url).searchParams.get("id"));
  if (!fileId) {
    return NextResponse.json({ error: "Invalid file id" }, { status: 400 });
  }

  const { data: row } = await supabase
    .from("google_drive_accounts")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row?.refresh_token) {
    return NextResponse.json({ error: "Drive not connected" }, { status: 400 });
  }

  try {
    const oauth2 = createGoogleOAuth2Client();
    oauth2.setCredentials({ refresh_token: row.refresh_token });
    const { token } = await oauth2.getAccessToken();
    if (!token) {
      return NextResponse.json({ error: "No access token" }, { status: 502 });
    }

    const url = new URL(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    );
    url.searchParams.set("alt", "media");

    const upstream = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Drive file fetch failed" },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Drive proxy error" }, { status: 502 });
  }
}
