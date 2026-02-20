import { NextResponse } from "next/server";

/** Temporary debug route — does not expose full Redis URL (only first 20 chars). */
export async function GET() {
  return NextResponse.json({
    hasRedisUrl: !!process.env.REDIS_URL,
    redisUrlValue: process.env.REDIS_URL?.slice(0, 20) ?? null,
  });
}
