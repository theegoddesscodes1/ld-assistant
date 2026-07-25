import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const log = (await kv.get("healthLog")) || {};
  return NextResponse.json({ log });
}

export async function POST(request) {
  const { date, sleepHours, waterGlasses, restDay, note } = await request.json();
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

  const log = (await kv.get("healthLog")) || {};
  const existing = log[date] || {};
  log[date] = {
    sleepHours: sleepHours !== undefined ? sleepHours : existing.sleepHours,
    waterGlasses: waterGlasses !== undefined ? waterGlasses : existing.waterGlasses,
    restDay: restDay !== undefined ? restDay : existing.restDay,
    note: note !== undefined ? note : existing.note,
  };
  await kv.set("healthLog", log);
  return NextResponse.json({ log });
}
