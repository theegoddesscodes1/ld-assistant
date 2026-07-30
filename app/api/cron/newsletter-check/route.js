import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { shopifyGraphQL, shopifyConfigured } from "../../../../lib/shopify";

export const dynamic = "force-dynamic";

// Tracks whichever Shopify Email campaign is the most recent — not just a
// one-time "did a new one go out" flag. Every run: find the latest email
// send, compare it against whichever one we're currently tracking
// (newsletterTracked in KV), and switch to the new one only if it's
// actually different. Until a newer campaign appears, the tracked one
// stays the same — that's what "keep tracking this one" means here.
//
// Needs its own cron-job.org entry pointed at this route (daily is plenty)
// — separate schedule from the morning/night briefing cron.
//
// Caveat, in the open: Shopify's own community forum has reports of this
// specific data (marketing/email campaign activity) failing to return for
// third-party apps via both REST and GraphQL. Written defensively so a bad
// or empty response just means "nothing new detected" this run, never a
// crash — but treat this endpoint as unverified until it's been watched
// fire against a real send.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!shopifyConfigured()) return NextResponse.json({ changed: false, note: "shopify not configured" });

  try {
    const query = `{
      marketingActivities(first: 20) {
        nodes { id title tactic status updatedAt utmParameters { campaign } }
      }
    }`;
    const data = await shopifyGraphQL(query);
    const activities = (data?.marketingActivities?.nodes || [])
      .slice()
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const emailSends = activities.filter(
      (a) =>
        (a.tactic === "NEWSLETTER" || (a.title || "").toLowerCase().includes("email")) &&
        (a.status === "ACTIVE" || a.status === "COMPLETE" || a.status === "COMPLETED")
    );

    if (emailSends.length === 0) {
      return NextResponse.json({ changed: false, note: "no email sends found" });
    }

    const latest = emailSends[0];
    const tracked = await kv.get("newsletterTracked");

    if (tracked && tracked.id === latest.id) {
      return NextResponse.json({ changed: false, note: "still tracking the same campaign", tracking: tracked.title });
    }

    // A newer campaign — switch tracking to it and log the send.
    const nowTracked = {
      id: latest.id,
      title: latest.title || "",
      utmCampaign: latest.utmParameters?.campaign || null,
      sentAt: new Date().toISOString(),
    };
    await kv.set("newsletterTracked", nowTracked);

    const history = (await kv.get("newsletterHistory")) || [];
    const entry = { date: new Date().toISOString().slice(0, 10), subject: latest.title || "" };
    await kv.set("newsletterHistory", [entry, ...history].slice(0, 50));

    return NextResponse.json({ changed: true, nowTracking: latest.title });
  } catch (e) {
    return NextResponse.json({ changed: false, error: String(e) });
  }
}