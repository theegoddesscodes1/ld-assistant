import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";


export async function PATCH(request, { params }) {
  const id = Number(params.id);
  const tasks = (await kv.get("tasks")) || [];
  const updated = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
  await kv.set("tasks", updated);
  return NextResponse.json({ tasks: updated });
}

export async function DELETE(request, { params }) {
  const id = Number(params.id);
  const tasks = (await kv.get("tasks")) || [];
  const updated = tasks.filter((t) => t.id !== id);
  await kv.set("tasks", updated);
  return NextResponse.json({ tasks: updated });
}
