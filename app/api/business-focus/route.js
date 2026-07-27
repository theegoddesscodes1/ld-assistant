import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const log = (await kv.get("businessFocusLog")) || {};
  return NextResponse.json({ log });
}

export async function POST(request) {
  const { date } = await request.json();
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });
  const log = (await kv.get("businessFocusLog")) || {};
  log[date] = !log[date];
  await kv.set("businessFocusLog", log);
  return NextResponse.json({ log });
}
