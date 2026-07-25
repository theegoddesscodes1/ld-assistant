import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = (await kv.get("learning")) || [];
  return NextResponse.json({ items });
}

export async function POST(request) {
  const { title, type = "Book", notes = "" } = await request.json();
  if (!title || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const items = (await kv.get("learning")) || [];
  const entry = {
    id: Date.now(),
    title: title.trim(),
    type,
    notes: notes.trim(),
    status: "Want to",
    date: new Date().toISOString().slice(0, 10),
  };
  const updated = [entry, ...items];
  await kv.set("learning", updated);
  return NextResponse.json({ items: updated });
}
