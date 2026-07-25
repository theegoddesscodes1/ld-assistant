import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const setAsidePercent = (await kv.get("taxSetAsidePercent")) ?? null;
  return NextResponse.json({ setAsidePercent });
}

export async function POST(request) {
  const { setAsidePercent } = await request.json();
  const value = Number(setAsidePercent);
  if (isNaN(value) || value < 0 || value > 100) {
    return NextResponse.json({ error: "setAsidePercent must be 0-100" }, { status: 400 });
  }
  await kv.set("taxSetAsidePercent", value);
  return NextResponse.json({ setAsidePercent: value });
}
