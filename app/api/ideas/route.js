import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";


export async function GET() {
  const ideas = (await kv.get("ideas")) || [];
  return NextResponse.json({ ideas });
}

export async function POST(request) {
  const { title, note = "", category = "Other" } = await request.json();
  if (!title || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const ideas = (await kv.get("ideas")) || [];
  const idea = {
    id: Date.now(),
    title: title.trim(),
    note: note.trim(),
    category,
    date: new Date().toISOString().slice(0, 10),
    source: "manual",
  };
  const updated = [idea, ...ideas];
  await kv.set("ideas", updated);
  return NextResponse.json({ ideas: updated });
}
