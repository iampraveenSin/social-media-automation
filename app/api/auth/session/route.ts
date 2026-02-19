import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getUserById } from "@/lib/store";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ loggedIn: false });
  }
  const user = await getUserById(session.userId);
  return NextResponse.json({
    loggedIn: true,
    userId: session.userId,
    email: user?.email ?? null,
  });
}
