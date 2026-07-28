"use client";

import { useState, useEffect, useMemo } from "react";
import { C, serif, sans, EyebrowLabel, PageHeader, StatTile, Card, Row, Pill, RemoveButton, buttonStyle, inputStyle, money } from "../../lib/theme";

const IDEA_CATEGORIES = ["Content", "Trend", "Other"];
const PLATFORMS = ["Instagram", "TikTok", "Pinterest", "Threads", "Email", "Other"];
const PRODUCT_STAGES = ["Idea", "In Development", "Launched"];
const TYPE_LABEL = { task: "Task", businessFocus: "Focus", workout: "Workout" };

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function BusinessPage() {
  const [shopify, setShopify] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [digests, setDigests] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [completedLog, setCompletedLog] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [digest, setDigest] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const [campaignName, setCampaignName] = useState("");
  const [campaignPlatform, setCampaignPlatform] = useState("Instagram");
  const [campaignUtm, setCampaignUtm] = useState("");

  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaNote, setIdeaNote] = useState("");
  const [ideaCategory, setIdeaCategory] = useState("Trend");

  const [productName, setProductName] = useState("");
  const [productNotes, setProductNotes] = useState("");
  const [newItemText, setNewItemText] = useState({});

  useEffect(() => {
    fetch("/api/shopify").then((r) => r.json()).then(setShopify);
    fetch("/api/campaigns").then((r) => r.json()).then((d) => setCampaigns(d.campaigns || []));
    fetch("/api/research").then((r) => r.json()).then((d) => setDigests(d.digests || []));
    fetch("/api/ideas").then((r) => r.json()).then((d) => setIdeas(d.ideas || []));
    fetch("/api/completed").then((r) => r.json()).then((d) => setCompletedLog(d.log || []));
    fetch("/api/tasks").then((r) => r.json()).then((d) => setTasks(d.tasks || []));
    fetch("/api/digest").then((r) => r.json()).then(setDigest);
    fetch("/api/products").then((r) => r.json()).then((d) => setProducts(d.products || []));
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

  async function completeTask(id) {
    await fetch(`/api/tasks/${id}`, { method: "PATCH" });
    const [t, c, d] = await Promise.all([
      fetch("/api/tasks").then((r) => r.json()),
      fetch("/api/completed").then((r) => r.json()),
      fetch("/api/digest").then((r) => r.json()),
    ]);
    setTasks(t.tasks || []);
    setCompletedLog(c.log || []);
    setDigest(d);
  }

  async function addProduct() {
    if (!productName.trim()) return;
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: productName.trim(), notes: productNotes.trim() }),
    });
    setProducts((await res.json()).products);
    setProductName("");
    setProductNotes("");
  }

  async function patchProduct(id, body) {
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setProducts((await res.json()).products);
  }

  async function deleteProduct(id) {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    setProducts((await res.json()).products);
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

  // Only Lilac Desk-relevant completions live here: business focus, workout,
  // and tasks tagged "Lilac Desk". Fiverr-tagged tasks and Fiverr order
  // completions show on the Fiverr page instead.
  const relevantLog = useMemo(
    () => completedLog.filter((e) => e.type === "businessFocus" || e.type === "workout" || (e.type === "task" && e.tag === "Lilac Desk")),
    [completedLog]
  );

  const days = useMemo(() => last7Days(), []);
  const countsByDay = useMemo(() => {
    const counts = {};
    for (const d of days) counts[d] = 0;
    for (const entry of relevantLog) {
      const d = entry.completedAt.slice(0, 10);
      if (counts[d] !== undefined) counts[d] += 1;
    }
    return counts;
  }, [relevantLog, days]);

  const selectedCompleted = useMemo(
    () => relevantLog.filter((e) => e.completedAt.slice(0, 10) === selectedDate),
    [relevantLog, selectedDate]
  );

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
  const openLilacTasks = useMemo(() => tasks.filter((t) => t.tag === "Lilac Desk"), [tasks]);
  const stillPending = useMemo(() => {
    if (!isToday || !digest) return [];
    const pending = [];
    if (!digest.businessFocus?.done) pending.push(digest.businessFocus?.focus);
    if (digest.workout?.exercises?.length && !digest.fitness?.todayDone) pending.push(digest.workout.focus);
    return pending.filter(Boolean);
  }, [isToday, digest]);

  const productCounts = useMemo(() => {
    const c = { Idea: 0, "In Development": 0, Launched: 0 };
    for (const p of products) c[p.stage] = (c[p.stage] || 0) + 1;
    return c;
  }, [products]);

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
          {shopify.summary.newCustomerOrders + shopify.summary.repeatCustomerOrders > 0 && (
            <StatTile label="New vs Repeat (7d)" value={`${shopify.summary.newCustomerOrders}/${shopify.summary.repeatCustomerOrders}`} />
          )}
        </div>
      )}
      {shopify?.summary?.topProducts?.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <EyebrowLabel>Top Products, Last 30 Days</EyebrowLabel>
          <div style={{ marginTop: 10 }}>
            {shopify.summary.topProducts.map((p) => (
              <div key={p.title} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontFamily: sans, fontSize: 13 }}>
                <span>{p.title}</span>
                <span style={{ opacity: 0.7 }}>
                  {p.quantity} sold {p.momentum === "up" ? "↑" : p.momentum === "down" ? "↓" : ""}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
      {shopify?.inventoryAlerts?.length > 0 && (
        <Card style={{ marginBottom: 24, borderColor: C.oxblood }}>
          <EyebrowLabel>Low Stock</EyebrowLabel>
          <div style={{ marginTop: 10 }}>
            {shopify.inventoryAlerts.map((a) => (
              <div key={a.title} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontFamily: sans, fontSize: 13 }}>
                <span>{a.title}</span>
                <span style={{ color: C.oxblood }}>{a.totalInventory} left</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      {!shopify?.summary && (
        <Card style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: sans, fontSize: 13, opacity: 0.7, margin: 0 }}>
            Not connected yet — add SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, and SHOPIFY_CLIENT_SECRET to see real numbers here (see README).
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
      <div style={{ marginBottom: 40 }}>
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

      {/* CALENDAR — pending + completed Today's Plan items */}
      <div style={{ marginBottom: 40 }}>
        <EyebrowLabel>This Week</EyebrowLabel>
        <div style={{ display: "flex", gap: 6, margin: "12px 0 16px 0" }}>
          {days.map((d) => {
            const dateObj = new Date(`${d}T00:00:00`);
            const active = d === selectedDate;
            const todayFlag = d === new Date().toISOString().slice(0, 10);
            return (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                style={{
                  flex: 1,
                  cursor: "pointer",
                  border: `1px solid ${active ? C.oxblood : C.greige}`,
                  backgroundColor: active ? C.lilac : "transparent",
                  padding: "10px 4px",
                  textAlign: "center",
                  fontFamily: sans,
                }}
              >
                <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", opacity: 0.6 }}>
                  {dateObj.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div style={{ fontSize: 15, margin: "4px 0", fontFamily: serif, color: todayFlag ? C.oxblood : C.charcoal }}>
                  {dateObj.getDate()}
                </div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>{countsByDay[d] || 0} done</div>
              </button>
            );
          })}
        </div>
        <Card>
          <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", opacity: 0.5, margin: "0 0 10px 0" }}>
            {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
          {isToday && stillPending.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontFamily: sans, fontSize: 11, opacity: 0.6, margin: "0 0 6px 0" }}>Still open</p>
              {stillPending.map((label, i) => (
                <p key={i} style={{ fontFamily: sans, fontSize: 13, margin: "4px 0", opacity: 0.8 }}>&#9744; {label}</p>
              ))}
            </div>
          )}
          {selectedCompleted.length === 0 && stillPending.length === 0 && (
            <p style={{ fontFamily: sans, fontSize: 13, opacity: 0.6, margin: 0 }}>Nothing here.</p>
          )}
          {selectedCompleted.length > 0 && (
            <div>
              {isToday && stillPending.length > 0 && <p style={{ fontFamily: sans, fontSize: 11, opacity: 0.6, margin: "0 0 6px 0" }}>Completed</p>}
              {selectedCompleted.map((entry) => (
                <Row key={entry.id}>
                  <div>
                    <span style={{ fontFamily: sans, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: C.oxblood, backgroundColor: C.lilac, padding: "2px 8px", marginRight: 8 }}>
                      {TYPE_LABEL[entry.type] || entry.type}
                    </span>
                    <span style={{ fontFamily: sans, fontSize: 14 }}>{entry.label}</span>
                  </div>
                  <span style={{ fontFamily: sans, fontSize: 12, opacity: 0.6 }}>
                    {new Date(entry.completedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </Row>
              ))}
            </div>
          )}
        </Card>
        {openLilacTasks.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontFamily: sans, fontSize: 11, opacity: 0.6, margin: "0 0 6px 0" }}>Open Lilac Desk tasks</p>
            {openLilacTasks.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                <button
                  onClick={() => completeTask(t.id)}
                  style={{ width: 16, height: 16, flexShrink: 0, border: `1px solid ${C.oxblood}`, backgroundColor: "transparent", cursor: "pointer", padding: 0 }}
                />
                <span style={{ fontFamily: sans, fontSize: 13 }}>{t.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PRODUCTS — folded in from the old standalone page */}
      <div>
        <EyebrowLabel>Products</EyebrowLabel>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "14px 0 20px 0" }}>
          <StatTile label="Ideas" value={productCounts.Idea} />
          <StatTile label="In Development" value={productCounts["In Development"]} />
          <StatTile label="Launched" value={productCounts.Launched} />
        </div>
        <Card style={{ marginBottom: 24 }}>
          <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Product name..." value={productName} onChange={(e) => setProductName(e.target.value)} />
          <textarea style={{ ...inputStyle, marginBottom: 8, minHeight: 50, resize: "vertical" }} placeholder="Notes (optional)..." value={productNotes} onChange={(e) => setProductNotes(e.target.value)} />
          <button className="lux-btn" style={buttonStyle} onClick={addProduct}>Start Pipeline</button>
        </Card>
        {PRODUCT_STAGES.map((stage) => {
          const inStage = products.filter((p) => p.stage === stage);
          if (inStage.length === 0) return null;
          return (
            <div key={stage} style={{ marginBottom: 24 }}>
              <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", opacity: 0.6, margin: "0 0 10px 0" }}>{stage}</p>
              {inStage.map((p) => {
                const doneCount = p.checklist.filter((i) => i.done).length;
                return (
                  <Card key={p.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <p style={{ fontFamily: serif, fontSize: 18, margin: "0 0 4px 0" }}>{p.name}</p>
                      <RemoveButton onClick={() => deleteProduct(p.id)} />
                    </div>
                    {p.notes && <p style={{ fontFamily: sans, fontSize: 13, margin: "0 0 10px 0", opacity: 0.8 }}>{p.notes}</p>}
                    <div style={{ height: 3, backgroundColor: C.greige, width: "100%", marginBottom: 8 }}>
                      <div style={{ height: 3, backgroundColor: C.oxblood, width: `${(doneCount / p.checklist.length) * 100}%`, transition: "width 0.3s ease" }} />
                    </div>
                    <p style={{ fontFamily: sans, fontSize: 11, opacity: 0.6, margin: "0 0 8px 0" }}>
                      {doneCount}/{p.checklist.length} steps complete
                    </p>
                    {p.checklist.map((item, i) => (
                      <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: sans, fontSize: 13, padding: "4px 0" }}>
                        <input type="checkbox" checked={item.done} onChange={() => patchProduct(p.id, { toggleChecklistIndex: i })} />
                        <span style={{ textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1 }}>{item.text}</span>
                      </label>
                    ))}
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <input
                        style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }}
                        placeholder="Add a step..."
                        value={newItemText[p.id] || ""}
                        onChange={(e) => setNewItemText({ ...newItemText, [p.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newItemText[p.id]?.trim()) {
                            patchProduct(p.id, { addChecklistItem: newItemText[p.id] });
                            setNewItemText({ ...newItemText, [p.id]: "" });
                          }
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
                      {PRODUCT_STAGES.map((s2) => (
                        <Pill key={s2} active={p.stage === s2} onClick={() => patchProduct(p.id, { stage: s2 })}>
                          {s2}
                        </Pill>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}