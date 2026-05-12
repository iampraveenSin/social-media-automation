import { NextResponse } from "next/server";
import {
  loadDriveAccountForPick,
  saveDrivePickCountAfterPick,
} from "@/lib/google/drive-pick-account";
import {
  nextDrivePickRotation,
  pickRandomDrivePublishFiles,
} from "@/lib/google/drive-service";
import { fetchPublishedDriveFileIdsSet } from "@/lib/publish/fetch-published-drive-file-ids";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { refreshToken, pickCount: prevCount } = await loadDriveAccountForPick(
    supabase,
    user.id,
  );
  if (!refreshToken) {
    return NextResponse.json({ error: "Drive not connected" }, { status: 400 });
  }

  const folderId =
    new URL(request.url).searchParams.get("folderId")?.trim() || null;

  try {
    const excludeIds = await fetchPublishedDriveFileIdsSet(supabase, user.id);
    const { nextCount, forceSingle } = nextDrivePickRotation(prevCount);

    const files = await pickRandomDrivePublishFiles(
      refreshToken,
      folderId,
      {
        excludeIds,
        forceSingle,
      },
    );

    if (files.length > 0) {
      await saveDrivePickCountAfterPick(supabase, user.id, nextCount);
    }

    if (files.length === 0) {
      return NextResponse.json(
        { files: [], file: null },
        { headers: noStore },
      );
    }
    return NextResponse.json(
      {
        files,
        file: files[0] ?? null,
      },
      { headers: noStore },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Random pick failed" }, { status: 502 });
  }
}
