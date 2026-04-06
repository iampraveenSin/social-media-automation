import { NextResponse } from "next/server";
import {
  listDriveChildren,
  sanitizeDriveFolderId,
} from "@/lib/google/drive-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row } = await supabase
    .from("google_drive_accounts")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row?.refresh_token) {
    return NextResponse.json({ error: "Drive not connected" }, { status: 400 });
  }

  const url = new URL(request.url);
  const folderId = sanitizeDriveFolderId(url.searchParams.get("folderId"));
  const pageToken = url.searchParams.get("pageToken") || undefined;

  try {
    const { files, nextPageToken } = await listDriveChildren(
      row.refresh_token,
      folderId,
      pageToken,
    );
    return NextResponse.json({ files, nextPageToken, folderId });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Drive list failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
