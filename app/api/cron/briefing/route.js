import { kv } from "@vercel/kv";
import webpush from "web-push";
import { NextResponse } from "next/server";
import { RHYTHM, WORKOUT } from "../../../../lib/schedule";

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

async function buildMorning() {
  const dayIndex = new Date().getDay();
  const today = new Date().toISOString().slice(0, 10);
  const bits = [];

  bits.push(`Focus: ${RHYTHM[dayIndex].focus}.`);

  const workout = WORKOUT[dayIndex];
  if (workout.exercises.length > 0) {
    bits.push(`Workout: ${workout.focus} — ${workout.exercises.map((e) => e.name).join(", ")}.`);
  } else {
    bits.push(`Workout: ${workout.focus}.`);
  }

  // Active Fiverr deadlines
  try {
    const clients = (await kv.get("fiverrClients")) || [];
    const active = clients
      .filter((c) => c.status !== "Delivered")
      .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
    const dueToday = active.filter((c) => c.deadline === today);
    if (dueToday.length) {
      bits.push(`Due today: ${dueToday.map((c) => c.client).join(", ")}.`);
    } else if (active[0]?.deadline) {
      bits.push(`Next Fiverr: ${active[0].client} due ${active[0].deadline}.`);
    }
  } catch (e) {}

  // Top AI focus for the day
  try {
    const s = await kv.get("aiSuggestions");
    if (s?.focusToday) bits.push(`Tip: ${s.focusToday}`);
  } catch (e) {}

  return bits.join(" ");
}

async function buildEvening() {
  const today = new Date().toISOString().slice(0, 10);
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

  const doneToday = !!(workoutLog[today] && workoutLog[today].done);

  if (streak > 0 && doneToday) {
    return `${streak}-day streak and counting. You showed up today — that consistency is exactly how the goals get hit. Rest up.`;
  }
  if (streak > 0 && !doneToday) {
    return `You're on a ${streak}-day streak — don't let today be the break in it. Even a short session keeps it alive.`;
  }
  return "A fresh start tomorrow. One workout gets the streak going again — you've got this.";
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
    // keep the log from growing forever
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
