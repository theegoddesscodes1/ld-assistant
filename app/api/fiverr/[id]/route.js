import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { logCompleted } from "../../../../lib/completedLog";
import { isFiverrComplete } from "../../../../lib/fiverrStatus";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const id = Number(params.id);
  const updates = await request.json();
  const clients = (await kv.get("fiverrClients")) || [];
  const existing = clients.find((c) => c.id === id);
  const updated = clients.map((c) => (c.id === id ? { ...c, ...updates } : c));
  await kv.set("fiverrClients", updated);

  // Reaching "Approved" is a completion — log it like anything else that
  // gets checked off, so it shows up in the Fiverr page's history too.
  if (updates.status && existing && isFiverrComplete(updates.status) && !isFiverrComplete(existing.status)) {
    await logCompleted("fiverr", existing.client);
  }

  return NextResponse.json({ clients: updated });
}

export async function DELETE(request, { params }) {
  const id = Number(params.id);
  const clients = (await kv.get("fiverrClients")) || [];
  const updated = clients.filter((c) => c.id !== id);
  await kv.set("fiverrClients", updated);
  return NextResponse.json({ clients: updated });
}