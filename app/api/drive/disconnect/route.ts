import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { saveDriveAccount } from "@/lib/store";

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await saveDriveAccount(session.userId, null);
  return NextResponse.json({ ok: true });
}
