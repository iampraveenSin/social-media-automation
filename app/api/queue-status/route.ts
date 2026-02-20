import { NextResponse } from "next/server";
import { isQueueAvailable } from "@/lib/queue";

export async function GET() {
  try {
    const ok = await isQueueAvailable();
    return NextResponse.json({ redisOk: ok });
  } catch {
    return NextResponse.json({ redisOk: false });
  }
}
