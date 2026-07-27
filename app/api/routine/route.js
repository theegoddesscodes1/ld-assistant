import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_ITEMS = ["Morning skincare", "Evening skincare", "Hair care"];

export async function GET() {
  let items = await kv.get("selfcareItems");
  if (!items) {
    items = DEFAULT_ITEMS;
    await kv.set("selfcareItems", items);
  }
  const log = (await kv.get("selfcareLog")) || {};
  return NextResponse.json({ items, log });
}

// action: 'addItem' | 'removeItem' | 'toggle'
export async function POST(request) {
  const body = await request.json();
  let items = (await kv.get("selfcareItems")) || DEFAULT_ITEMS;
  let log = (await kv.get("selfcareLog")) || {};

  if (body.action === "addItem" && body.text?.trim()) {
    items = [...items, body.text.trim()];
    await kv.set("selfcareItems", items);
  } else if (body.action === "removeItem" && body.text) {
    items = items.filter((i) => i !== body.text);
    await kv.set("selfcareItems", items);
  } else if (body.action === "toggle" && body.date && body.item) {
    const dayList = new Set(log[body.date] || []);
    if (dayList.has(body.item)) dayList.delete(body.item);
    else dayList.add(body.item);
    log = { ...log, [body.date]: [...dayList] };
    await kv.set("selfcareLog", log);
  }

  return NextResponse.json({ items, log });
}
