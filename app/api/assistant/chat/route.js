import { kv } from "@vercel/kv";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getSalesSummary, getCatalogTitles } from "../../../../lib/shopify";
import { RHYTHM, WORKOUT } from "../../../../lib/schedule";

export const dynamic = "force-dynamic";

async function buildContext() {
  const dayIndex = new Date().getDay();
  const parts = [];

  parts.push(`Today's business focus: ${RHYTHM[dayIndex].focus} — ${RHYTHM[dayIndex].detail}`);
  parts.push(`Today's workout focus: ${WORKOUT[dayIndex].focus}`);

  try {
    const { configured, summary } = await getSalesSummary();
    if (configured && summary) {
      parts.push(
        `Shopify sales — last 7 days: $${summary.revenueLast7Days.toFixed(2)} across ${summary.ordersLast7Days} orders. ` +
          `Last 30 days: $${summary.revenueLast30Days.toFixed(2)} across ${summary.ordersLast30Days} orders. ` +
          `Top products (30d): ${summary.topProducts.map((p) => `${p.title} (${p.quantity} sold)`).join(", ") || "none yet"}.`
      );
    } else {
      parts.push("Shopify sales data isn't connected yet, so no live revenue numbers are available.");
    }
  } catch (e) {
    parts.push("Shopify sales data couldn't be reached right now.");
  }

  try {
    const catalog = await getCatalogTitles(60);
    if (catalog && catalog.length) {
      parts.push(`Current store catalog (${catalog.length} products): ${catalog.map((p) => p.title).join(", ")}.`);
    }
  } catch (e) {
    // catalog is optional context — skip silently if unavailable
  }

  try {
    const digests = (await kv.get("researchDigests")) || [];
    if (digests[0]) {
      parts.push(`Most recent trend research digest (${digests[0].date}):\n${digests[0].content}`);
    }
  } catch (e) {}

  try {
    const clients = (await kv.get("fiverrClients")) || [];
    const open = clients.filter((c) => c.status !== "Delivered");
    if (open.length) {
      parts.push(
        `Open Fiverr work: ${open
          .map((c) => `${c.client} (${c.gigType}, status: ${c.status}${c.deadline ? `, due ${c.deadline}` : ""})`)
          .join("; ")}.`
      );
    }
  } catch (e) {}

  try {
    const history = (await kv.get("newsletterHistory")) || [];
    if (history[0]) {
      const days = Math.floor((Date.now() - new Date(history[0].date).getTime()) / (1000 * 60 * 60 * 24));
      parts.push(`Last newsletter sent ${days} day(s) ago (${history[0].date}).`);
    } else {
      parts.push("No newsletter sends logged yet.");
    }
  } catch (e) {}

  return parts.join("\n\n");
}

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 500 });
  }

  const { messages } = await request.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  const context = await buildContext();

  const systemPrompt =
    "You are the built-in assistant inside the owner of Lilac Desk's personal business dashboard. " +
    "Lilac Desk is a digital stationery Shopify brand (GoodNotes/Notability-compatible digital planners), " +
    "and she also freelances on Fiverr (website builds, logo design, digital templates). " +
    "Answer directly and concisely — no filler, no over-explaining, no unnecessary caveats. " +
    "When she asks for product ideas, ground them in her actual catalog and sales data below so you're " +
    "not suggesting things she already sells. When she asks for social post ideas (Instagram, TikTok, " +
    "Pinterest), write ready-to-use ideas specific to her real products, not generic advice. " +
    "If something requires info you don't have in the context below, say so plainly instead of guessing.\n\n" +
    "--- CURRENT CONTEXT ---\n" +
    context;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return NextResponse.json({ reply: text });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
