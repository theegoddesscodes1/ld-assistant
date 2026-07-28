import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { logCompleted, unlogCompleted } from "../../../lib/completedLog";

export const dynamic = "force-dynamic";

export async function GET() {
  const workoutLog = (await kv.get("workoutLog")) || {};
  return NextResponse.json({ workoutLog });
}

// Body: { date: 'YYYY-MM-DD', note?: string, focus?: string, noteOnly?: bool }
// Toggles `done` for that date, or just updates the note if `noteOnly` is
// true. `focus` (the workout name) is only used to label the completed log.
export async function POST(request) {
  const { date, note, noteOnly = false, focus } = await request.json();
  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }
  const workoutLog = (await kv.get("workoutLog")) || {};
  const existing = workoutLog[date] || { done: false, note: "" };
  const nowDone = noteOnly ? existing.done : !existing.done;

  workoutLog[date] = { done: nowDone, note: note ?? existing.note };
  await kv.set("workoutLog", workoutLog);

  if (!noteOnly && focus) {
    if (nowDone) await logCompleted("workout", focus);
    else await unlogCompleted("workout", focus);
  }

  return NextResponse.json({ workoutLog });
}