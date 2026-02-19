import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createSessionToken, getSessionCookieHeader, hashPassword } from "@/lib/auth";
import { getUserByEmail, createUser } from "@/lib/store";
import type { User } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email as string)?.trim()?.toLowerCase();
    const password = body.password as string;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const user: User = {
      id: uuidv4(),
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    await createUser(user);

    const token = createSessionToken(user.id);
    const secure =
      request.nextUrl.protocol === "https:" ||
      request.headers.get("x-forwarded-proto") === "https" ||
      (typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL.startsWith("https"));
    const res = NextResponse.json({ ok: true, userId: user.id });
    res.headers.set("Set-Cookie", getSessionCookieHeader(token, secure));
    return res;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[signup] Error:", err.message, err);
    let message = err.message;
    if (typeof err.message === "string" && err.message.includes("relation") && err.message.includes("does not exist")) {
      message = "Database not set up. Run the Supabase migration (see README) or remove SUPABASE_URL to use file storage.";
    }
    if (err.message === "Supabase not configured" && process.env.VERCEL) {
      message = "Server storage not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel env, run the migration, then redeploy.";
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
