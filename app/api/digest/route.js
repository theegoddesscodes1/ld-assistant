import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { getSalesSummary } from "../../../lib/shopify";
import { RHYTHM, WORKOUT } from "../../../lib/schedule";

export const dynamic = "force-dynamic";

// One call that assembles everything the homepage and the morning/evening texts
// need, so the client isn't firing eight separate requests and stitching them
// together. Each source is wrapped so one failure never blanks the whole page.
export async function GET() {
  const dayIndex = new Date().getDay();
  const today = new Date().toISOString().slice(0, 10);

  const out = {
    date: today,
    dayIndex,
    businessFocus: RHYTHM[dayIndex],
    workout: WORKOUT[dayIndex],
  };

  // Shopify sales
  try {
    const { configured, summary } = await getSalesSummary();
    out.shopify = { configured, summary };
  } catch (e) {
    out.shopify = { configured: true, summary: null, error: String(e) };
  }

  // Fiverr — active orders only, soonest deadline first
  try {
    const clients = (await kv.get("fiverrClients")) || [];
    out.fiverrActive = clients
      .filter((c) => c.status !== "Delivered")
      .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  } catch (e) {
    out.fiverrActive = [];
  }

  // Velvet Circle — latest stat snapshot + current feature in progress
  try {
    const stats = (await kv.get("velvetStats")) || [];
    const features = (await kv.get("velvetFeatures")) || [];
    out.velvet = {
      latest: stats[0] || null,
      previous: stats[1] || null,
      currentFeature:
        features.find((f) => f.stage === "In Progress") ||
        features.find((f) => f.stage === "Planned") ||
        null,
      liveConnected: !!(await kv.get("velvetLiveConnected")),
    };
  } catch (e) {
    out.velvet = { latest: null, previous: null, currentFeature: null, liveConnected: false };
  }

  // Finances — computed totals, now including auto-pulled sources
  try {
    out.finances = await computeFinances();
  } catch (e) {
    out.finances = null;
  }

  // Fitness — streak + today's done state
  try {
    const workoutLog = (await kv.get("workoutLog")) || {};
    let streak = 0;
    let offset = 0;
    while (true) {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      const key = d.toISOString().slice(0, 10);
      if (workoutLog[key] && workoutLog[key].done) {
        streak += 1;
        offset += 1;
      } else break;
    }
    out.fitness = { streak, todayDone: !!(workoutLog[today] && workoutLog[today].done) };
  } catch (e) {
    out.fitness = { streak: 0, todayDone: false };
  }

  // Newsletter cadence
  try {
    const history = (await kv.get("newsletterHistory")) || [];
    const cadenceDays = (await kv.get("newsletterCadenceDays")) ?? 7;
    const lastSent = history[0]?.date || null;
    let daysSince = null;
    let dueStatus = "no-data";
    if (lastSent) {
      daysSince = Math.floor((Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= cadenceDays) dueStatus = "overdue";
      else if (daysSince >= cadenceDays - 2) dueStatus = "due-soon";
      else dueStatus = "ok";
    }
    out.newsletter = { lastSent, daysSince, dueStatus, cadenceDays };
  } catch (e) {
    out.newsletter = { lastSent: null, daysSince: null, dueStatus: "no-data", cadenceDays: 7 };
  }

  // Tasks
  try {
    const tasks = (await kv.get("tasks")) || [];
    out.tasks = tasks;
  } catch (e) {
    out.tasks = [];
  }

  // Latest AI suggestions (generated on a schedule, cached — see /api/suggestions)
  try {
    out.suggestions = (await kv.get("aiSuggestions")) || null;
  } catch (e) {
    out.suggestions = null;
  }

  return NextResponse.json(out);
}

// Shared so both the digest and the finances page show identical numbers.
export async function computeFinances() {
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

  // Auto: Shopify 30-day revenue (Lilac Desk)
  let shopifyRevenue = 0;
  try {
    const { summary } = await getSalesSummary();
    if (summary) {
      shopifyRevenue = summary.revenueLast30Days;
      income += shopifyRevenue;
      bySource["Lilac Desk"] += shopifyRevenue;
    }
  } catch (e) {}

  // Auto: Velvet Circle all-time revenue from latest snapshot
  let velvetRevenue = 0;
  try {
    const stats = (await kv.get("velvetStats")) || [];
    if (stats[0]?.revenueTotal != null) {
      velvetRevenue = stats[0].revenueTotal;
      income += velvetRevenue;
      bySource["Velvet Circle"] += velvetRevenue;
    }
  } catch (e) {}

  // Auto: delivered Fiverr gigs with a rate become income
  let fiverrAuto = 0;
  try {
    const clients = (await kv.get("fiverrClients")) || [];
    for (const c of clients) {
      if (c.status === "Delivered" && c.rate && !isNaN(Number(c.rate))) {
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
