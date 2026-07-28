import { kv } from "@vercel/kv";

const KEY = "completedLog";
const MAX_ENTRIES = 500; // keep it from growing forever

// One log for everything that gets completed — a task, today's business
// focus, a workout, or a Fiverr order — so the Business/Fiverr pages can
// each show their own slice of a single timestamped history. `tag` is
// only meaningful for tasks (Lilac Desk / Fiverr / Personal); other types
// route by `type` instead.
export async function logCompleted(type, label, tag = null) {
  const log = (await kv.get(KEY)) || [];
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    label,
    tag,
    completedAt: new Date().toISOString(),
  };
  const updated = [entry, ...log].slice(0, MAX_ENTRIES);
  await kv.set(KEY, updated);
  return entry;
}

// Removes the single most recent entry matching type+label — used when a
// toggle flips back to "not done" (business focus / workout can un-toggle;
// tasks and Fiverr orders never call this since completing them is one-way).
export async function unlogCompleted(type, label) {
  const log = (await kv.get(KEY)) || [];
  const idx = log.findIndex((e) => e.type === type && e.label === label);
  if (idx === -1) return;
  await kv.set(KEY, [...log.slice(0, idx), ...log.slice(idx + 1)]);
}

export async function getCompletedLog() {
  return (await kv.get(KEY)) || [];
}