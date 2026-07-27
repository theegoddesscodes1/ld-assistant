"use client";

import { useState, useEffect, useMemo } from "react";
import { C, serif, sans, EyebrowLabel, PageHeader, StatTile, Card, Pill, RemoveButton, buttonStyle, inputStyle } from "../../lib/theme";

const STAGES = ["Idea", "In Development", "Launched"];

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [newItemText, setNewItemText] = useState({});

  useEffect(() => {
    fetch("/api/products").then((r) => r.json()).then((d) => setProducts(d.products || []));
  }, []);

  async function addProduct() {
    if (!name.trim()) return;
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), notes: notes.trim() }),
    });
    setProducts((await res.json()).products);
    setName("");
    setNotes("");
  }

  async function patch(id, body) {
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

  const counts = useMemo(() => {
    const c = { Idea: 0, "In Development": 0, Launched: 0 };
    for (const p of products) c[p.stage] = (c[p.stage] || 0) + 1;
    return c;
  }, [products]);

  const subtitle =
    products.length === 0
      ? "Nothing in the pipeline yet."
      : `${counts["In Development"]} in development, ${counts["Launched"]} launched.`;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "36px 24px 72px 24px" }}>
      <PageHeader title="Products" subtitle={subtitle} />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 40 }}>
        <StatTile label="Ideas" value={counts.Idea} />
        <StatTile label="In Development" value={counts["In Development"]} />
        <StatTile label="Launched" value={counts.Launched} />
      </div>

      <EyebrowLabel>New Product</EyebrowLabel>
      <Card style={{ margin: "14px 0 40px 0" }}>
        <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Product name..." value={name} onChange={(e) => setName(e.target.value)} />
        <textarea style={{ ...inputStyle, marginBottom: 8, minHeight: 50, resize: "vertical" }} placeholder="Notes (optional)..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="lux-btn" style={buttonStyle} onClick={addProduct}>Start Pipeline</button>
      </Card>

      {STAGES.map((stage) => {
        const inStage = products.filter((p) => p.stage === stage);
        if (inStage.length === 0) return null;
        return (
          <div key={stage} style={{ marginBottom: 32 }}>
            <EyebrowLabel>{stage}</EyebrowLabel>
            <div style={{ marginTop: 12 }}>
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
                        <input type="checkbox" checked={item.done} onChange={() => patch(p.id, { toggleChecklistIndex: i })} />
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
                            patch(p.id, { addChecklistItem: newItemText[p.id] });
                            setNewItemText({ ...newItemText, [p.id]: "" });
                          }
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
                      {STAGES.map((s) => (
                        <Pill key={s} active={p.stage === s} onClick={() => patch(p.id, { stage: s })}>
                          {s}
                        </Pill>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
