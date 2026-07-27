import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const id = Number(params.id);
  const history = (await kv.get("velvetStats")) || [];
  const updated = history.filter((h) => h.id !== id);
  await kv.set("velvetStats", updated);
  return NextResponse.json({ history: updated });
}
