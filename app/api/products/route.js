import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_CHECKLIST = [
  "Concept & scope defined",
  "Cover design + cover copy",
  "Interior pages built",
  "GREAT FOR metafield written",
  "Product photos / mockups",
  "Listing copy (description, contains)",
  "Price set",
  "Published to store",
];

export async function GET() {
  const products = (await kv.get("products")) || [];
  return NextResponse.json({ products });
}

export async function POST(request) {
  const { name, notes = "" } = await request.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const products = (await kv.get("products")) || [];
  const product = {
    id: Date.now(),
    name: name.trim(),
    notes: notes.trim(),
    stage: "Idea",
    checklist: DEFAULT_CHECKLIST.map((text) => ({ text, done: false })),
    createdDate: new Date().toISOString().slice(0, 10),
  };
  const updated = [product, ...products];
  await kv.set("products", updated);
  return NextResponse.json({ products: updated });
}
