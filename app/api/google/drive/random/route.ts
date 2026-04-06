import { NextResponse } from "next/server";
import { pickRandomDriveMedia } from "@/lib/google/drive-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
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

  try {
    const file = await pickRandomDriveMedia(row.refresh_token);
    if (!file) {
      return NextResponse.json({ file: null });
    }
    return NextResponse.json({ file });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Random pick failed" }, { status: 502 });
  }
}
