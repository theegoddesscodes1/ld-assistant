"use client";

import { useState, useEffect, useMemo } from "react";
import { C, serif, sans, EyebrowLabel, PageHeader, StatTile, Card, Row, RemoveButton, buttonStyle, inputStyle, money } from "../../lib/theme";

const IDEA_CATEGORIES = ["Content", "Trend", "Other"];
const PLATFORMS = ["Instagram", "TikTok", "Pinterest", "Threads", "Email", "Other"];

export default function BusinessPage() {
  const [shopify, setShopify] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [digests, setDigests] = useState([]);
  const [ideas, setIdeas] = useState([]);

  const [campaignName, setCampaignName] = useState("");
  const [campaignPlatform, setCampaignPlatform] = useState("Instagram");
  const [campaignUtm, setCampaignUtm] = useState("");

  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaNote, setIdeaNote] = useState("");
  const [ideaCategory, setIdeaCategory] = useState("Trend");

  useEffect(() => {
    fetch("/api/shopify").then((r) => r.json()).then(setShopify);
    fetch("/api/campaigns").then((r) => r.json()).then((d) => setCampaigns(d.campaigns || []));
    fetch("/api/research").then((r) => r.json()).then((d) => setDigests(d.digests || []));
    fetch("/api/ideas").then((r) => r.json()).then((d) => setIdeas(d.ideas || []));
  }, []);

  async function addCampaign() {
    if (!campaignName.trim()) return;
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: campaignName.trim(), platform: campaignPlatform, utmCampaign: campaignUtm.trim() }),
    });
    setCampaigns((await res.json()).campaigns);
    setCampaignName("");
    setCampaignUtm("");
  }

  async function deleteCampaign(id) {
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    setCampaigns((await res.json()).campaigns);
  }

  async function addIdea() {
    if (!ideaTitle.trim()) return;
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: ideaTitle.trim(), note: ideaNote.trim(), category: ideaCategory }),
    });
    setIdeas((await res.json()).ideas);
    setIdeaTitle("");
    setIdeaNote("");
  }

  async function deleteIdea(id) {
    const res = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
    setIdeas((await res.json()).ideas);
  }

  const subtitle = useMemo(() => {
    if (!shopify?.summary) return "Connect Shopify to see real numbers here.";
    const { revenueLast7Days, revenuePrevious7Days, ordersLast7Days } = shopify.summary;
    if (revenuePrevious7Days > 0) {
      const up = revenueLast7Days >= revenuePrevious7Days;
      return `${money(revenueLast7Days)} this week, ${up ? "up" : "down"} from ${money(revenuePrevious7Days)} last week.`;
    }
    return `${money(revenueLast7Days)} this week across ${ordersLast7Days} order${ordersLast7Days === 1 ? "" : "s"}.`;
  }, [shopify]);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "36px 24px 72px 24px" }}>
      <PageHeader title="Business" subtitle={subtitle} />

      {/* SALES */}
      {shopify?.summary && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
          <StatTile
            label="Last 7 Days"
            value={money(shopify.summary.revenueLast7Days)}
            sub={`${shopify.summary.ordersLast7Days} order${shopify.summary.ordersLast7Days === 1 ? "" : "s"}`}
          />
          <StatTile
            label="Last 30 Days"
            value={money(shopify.summary.revenueLast30Days)}
            sub={`${shopify.summary.ordersLast30Days} order${shopify.summary.ordersLast30Days === 1 ? "" : "s"}`}
          />
          <StatTile label="Avg Order (7d)" value={money(shopify.summary.avgOrderValue7d)} />
        </div>
      )}
      {shopify?.summary?.topProducts?.length > 0 && (
        <Card style={{ marginBottom: 40 }}>
          <EyebrowLabel>Top Products, Last 30 Days</EyebrowLabel>
          <div style={{ marginTop: 10 }}>
            {shopify.summary.topProducts.map((p) => (
              <div key={p.title} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontFamily: sans, fontSize: 13 }}>
                <span>{p.title}</span>
                <span style={{ opacity: 0.7 }}>{p.quantity} sold</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      {!shopify?.summary && (
        <Card style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: sans, fontSize: 13, opacity: 0.7, margin: 0 }}>
            Not connected yet — add SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_TOKEN to see real numbers here (see README).
          </p>
        </Card>
      )}

      {/* MARKETING */}
      <EyebrowLabel>Marketing Campaigns</EyebrowLabel>
      <p style={{ fontFamily: sans, fontSize: 12, opacity: 0.6, margin: "8px 0 14px 0" }}>
        Log what you post — Shopify doesn't expose reliable per-campaign attribution without extra
        permissions, so this stays a manual log rather than pretending to auto-track it.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <input style={{ ...inputStyle, flex: "1 1 200px" }} placeholder="Campaign / post name..." value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
        <select style={{ ...inputStyle, width: "auto" }} value={campaignPlatform} onChange={(e) => setCampaignPlatform(e.target.value)}>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input style={{ ...inputStyle, flex: "1 1 160px" }} placeholder="utm_campaign value (optional)" value={campaignUtm} onChange={(e) => setCampaignUtm(e.target.value)} />
        <button className="lux-btn" style={buttonStyle} onClick={addCampaign}>Log It</button>
      </div>
      <div style={{ marginBottom: 40 }}>
        {campaigns.map((c) => (
          <Row key={c.id}>
            <div>
              <span style={{ fontFamily: sans, fontSize: 14 }}>{c.name}</span>
              <span style={{ fontFamily: sans, fontSize: 11, opacity: 0.6, marginLeft: 8 }}>{c.platform} &middot; {c.date}</span>
            </div>
            <RemoveButton onClick={() => deleteCampaign(c.id)} />
          </Row>
        ))}
      </div>

      {/* RESEARCH */}
      <div style={{ marginBottom: 40 }}>
        <EyebrowLabel>Latest Trend Digest</EyebrowLabel>
        {digests.length === 0 && <p style={{ fontFamily: sans, fontSize: 13, opacity: 0.6, margin: "10px 0" }}>Nothing yet — runs weekly.</p>}
        {digests.length > 0 && (
          <Card style={{ marginTop: 10 }}>
            <p style={{ fontFamily: sans, fontSize: 11, opacity: 0.6, margin: "0 0 8px 0" }}>{digests[0].date}</p>
            <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{digests[0].content}</p>
          </Card>
        )}
      </div>

      {/* IDEAS LOG */}
      <div>
        <EyebrowLabel>Ideas &amp; Notes</EyebrowLabel>
        <div style={{ margin: "14px 0 20px 0" }}>
          <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Idea title..." value={ideaTitle} onChange={(e) => setIdeaTitle(e.target.value)} />
          <textarea style={{ ...inputStyle, marginBottom: 8, minHeight: 60, resize: "vertical" }} placeholder="Notes (optional)..." value={ideaNote} onChange={(e) => setIdeaNote(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <select style={{ ...inputStyle, width: "auto" }} value={ideaCategory} onChange={(e) => setIdeaCategory(e.target.value)}>
              {IDEA_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button className="lux-btn" style={{ ...buttonStyle, flex: 1 }} onClick={addIdea}>Save Idea</button>
          </div>
        </div>
        {ideas.map((idea) => (
          <Row key={idea.id} style={{ display: "block" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontFamily: sans, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: C.oxblood, backgroundColor: C.lilac, padding: "2px 8px", marginRight: 8 }}>
                  {idea.category}
                </span>
                <span style={{ fontFamily: sans, fontSize: 11, opacity: 0.6 }}>{idea.date}</span>
              </div>
              <RemoveButton onClick={() => deleteIdea(idea.id)} />
            </div>
            <p style={{ fontFamily: serif, fontSize: 17, margin: "8px 0 4px 0" }}>{idea.title}</p>
            {idea.note && <p style={{ fontFamily: sans, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{idea.note}</p>}
          </Row>
        ))}
      </div>
    </div>
  );
}
