import { kv } from "@vercel/kv";
import webpush from "web-push";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { RESEARCH_QUERIES } from "../../../../lib/research-queries";

export const dynamic = "force-dynamic";


async function braveSearch(query) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": process.env.BRAVE_API_KEY,
    },
  });
  if (!res.ok) throw new Error(`Brave Search API error: ${res.status}`);
  const data = await res.json();
  const results = data?.web?.results || [];
  return results.slice(0, 5).map((r) => ({
    title: r.title,
    description: r.description,
    url: r.url,
  }));
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.BRAVE_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "BRAVE_API_KEY and ANTHROPIC_API_KEY must be set" },
      { status: 500 }
    );
  }

  webpush.setVapidDetails(
    "mailto:hello@lilacdesk.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  // 1. Gather raw search results for every configured query.
  const findings = [];
  for (const query of RESEARCH_QUERIES) {
    try {
      const results = await braveSearch(query);
      findings.push({ query, results });
    } catch (err) {
      findings.push({ query, results: [], error: String(err) });
    }
  }

  // 2. Hand the raw findings to Claude to turn into a short, usable digest.
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const rawText = findings
    .map(
      (f) =>
        `Query: ${f.query}\n` +
        f.results.map((r) => `- ${r.title}: ${r.description} (${r.url})`).join("\n")
    )
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 700,
    messages: [
      {
        role: "user",
        content:
          "You're writing a short weekly trend digest for the solo owner of a digital stationery " +
          "business (Shopify shop selling GoodNotes/Notability-compatible digital planners). " +
          "Below are raw web search results gathered this week. Summarize anything genuinely " +
          "useful in 4-6 short bullet points: new product angles, marketing tactics, or shifts " +
          "worth knowing about. Skip anything generic or already obvious. Plain text, no headers, " +
          "no preamble.\n\n" +
          rawText,
      },
    ],
  });

  const digestText = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  // 3. Store it so the app can show it, capped to the last 12 digests.
  const digests = (await kv.get("researchDigests")) || [];
  const digest = { date: new Date().toISOString().slice(0, 10), content: digestText };
  const updated = [digest, ...digests].slice(0, 12);
  await kv.set("researchDigests", updated);

  // 4. Let her know it's ready.
  const subscription = await kv.get("pushSubscription");
  if (subscription) {
    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: "Trend digest ready",
          body: "This week's research is in — open Command Center to read it.",
        })
      );
    } catch (err) {
      // Non-fatal — the digest is saved either way.
    }
  }

  return NextResponse.json({ ok: true, digest });
}
