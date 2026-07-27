import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const id = Number(params.id);
  const body = await request.json();
  const features = (await kv.get("velvetFeatures")) || [];

  const updated = features.map((f) => {
    if (f.id !== id) return f;
    let next = { ...f };
    if (typeof body.stage === "string") next.stage = body.stage;
    if (typeof body.notes === "string") next.notes = body.notes;
    if (typeof body.toggleChecklistIndex === "number") {
      next.checklist = f.checklist.map((item, i) =>
        i === body.toggleChecklistIndex ? { ...item, done: !item.done } : item
      );
    }
    if (typeof body.addChecklistItem === "string" && body.addChecklistItem.trim()) {
      next.checklist = [...f.checklist, { text: body.addChecklistItem.trim(), done: false }];
    }
    return next;
  });

  await kv.set("velvetFeatures", updated);
  return NextResponse.json({ features: updated });
}

export async function DELETE(request, { params }) {
  const id = Number(params.id);
  const features = (await kv.get("velvetFeatures")) || [];
  const updated = features.filter((f) => f.id !== id);
  await kv.set("velvetFeatures", updated);
  return NextResponse.json({ features: updated });
}
