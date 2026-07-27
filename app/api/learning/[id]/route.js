import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const id = Number(params.id);
  const { status } = await request.json();
  const items = (await kv.get("learning")) || [];
  const updated = items.map((i) => (i.id === id ? { ...i, status } : i));
  await kv.set("learning", updated);
  return NextResponse.json({ items: updated });
}

export async function DELETE(request, { params }) {
  const id = Number(params.id);
  const items = (await kv.get("learning")) || [];
  const updated = items.filter((i) => i.id !== id);
  await kv.set("learning", updated);
  return NextResponse.json({ items: updated });
}
