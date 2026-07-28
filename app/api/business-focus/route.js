import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { logCompleted, unlogCompleted } from "../../../lib/completedLog";

export const dynamic = "force-dynamic";

export async function GET() {
  const log = (await kv.get("businessFocusLog")) || {};
  return NextResponse.json({ log });
}

// Body: { date: 'YYYY-MM-DD', focus?: string } — focus is only needed to
// label the completed-log entry; the done/not-done state itself lives
// keyed by date regardless.
export async function POST(request) {
  const { date, focus } = await request.json();
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

  const log = (await kv.get("businessFocusLog")) || {};
  const nowDone = !log[date];
  log[date] = nowDone;
  await kv.set("businessFocusLog", log);

  if (focus) {
    if (nowDone) await logCompleted("businessFocus", focus);
    else await unlogCompleted("businessFocus", focus);
  }

  return NextResponse.json({ log });
}