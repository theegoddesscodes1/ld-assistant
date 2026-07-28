import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { shopifyGraphQL, shopifyConfigured } from "../../../../lib/shopify";

export const dynamic = "force-dynamic";

// Polls Shopify Email's marketing-activity data for a new send, so the
// homepage never needs a manual "mark as sent" toggle. Needs its own
// cron-job.org entry pointed at this route (daily is plenty) — it isn't
// wired into the briefing cron since they run on different schedules.
//
// Caveat, in the open: Shopify's own community forum has reports of this
// specific data (marketing/email campaign activity) failing to return for
// third-party apps via both REST and GraphQL. Written defensively so a bad
// or empty response just means "nothing detected" this run, never a crash
// — but treat this endpoint as unverified until it's been watched fire
// against a real send.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!shopifyConfigured()) return NextResponse.json({ detected: false, note: "shopify not configured" });

  try {
    const query = `{
      marketingActivities(first: 20) {
        nodes { id title tactic status updatedAt }
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
      return NextResponse.json({ detected: false });
    }

    const mostRecent = emailSends[0];
    const seenIds = (await kv.get("newsletterSeenActivityIds")) || [];
    if (seenIds.includes(mostRecent.id)) {
      return NextResponse.json({ detected: false, note: "already logged" });
    }

    // New send detected — log it exactly like a manual "mark as sent" would.
    const history = (await kv.get("newsletterHistory")) || [];
    const entry = { date: new Date().toISOString().slice(0, 10), subject: mostRecent.title || "" };
    await kv.set("newsletterHistory", [entry, ...history].slice(0, 50));
    await kv.set("newsletterSeenActivityIds", [mostRecent.id, ...seenIds].slice(0, 50));

    return NextResponse.json({ detected: true, subject: mostRecent.title });
  } catch (e) {
    return NextResponse.json({ detected: false, error: String(e) });
  }
}