import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const id = Number(params.id);
  const updates = await request.json();
  const clients = (await kv.get("fiverrClients")) || [];
  const updated = clients.map((c) => (c.id === id ? { ...c, ...updates } : c));
  await kv.set("fiverrClients", updated);
  return NextResponse.json({ clients: updated });
}

export async function DELETE(request, { params }) {
  const id = Number(params.id);
  const clients = (await kv.get("fiverrClients")) || [];
  const updated = clients.filter((c) => c.id !== id);
  await kv.set("fiverrClients", updated);
  return NextResponse.json({ clients: updated });
}
