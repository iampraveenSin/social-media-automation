import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getSessionCookieHeader, verifyPassword } from "@/lib/auth";
import { getUserByEmail } from "@/lib/store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = (body.email as string)?.trim()?.toLowerCase();
  const password = body.password as string;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = createSessionToken(user.id);
  const secure =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https" ||
    (typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL.startsWith("https"));
  const res = NextResponse.json({ ok: true, userId: user.id });
  res.headers.set("Set-Cookie", getSessionCookieHeader(token, secure));
  return res;
}
