import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { logCompleted } from "../../../../lib/completedLog";

export const dynamic = "force-dynamic";

// Completing a task logs it (with its tag) to the shared activity log with
// a timestamp, then removes it from the active list — done tasks don't sit
// around with a strikethrough, they clear and live in the log instead,
// routed to the Business or Fiverr page by tag.
export async function PATCH(request, { params }) {
  const id = Number(params.id);
  const tasks = (await kv.get("tasks")) || [];
  const task = tasks.find((t) => t.id === id);
  if (!task) return NextResponse.json({ tasks }, { status: 404 });

  const updated = tasks.filter((t) => t.id !== id);
  await kv.set("tasks", updated);
  await logCompleted("task", task.text, task.tag || "Personal");

  return NextResponse.json({ tasks: updated });
}

export async function DELETE(request, { params }) {
  const id = Number(params.id);
  const tasks = (await kv.get("tasks")) || [];
  const updated = tasks.filter((t) => t.id !== id);
  await kv.set("tasks", updated);
  return NextResponse.json({ tasks: updated });
}