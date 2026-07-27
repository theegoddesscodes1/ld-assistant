import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const id = Number(params.id);
  const campaigns = (await kv.get("campaigns")) || [];
  const updated = campaigns.filter((c) => c.id !== id);
  await kv.set("campaigns", updated);
  return NextResponse.json({ campaigns: updated });
}
