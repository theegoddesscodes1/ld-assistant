import { kv } from "@vercel/kv";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getSalesSummary, getCatalogTitles } from "../../../lib/shopify";

export const dynamic = "force-dynamic";

// Builds the same grounded context the chat assistant uses, then asks for a
// structured set of proactive suggestions. Cached in KV so the homepage reads
// them instantly; refreshed on a schedule (cron) or on demand (?refresh=1).
async function generate() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const contextParts = [];

  try {
    const { configured, summary } = await getSalesSummary();
    if (configured && summary) {
      contextParts.push(
        `Sales — last 7 days: $${summary.revenueLast7Days.toFixed(2)} (${summary.ordersLast7Days} orders); ` +
          `last 30 days: $${summary.revenueLast30Days.toFixed(2)} (${summary.ordersLast30Days} orders). ` +
          `Top sellers: ${summary.topProducts.map((p) => `${p.title} (${p.quantity})`).join(", ") || "none yet"}.`
      );
    } else {
      contextParts.push("Shopify sales not connected — base suggestions on general digital-stationery trends.");
    }
  } catch (e) {
    contextParts.push("Shopify sales unavailable right now.");
  }

  try {
    const catalog = await getCatalogTitles(60);
    if (catalog && catalog.length) {
      contextParts.push(`Current catalog: ${catalog.map((p) => p.title).join(", ")}.`);
    }
  } catch (e) {}

  try {
    const digests = (await kv.get("researchDigests")) || [];
    if (digests[0]) contextParts.push(`Latest trend research (${digests[0].date}):\n${digests[0].content}`);
  } catch (e) {}

  try {
    const history = (await kv.get("newsletterHistory")) || [];
    if (history[0]) {
      const days = Math.floor((Date.now() - new Date(history[0].date).getTime()) / (1000 * 60 * 60 * 24));
      contextParts.push(`Last newsletter: ${days} days ago.`);
    } else {
      contextParts.push("No newsletter sent yet.");
    }
  } catch (e) {}

  const context = contextParts.join("\n\n");

  const prompt =
    "You are the proactive strategist inside the Lilac Desk owner's business dashboard. Lilac Desk sells " +
    "digital stationery (GoodNotes/Notability planners) on Shopify. Based ONLY on the real context below, " +
    "produce concrete, specific suggestions. Respond with ONLY a valid JSON object, no markdown, no preamble, " +
    "in exactly this shape:\n" +
    "{\n" +
    '  "focusToday": "one sentence — the single highest-impact thing to do today for the business",\n' +
    '  "products": [{"action": "add" or "remove", "name": "product name", "why": "one sentence tied to the data"}],\n' +
    '  "social": [{"platform": "Instagram" or "TikTok" or "Pinterest", "idea": "a specific ready-to-use post idea", "when": "suggested timing e.g. this week / Friday"}],\n' +
    '  "newsletter": {"shouldSend": true or false, "why": "one sentence", "themes": ["2-3 content ideas tied to new products or what is selling"]},\n' +
    '  "growth": [{"area": "coding" or "marketing" or "business" or "design", "suggestion": "a specific free resource, course, or skill to pursue", "link": "a real URL if you are confident it exists, else empty string"}]\n' +
    "}\n" +
    "Give 2-3 items in each array. Be specific to her actual products and data, not generic. For social, write " +
    "ideas she could literally post, not advice about posting.\n\n" +
    "--- CONTEXT ---\n" +
    context;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  // Be tolerant of stray formatting around the JSON.
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } else {
      throw new Error("Could not parse suggestions JSON");
    }
  }

  const payload = { ...parsed, generatedAt: new Date().toISOString() };
  await kv.set("aiSuggestions", payload);
  return payload;
}

export async function GET(request) {
  const url = new URL(request.url);
  const refresh = url.searchParams.get("refresh") === "1";

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  const cached = await kv.get("aiSuggestions");

  // Serve cache unless explicitly refreshing or it's stale (>18h old).
  if (cached && !refresh) {
    const age = Date.now() - new Date(cached.generatedAt).getTime();
    if (age < 18 * 60 * 60 * 1000) {
      return NextResponse.json(cached);
    }
  }

  try {
    const payload = await generate();
    return NextResponse.json(payload);
  } catch (err) {
    if (cached) return NextResponse.json(cached); // fall back to stale rather than nothing
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
