import { kv } from "@vercel/kv";
import webpush from "web-push";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Visit this URL directly in a browser to test push delivery end to end,
// completely independent of the cron schedule or the morning/evening time
// windows. The JSON response says exactly which layer is missing — no
// subscription saved, VAPID keys not configured, or a real delivery error.
export async function GET() {
  const subscription = await kv.get("pushSubscription");
  if (!subscription) {
    return NextResponse.json({
      sent: false,
      reason: "No push subscription saved in KV — tap 'Enable Notifications' on the homepage first.",
    });
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({
      sent: false,
      reason: "VAPID_PUBLIC_KEY and/or VAPID_PRIVATE_KEY are not set as environment variables on this deployment.",
    });
  }

  webpush.setVapidDetails(
    "mailto:hello@lilacdesk.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title: "Test notification", body: "If you see this, push delivery works end to end." })
    );
    return NextResponse.json({ sent: true, reason: "Delivered — check your device." });
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      await kv.del("pushSubscription");
      return NextResponse.json({
        sent: false,
        reason: "Subscription was expired/invalid (cleared it) — the browser unsubscribed at some point. Re-enable notifications.",
      });
    }
    return NextResponse.json({ sent: false, reason: String(err), statusCode: err.statusCode || null });
  }
}