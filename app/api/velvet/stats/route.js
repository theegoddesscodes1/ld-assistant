import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const history = (await kv.get("velvetStats")) || [];
  return NextResponse.json({ history });
}

export async function POST(request) {
  const { totalUsers, revenueTotal, note = "" } = await request.json();
  if (totalUsers === undefined && revenueTotal === undefined) {
    return NextResponse.json({ error: "totalUsers or revenueTotal is required" }, { status: 400 });
  }
  const history = (await kv.get("velvetStats")) || [];
  const entry = {
    id: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    totalUsers: totalUsers !== undefined ? Number(totalUsers) : null,
    revenueTotal: revenueTotal !== undefined ? Number(revenueTotal) : null,
    note: note.trim(),
  };
  const updated = [entry, ...history];
  await kv.set("velvetStats", updated);
  return NextResponse.json({ history: updated });
}
