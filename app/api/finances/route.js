import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const transactions = (await kv.get("finances")) || [];
  return NextResponse.json({ transactions });
}

export async function POST(request) {
  const { type, business, amount, category, note = "", date } = await request.json();
  if (!type || !amount || isNaN(Number(amount))) {
    return NextResponse.json({ error: "type and a numeric amount are required" }, { status: 400 });
  }
  const transactions = (await kv.get("finances")) || [];
  const entry = {
    id: Date.now(),
    type, // 'income' | 'expense'
    business: business || "Lilac Desk",
    amount: Number(amount),
    category: category || "Other",
    note: note.trim(),
    date: date || new Date().toISOString().slice(0, 10),
  };
  const updated = [entry, ...transactions];
  await kv.set("finances", updated);
  return NextResponse.json({ transactions: updated });
}
