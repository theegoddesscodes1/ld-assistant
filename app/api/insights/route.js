import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import {
  getSalesSummary,
  getInventoryAlerts,
  getAbandonedCheckoutSummary,
  getProductsSince,
  getCampaignAttributedOrders,
} from "../../../lib/shopify";
import { computeFinances } from "../../../lib/finances";

export const dynamic = "force-dynamic";

// SLOW PATH — everything that needs Shopify.
//
// Split out of /api/digest because those calls were being made in series on
// every single UI action, which blew past the serverless timeout. Nothing
// interactive waits on this: the homepage loads it separately and fills in
// the numbers when they arrive.
//
// The calls that don't depend on each other run together via Promise.all,
// and the sales summary is fetched exactly once and handed to
// computeFinances rather than being fetched twice.
export async function GET() {
  const out = {};

  const [newsletterHistory, tracked] = await Promise.all([
    kv.get("newsletterHistory").catch(() => null),
    kv.get("newsletterTracked").catch(() => null),
  ]);

  const lastSent = (newsletterHistory || [])[0]?.date || null;
  const productsSince = lastSent
    ? new Date(lastSent).toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [salesResult, inventoryAlerts, abandonedCheckouts, newProducts, campaignPerf] =
    await Promise.all([
      getSalesSummary().catch((e) => ({ configured: true, summary: null, error: String(e) })),
      getInventoryAlerts().catch(() => []),
      getAbandonedCheckoutSummary().catch(() => ({ count: 0, value: 0 })),
      getProductsSince(productsSince).catch(() => []),
      tracked
        ? getCampaignAttributedOrders(tracked.utmCampaign, tracked.sentAt).catch(() => null)
        : Promise.resolve(null),
    ]);

  out.shopify = { configured: salesResult.configured, summary: salesResult.summary };
  if (salesResult.error) out.shopify.error = salesResult.error;
  out.inventoryAlerts = inventoryAlerts;
  out.abandonedCheckouts = abandonedCheckouts;
  out.newsletterExtras = {
    newProducts,
    trackedPerformance: campaignPerf,
  };

  // Reuses the summary already fetched above — no second Shopify round trip.
  try {
    out.finances = await computeFinances(salesResult.summary);
  } catch (e) {
    out.finances = null;
  }

  return NextResponse.json(out, { headers: { "Cache-Control": "no-store, max-age=0" } });
}