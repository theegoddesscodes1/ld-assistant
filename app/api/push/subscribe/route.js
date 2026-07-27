import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";


// This is a single-user app, so we just keep one subscription (the latest
// browser/device that enabled notifications). If you want reminders on more
// than one device, this would need to become a list keyed by subscription
// endpoint instead of a single value.
export async function POST(request) {
  const subscription = await request.json();
  if (!subscription || !subscription.endpoint) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }
  await kv.set("pushSubscription", subscription);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await kv.del("pushSubscription");
  return NextResponse.json({ ok: true });
}
