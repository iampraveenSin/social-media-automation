import { NextResponse } from "next/server";
import { getClearSessionHeader } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", getClearSessionHeader());
  return res;
}
