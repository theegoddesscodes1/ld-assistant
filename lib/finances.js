import { kv } from "@vercel/kv";
import { getSalesSummary } from "./shopify";
import { normalizeFiverrStatus } from "./fiverrStatus";

// Lives here rather than inside an API route so both /api/finances and
// /api/insights can use it without importing from each other.
//
// Takes an optional pre-fetched sales summary: the insights route already
// pulls one, and re-fetching it here would double the Shopify round trips
// for no reason.
export async function computeFinances(prefetchedSummary = undefined) {
  const manual = (await kv.get("finances")) || [];

  let income = 0;
  let expense = 0;
  const bySource = { "Lilac Desk": 0, Fiverr: 0, "Velvet Circle": 0 };

  for (const t of manual) {
    if (t.type === "income") {
      income += t.amount;
      if (bySource[t.business] !== undefined) bySource[t.business] += t.amount;
    } else {
      expense += t.amount;
    }
  }

  let shopifyRevenue = 0;
  try {
    const summary =
      prefetchedSummary !== undefined ? prefetchedSummary : (await getSalesSummary()).summary;
    if (summary) {
      shopifyRevenue = summary.revenueLast30Days;
      income += shopifyRevenue;
      bySource["Lilac Desk"] += shopifyRevenue;
    }
  } catch (e) {}

  let velvetRevenue = 0;
  try {
    const stats = (await kv.get("velvetStats")) || [];
    if (stats[0]?.revenueTotal != null) {
      velvetRevenue = stats[0].revenueTotal;
      income += velvetRevenue;
      bySource["Velvet Circle"] += velvetRevenue;
    }
  } catch (e) {}

  let fiverrAuto = 0;
  try {
    const clients = (await kv.get("fiverrClients")) || [];
    for (const c of clients) {
      if (normalizeFiverrStatus(c.status) === "Approved" && c.rate && !isNaN(Number(c.rate))) {
        fiverrAuto += Number(c.rate);
      }
    }
    income += fiverrAuto;
    bySource["Fiverr"] += fiverrAuto;
  } catch (e) {}

  const setAsidePercent = (await kv.get("taxSetAsidePercent")) ?? null;

  return {
    income,
    expense,
    net: income - expense,
    bySource,
    auto: { shopifyRevenue, velvetRevenue, fiverrAuto },
    setAsidePercent,
    setAside: setAsidePercent != null ? (income * setAsidePercent) / 100 : null,
  };
}