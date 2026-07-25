import { NextResponse } from "next/server";
import { getSalesSummary } from "../../../lib/shopify";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getSalesSummary();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ configured: true, summary: null, error: String(err) }, { status: 500 });
  }
}
