import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";


export async function GET() {
  const digests = (await kv.get("researchDigests")) || [];
  return NextResponse.json({ digests });
}
