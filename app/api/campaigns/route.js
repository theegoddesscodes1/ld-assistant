import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const campaigns = (await kv.get("campaigns")) || [];
  return NextResponse.json({ campaigns });
}

export async function POST(request) {
  const { name, platform, utmCampaign = "", notes = "" } = await request.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const campaigns = (await kv.get("campaigns")) || [];
  const campaign = {
    id: Date.now(),
    name: name.trim(),
    platform: platform || "Other",
    utmCampaign: utmCampaign.trim(),
    notes: notes.trim(),
    date: new Date().toISOString().slice(0, 10),
  };
  const updated = [campaign, ...campaigns];
  await kv.set("campaigns", updated);
  return NextResponse.json({ campaigns: updated });
}
