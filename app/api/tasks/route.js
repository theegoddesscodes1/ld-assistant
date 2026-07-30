import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const tasks = (await kv.get("tasks")) || [];
  return NextResponse.json({ tasks }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request) {
  const { text, category = "general", tag = "Personal" } = await request.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  const tasks = (await kv.get("tasks")) || [];
  const task = { id: Date.now(), text: text.trim(), done: false, category, tag };
  const updated = [task, ...tasks];
  await kv.set("tasks", updated);
  return NextResponse.json({ tasks: updated });
}