import { kv } from "@vercel/kv";
import webpush from "web-push";
import { NextResponse } from "next/server";
import { REMINDERS } from "../../../../lib/schedule";

export const dynamic = "force-dynamic";


const TZ = process.env.REMINDER_TIMEZONE || "America/New_York";
// How close (in minutes) the current time must be to a scheduled slot to
// fire it. Set this to a bit more than your cron interval so a slightly
// late cron run doesn't skip a reminder.
const TOLERANCE_MINUTES = 20;

function nowParts() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(map.weekday);
  return { day: weekdayIndex, hour: Number(map.hour), minute: Number(map.minute) };
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

  const { day, hour, minute } = nowParts();
  const nowMinutes = hour * 60 + minute;

  const due = REMINDERS.filter((r) => {
    if (r.day !== day) return false;
    const slotMinutes = r.hour * 60 + r.minute;
    return Math.abs(nowMinutes - slotMinutes) <= TOLERANCE_MINUTES;
  });

  if (due.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const subscription = await kv.get("pushSubscription");
  if (!subscription) {
    return NextResponse.json({ sent: 0, note: "no push subscription saved yet" });
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const sentLog = (await kv.get("sentReminders")) || {};
  let sentCount = 0;

  for (const reminder of due) {
    const dedupeKey = `${todayKey}-${reminder.title}`;
    if (sentLog[dedupeKey]) continue;

    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ title: reminder.title, body: reminder.body })
      );
      sentLog[dedupeKey] = true;
      sentCount += 1;
    } catch (err) {
      // A 410/404 means the browser unsubscribed — clear it so we stop trying.
      if (err.statusCode === 404 || err.statusCode === 410) {
        await kv.del("pushSubscription");
      }
    }
  }

  await kv.set("sentReminders", sentLog);
  return NextResponse.json({ sent: sentCount });
}
