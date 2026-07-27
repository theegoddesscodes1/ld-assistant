import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The Velvet Circle app (once it's live) POSTs its real numbers here on its own
// schedule — no manual logging. Protected by a shared secret so only your app can
// write. Set VELVET_INGEST_SECRET in env, and have the app send it as:
//   Authorization: Bearer <VELVET_INGEST_SECRET>
//
// Body: { "totalUsers": <number>, "revenueTotal": <number> }
//
// Each POST is stored as a dated snapshot, so the dashboard's period-over-period
// deltas work automatically. If it POSTs multiple times a day, we replace that
// day's snapshot rather than piling up duplicates.
export async function POST(request) {
  const secret = process.env.VELVET_INGEST_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { totalUsers, revenueTotal } = body;
  if (totalUsers === undefined && revenueTotal === undefined) {
    return NextResponse.json({ error: "totalUsers or revenueTotal required" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const history = (await kv.get("velvetStats")) || [];

  // Replace today's snapshot if one exists, else prepend a new one.
  const withoutToday = history.filter((h) => h.date !== today);
  const entry = {
    id: Date.now(),
    date: today,
    totalUsers: totalUsers !== undefined ? Number(totalUsers) : null,
    revenueTotal: revenueTotal !== undefined ? Number(revenueTotal) : null,
    note: "auto",
    source: "auto",
  };
  const updated = [entry, ...withoutToday];

  await kv.set("velvetStats", updated);
  await kv.set("velvetLiveConnected", true);

  return NextResponse.json({ ok: true, stored: entry });
}

// Lets the dashboard show "live feed connected" vs "waiting for first data".
export async function GET() {
  const connected = !!(await kv.get("velvetLiveConnected"));
  const history = (await kv.get("velvetStats")) || [];
  const lastAuto = history.find((h) => h.source === "auto") || null;
  return NextResponse.json({ connected, lastAuto });
}
