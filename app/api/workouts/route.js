import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";


export async function GET() {
  const workoutLog = (await kv.get("workoutLog")) || {};
  return NextResponse.json({ workoutLog });
}

// Body: { date: 'YYYY-MM-DD', note?: string } — toggles `done` for that date,
// or just updates the note if `noteOnly` is true.
export async function POST(request) {
  const { date, note, noteOnly = false } = await request.json();
  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }
  const workoutLog = (await kv.get("workoutLog")) || {};
  const existing = workoutLog[date] || { done: false, note: "" };

  workoutLog[date] = noteOnly
    ? { done: existing.done, note: note ?? existing.note }
    : { done: !existing.done, note: note ?? existing.note };

  await kv.set("workoutLog", workoutLog);
  return NextResponse.json({ workoutLog });
}
