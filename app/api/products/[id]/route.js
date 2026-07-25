import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const id = Number(params.id);
  const body = await request.json();
  const products = (await kv.get("products")) || [];

  const updated = products.map((p) => {
    if (p.id !== id) return p;
    let next = { ...p };
    if (typeof body.stage === "string") next.stage = body.stage;
    if (typeof body.notes === "string") next.notes = body.notes;
    if (typeof body.toggleChecklistIndex === "number") {
      next.checklist = p.checklist.map((item, i) =>
        i === body.toggleChecklistIndex ? { ...item, done: !item.done } : item
      );
    }
    if (typeof body.addChecklistItem === "string" && body.addChecklistItem.trim()) {
      next.checklist = [...p.checklist, { text: body.addChecklistItem.trim(), done: false }];
    }
    return next;
  });

  await kv.set("products", updated);
  return NextResponse.json({ products: updated });
}

export async function DELETE(request, { params }) {
  const id = Number(params.id);
  const products = (await kv.get("products")) || [];
  const updated = products.filter((p) => p.id !== id);
  await kv.set("products", updated);
  return NextResponse.json({ products: updated });
}
