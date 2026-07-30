import { NextResponse } from "next/server";
import { getCompletedLog } from "../../../lib/completedLog";

export const dynamic = "force-dynamic";

export async function GET() {
  const log = await getCompletedLog();
  return NextResponse.json({ log }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}