import { kv } from "@vercel/kv";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getSalesSummary, getCatalogTitles, getInventoryAlerts } from "../../../lib/shopify";
import { normalizeFiverrStatus } from "../../../lib/fiverrStatus";

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
          `Top sellers: ${summary.topProducts.map((p) => `${p.title} (${p.quantity}, ${p.momentum})`).join(", ") || "none yet"}. ` +
          `New customer orders this week: ${summary.newCustomerOrders}, repeat: ${summary.repeatCustomerOrders}.`
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
    const alerts = await getInventoryAlerts();
    if (alerts.length) {
      contextParts.push(`Low stock: ${alerts.map((a) => `${a.title} (${a.totalInventory} left)`).join(", ")}.`);
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

  // Fiverr — previously invisible to suggestions entirely
  try {
    const clients = (await kv.get("fiverrClients")) || [];
    const active = clients
      .map((c) => ({ ...c, status: normalizeFiverrStatus(c.status) }))
      .filter((c) => c.status !== "Approved");
    if (active.length) {
      const stale = active.filter((c) => {
        const days = Math.floor((Date.now() - new Date(c.createdDate).getTime()) / (1000 * 60 * 60 * 24));
        return c.status === "Waiting for Customer Response" && days >= 3;
      });
      contextParts.push(
        `Fiverr — ${active.length} active order(s): ${active.map((c) => `${c.client} (${c.gigType}, ${c.status})`).join("; ")}.` +
          (stale.length ? ` Stale, waiting 3+ days on customer: ${stale.map((c) => c.client).join(", ")}.` : "")
      );
    } else {
      contextParts.push("No active Fiverr orders right now.");
    }
  } catch (e) {}

  // Growth — self-care routine, previously invisible to suggestions entirely
  try {
    const today = new Date().toISOString().slice(0, 10);
    const routineItems = (await kv.get("selfcareItems")) || [];
    const routineLog = (await kv.get("selfcareLog")) || {};
    const doneToday = (routineLog[today] || []).length;
    contextParts.push(`Self-care routine today: ${doneToday}/${routineItems.length} done.`);
  } catch (e) {}

  const context = contextParts.join("\n\n");

  const prompt =
    "You are the proactive strategist inside the Lilac Desk owner's business dashboard. She runs two " +
    "things: Lilac Desk, which sells digital stationery (GoodNotes/Notability planners) on Shopify, and " +
    "freelance web design/dev work sold through Fiverr. Based ONLY on the real context below, produce " +
    "concrete, specific suggestions. Respond with ONLY a valid JSON object, no markdown, no preamble, in " +
    "exactly this shape:\n" +
    "{\n" +
    '  "focusToday": "one sentence — the single highest-impact thing to do today across either business",\n' +
    '  "products": [{"action": "add" or "remove", "name": "product name", "why": "one sentence tied to the data"}],\n' +
    '  "social": [{"platform": "Instagram" or "TikTok" or "Pinterest", "idea": "a specific ready-to-use post idea", "when": "suggested timing e.g. this week / Friday"}],\n' +
    '  "newsletter": {"shouldSend": true or false, "why": "one sentence", "themes": ["2-3 content ideas tied to new products or what is selling"]},\n' +
    '  "fiverr": [{"suggestion": "a specific, actionable Fiverr suggestion tied to the actual active orders or lack thereof", "why": "one sentence"}],\n' +
    '  "growth": [{"area": "coding" or "marketing" or "business" or "design", "suggestion": "a specific free resource, course, or skill to pursue", "link": "a real URL if you are confident it exists, else empty string"}]\n' +
    "}\n" +
    "Give 2-3 items in each array (1-2 for fiverr is fine if there is not much to say). Be specific to her " +
    "actual products, orders, and data, not generic. For social, write ideas she could literally post, not " +
    "advice about posting. For fiverr, reference the actual client/status if relevant — e.g. flag a stale " +
    "inquiry, suggest a rate adjustment, or note which gig type is worth pushing.\n\n" +
    "--- CONTEXT ---\n" +
    context;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1800,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

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
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}