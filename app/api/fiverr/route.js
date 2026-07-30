import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { FIVERR_STATUSES } from "../../../lib/fiverrStatus";

export const dynamic = "force-dynamic";

export async function GET() {
  const clients = (await kv.get("fiverrClients")) || [];
  return NextResponse.json({ clients }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request) {
  const { client, gigType, deadline = "", rate = "", notes = "" } = await request.json();
  if (!client || !client.trim()) {
    return NextResponse.json({ error: "client is required" }, { status: 400 });
  }
  const clients = (await kv.get("fiverrClients")) || [];
  const entry = {
    id: Date.now(),
    client: client.trim(),
    gigType: gigType || "Website Build",
    deadline,
    rate: rate.trim(),
    notes: notes.trim(),
    status: FIVERR_STATUSES[1], // "Needs Requirements" — natural starting point for a fresh inquiry
    createdDate: new Date().toISOString().slice(0, 10),
  };
  const updated = [entry, ...clients];
  await kv.set("fiverrClients", updated);
  return NextResponse.json({ clients: updated });
}