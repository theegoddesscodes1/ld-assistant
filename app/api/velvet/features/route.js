import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const features = (await kv.get("velvetFeatures")) || [];
  return NextResponse.json({ features });
}

export async function POST(request) {
  const { name, notes = "" } = await request.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const features = (await kv.get("velvetFeatures")) || [];
  const feature = {
    id: Date.now(),
    name: name.trim(),
    notes: notes.trim(),
    stage: "Planned",
    checklist: [],
    createdDate: new Date().toISOString().slice(0, 10),
  };
  const updated = [feature, ...features];
  await kv.set("velvetFeatures", updated);
  return NextResponse.json({ features: updated });
}
