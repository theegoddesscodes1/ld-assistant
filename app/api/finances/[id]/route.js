import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const id = Number(params.id);
  const transactions = (await kv.get("finances")) || [];
  const updated = transactions.filter((t) => t.id !== id);
  await kv.set("finances", updated);
  return NextResponse.json({ transactions: updated });
}
