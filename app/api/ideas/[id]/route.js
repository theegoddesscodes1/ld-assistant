import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";


export async function DELETE(request, { params }) {
  const id = Number(params.id);
  const ideas = (await kv.get("ideas")) || [];
  const updated = ideas.filter((i) => i.id !== id);
  await kv.set("ideas", updated);
  return NextResponse.json({ ideas: updated });
}
