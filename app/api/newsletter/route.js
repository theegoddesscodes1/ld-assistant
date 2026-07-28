import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_CADENCE_DAYS = 15; // 1-2x/month

export async function GET() {
  const history = (await kv.get("newsletterHistory")) || [];
  const cadenceDays = (await kv.get("newsletterCadenceDays")) ?? DEFAULT_CADENCE_DAYS;
  const lastSent = history[0]?.date || null;

  let daysSinceLastSend = null;
  let dueStatus = "no-data"; // 'ok' | 'due-soon' | 'overdue' | 'no-data'
  if (lastSent) {
    daysSinceLastSend = Math.floor((Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastSend >= cadenceDays) dueStatus = "overdue";
    else if (daysSinceLastSend >= cadenceDays - 3) dueStatus = "due-soon";
    else dueStatus = "ok";
  }

  return NextResponse.json({ history, cadenceDays, lastSent, daysSinceLastSend, dueStatus });
}

// action: 'logSend' | 'setCadence'
export async function POST(request) {
  const body = await request.json();

  if (body.action === "logSend") {
    const history = (await kv.get("newsletterHistory")) || [];
    const entry = { date: new Date().toISOString().slice(0, 10), subject: (body.subject || "").trim() };
    const updated = [entry, ...history].slice(0, 50);
    await kv.set("newsletterHistory", updated);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "setCadence" && Number.isFinite(Number(body.days))) {
    await kv.set("newsletterCadenceDays", Number(body.days));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}