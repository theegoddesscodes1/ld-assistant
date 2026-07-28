import { kv } from "@vercel/kv";
import webpush from "web-push";
import { NextResponse } from "next/server";
import { RHYTHM, WORKOUT } from "../../../../lib/schedule";
import { normalizeFiverrStatus, FIVERR_NEXT_STEP } from "../../../../lib/fiverrStatus";
import { getSalesSummary } from "../../../../lib/shopify";

export const dynamic = "force-dynamic";

const TZ = process.env.REMINDER_TIMEZONE || "America/New_York";

function hourInTz() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === "hour");
  return Number(h.value);
}

async function activeFiverrLine() {
  try {
    const clients = (await kv.get("fiverrClients")) || [];
    const active = clients
      .map((c) => ({ ...c, status: normalizeFiverrStatus(c.status) }))
      .filter((c) => c.status !== "Approved")
      .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
    if (!active.length) return null;
    const top = active[0];
    const step = FIVERR_NEXT_STEP[top.status] || "";
    return `Fiverr: ${top.client} — ${top.status}.${step ? ` ${step}` : ""}`;
  } catch (e) {
    return null;
  }
}

async function buildMorning() {
  const dayIndex = new Date().getDay();
  const bits = [];

  bits.push(`Focus: ${RHYTHM[dayIndex].focus}.`);

  const workout = WORKOUT[dayIndex];
  if (workout.exercises.length > 0) {
    bits.push(`Workout: ${workout.focus} — ${workout.exercises.map((e) => e.name).join(", ")}.`);
  } else {
    bits.push(`Workout: ${workout.focus}.`);
  }

  try {
    const tasks = (await kv.get("tasks")) || [];
    if (tasks.length) {
      const preview = tasks.slice(0, 3).map((t) => t.text).join(", ");
      bits.push(`${tasks.length} open task${tasks.length === 1 ? "" : "s"}: ${preview}${tasks.length > 3 ? ", ..." : ""}.`);
    }
  } catch (e) {}

  const fiverrLine = await activeFiverrLine();
  if (fiverrLine) bits.push(fiverrLine);

  try {
    const s = await kv.get("aiSuggestions");
    if (s?.focusToday) bits.push(`Tip: ${s.focusToday}`);
  } catch (e) {}

  return bits.join(" ");
}

async function buildEvening() {
  const today = new Date().toISOString().slice(0, 10);
  const dayIndex = new Date().getDay();
  const tomorrowDayIndex = (dayIndex + 1) % 7;
  const bits = [];

  // Accomplishments — everything logged to the completed history today
  try {
    const log = (await kv.get("completedLog")) || [];
    const doneToday = log.filter((e) => e.completedAt.slice(0, 10) === today);
    bits.push(doneToday.length ? `Done today: ${doneToday.map((e) => e.label).join(", ")}.` : "Nothing checked off today.");
  } catch (e) {}

  // Missed — business focus / workout not marked done
  try {
    const businessFocusLog = (await kv.get("businessFocusLog")) || {};
    const workoutLog = (await kv.get("workoutLog")) || {};
    const missed = [];
    if (!businessFocusLog[today]) missed.push(RHYTHM[dayIndex].focus);
    const workout = WORKOUT[dayIndex];
    if (workout.exercises.length && !(workoutLog[today] && workoutLog[today].done)) missed.push(workout.focus);
    if (missed.length) bits.push(`Still open: ${missed.join(", ")}.`);
  } catch (e) {}

  // Today's income
  try {
    const { summary } = await getSalesSummary();
    if (summary && summary.revenueToday > 0) {
      bits.push(`Sales today: $${summary.revenueToday.toFixed(2)} (${summary.ordersToday} order${summary.ordersToday === 1 ? "" : "s"}).`);
    }
  } catch (e) {}

  const fiverrLine = await activeFiverrLine();
  if (fiverrLine) bits.push(fiverrLine);

  // Tomorrow's prep
  const tomorrowWorkout = WORKOUT[tomorrowDayIndex];
  bits.push(`Tomorrow: ${RHYTHM[tomorrowDayIndex].focus}${tomorrowWorkout.exercises.length ? ` + ${tomorrowWorkout.focus} workout` : ""}.`);

  return bits.join(" ");
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  webpush.setVapidDetails(
    "mailto:hello@lilacdesk.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const subscription = await kv.get("pushSubscription");
  if (!subscription) return NextResponse.json({ sent: 0, note: "no subscription" });

  const hour = hourInTz();
  const today = new Date().toISOString().slice(0, 10);
  const sentLog = (await kv.get("sentBriefings")) || {};

  let title, body, slot;
  // Morning window 6-11, evening window 18-22. The external trigger hits this
  // route hourly; the window + per-day dedupe keeps it to one each.
  if (hour >= 6 && hour < 12) {
    slot = "morning";
    title = "Good morning, Kerry";
    body = await buildMorning();
  } else if (hour >= 18 && hour < 23) {
    slot = "evening";
    title = "Evening check-in";
    body = await buildEvening();
  } else {
    return NextResponse.json({ sent: 0, note: "outside briefing window" });
  }

  const dedupeKey = `${today}-${slot}`;
  if (sentLog[dedupeKey]) return NextResponse.json({ sent: 0, note: "already sent this slot" });

  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
    sentLog[dedupeKey] = true;
    const keys = Object.keys(sentLog);
    if (keys.length > 30) {
      const trimmed = {};
      keys.slice(-30).forEach((k) => (trimmed[k] = sentLog[k]));
      await kv.set("sentBriefings", trimmed);
    } else {
      await kv.set("sentBriefings", sentLog);
    }
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      await kv.del("pushSubscription");
    }
    return NextResponse.json({ sent: 0, error: String(err) });
  }

  return NextResponse.json({ sent: 1, slot });
}