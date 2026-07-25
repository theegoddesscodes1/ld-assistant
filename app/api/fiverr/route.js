import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const clients = (await kv.get("fiverrClients")) || [];
  return NextResponse.json({ clients });
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
    status: "Inquiry",
    createdDate: new Date().toISOString().slice(0, 10),
  };
  const updated = [entry, ...clients];
  await kv.set("fiverrClients", updated);
  return NextResponse.json({ clients: updated });
}
