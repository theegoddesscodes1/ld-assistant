import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { RHYTHM, WORKOUT } from "../../../lib/schedule";
import { normalizeFiverrStatus, FIVERR_NEXT_STEP } from "../../../lib/fiverrStatus";

export const dynamic = "force-dynamic";

// FAST PATH — reads KV only, never calls Shopify.
//
// This is what every checkbox, task add, and status change re-fetches, so it
// has to come back in well under a second. It used to make up to eight
// sequential Shopify API calls, which pushed it past the serverless timeout
// and made every interaction look broken. Anything needing Shopify now lives
// in /api/insights, which the homepage loads separately and which nothing
// blocks on.
export async function GET() {
  const dayIndex = new Date().getDay();
  const today = new Date().toISOString().slice(0, 10);

  const out = {
    date: today,
    dayIndex,
    workout: WORKOUT[dayIndex],
  };

  // Everything below is a KV read — fire them together rather than in series.
  const [
    businessFocusLog,
    fiverrClients,
    velvetStats,
    velvetFeatures,
    velvetLiveConnected,
    workoutLog,
    selfcareItems,
    selfcareLog,
    healthLog,
    learning,
    newsletterHistory,
    newsletterCadence,
    newsletterTracked,
    tasks,
    suggestions,
  ] = await Promise.all([
    kv.get("businessFocusLog").catch(() => null),
    kv.get("fiverrClients").catch(() => null),
    kv.get("velvetStats").catch(() => null),
    kv.get("velvetFeatures").catch(() => null),
    kv.get("velvetLiveConnected").catch(() => null),
    kv.get("workoutLog").catch(() => null),
    kv.get("selfcareItems").catch(() => null),
    kv.get("selfcareLog").catch(() => null),
    kv.get("healthLog").catch(() => null),
    kv.get("learning").catch(() => null),
    kv.get("newsletterHistory").catch(() => null),
    kv.get("newsletterCadenceDays").catch(() => null),
    kv.get("newsletterTracked").catch(() => null),
    kv.get("tasks").catch(() => null),
    kv.get("aiSuggestions").catch(() => null),
  ]);

  // Today's business focus + whether it's already marked done
  out.businessFocus = { ...RHYTHM[dayIndex], done: !!(businessFocusLog || {})[today] };

  // Fiverr — active list with legacy statuses normalized, plus the single
  // most urgent one for the homepage priority card
  const active = (fiverrClients || [])
    .map((c) => ({ ...c, status: normalizeFiverrStatus(c.status) }))
    .filter((c) => c.status !== "Approved")
    .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  out.fiverrActive = active;
  out.fiverrPriority = active[0]
    ? { ...active[0], nextStep: FIVERR_NEXT_STEP[active[0].status] || "" }
    : null;

  // Velvet Circle
  const stats = velvetStats || [];
  const features = velvetFeatures || [];
  out.velvet = {
    latest: stats[0] || null,
    previous: stats[1] || null,
    currentFeature:
      features.find((f) => f.stage === "In Progress") ||
      features.find((f) => f.stage === "Planned") ||
      null,
    liveConnected: !!velvetLiveConnected,
  };

  // Fitness — streak + today's state
  const wLog = workoutLog || {};
  let streak = 0;
  let offset = 0;
  while (true) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const key = d.toISOString().slice(0, 10);
    if (wLog[key] && wLog[key].done) {
      streak += 1;
      offset += 1;
    } else break;
  }
  out.fitness = { streak, todayDone: !!(wLog[today] && wLog[today].done) };

  // Growth — self-care routine %, today's health log, learning in progress
  const routineItems = selfcareItems || [];
  const doneToday = new Set((selfcareLog || {})[today] || []);
  out.growth = {
    routinePct: routineItems.length ? Math.round((doneToday.size / routineItems.length) * 100) : null,
    routineDone: doneToday.size,
    routineTotal: routineItems.length,
    healthToday: (healthLog || {})[today] || null,
    learningInProgress: (learning || []).filter((l) => l.status === "In Progress").length,
  };

  // Newsletter cadence — target is 1-2x/month (~every 15 days). The tracked
  // campaign's live performance is added by /api/insights, since that needs
  // Shopify.
  const history = newsletterHistory || [];
  const cadenceDays = newsletterCadence ?? 15;
  const lastSent = history[0]?.date || null;
  let daysSince = null;
  let dueStatus = "no-data";
  if (lastSent) {
    daysSince = Math.floor((Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= cadenceDays) dueStatus = "overdue";
    else if (daysSince >= cadenceDays - 3) dueStatus = "due-soon";
    else dueStatus = "ok";
  }
  out.newsletter = {
    lastSent,
    daysSince,
    dueStatus,
    cadenceDays,
    lastSubject: history[0]?.subject || null,
    tracked: newsletterTracked || null,
  };

  out.tasks = tasks || [];
  out.suggestions = suggestions || null;

  return NextResponse.json(out, { headers: { "Cache-Control": "no-store, max-age=0" } });
}