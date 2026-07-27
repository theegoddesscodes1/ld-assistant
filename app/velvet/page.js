"use client";

import { useState, useEffect, useMemo } from "react";
import { C, serif, sans, EyebrowLabel, PageHeader, StatTile, Card, Pill, RemoveButton, buttonStyle, inputStyle, money } from "../../lib/theme";

const STAGES = ["Planned", "In Progress", "Done"];

export default function VelvetCirclePage() {
  const [features, setFeatures] = useState([]);
  const [featureName, setFeatureName] = useState("");
  const [featureNotes, setFeatureNotes] = useState("");
  const [newItemText, setNewItemText] = useState({});

  const [stats, setStats] = useState([]);
  const [totalUsers, setTotalUsers] = useState("");
  const [revenueTotal, setRevenueTotal] = useState("");
  const [statNote, setStatNote] = useState("");
  const [liveConnected, setLiveConnected] = useState(false);

  useEffect(() => {
    fetch("/api/velvet/features").then((r) => r.json()).then((d) => setFeatures(d.features || []));
    fetch("/api/velvet/stats").then((r) => r.json()).then((d) => setStats(d.history || []));
    fetch("/api/velvet/ingest").then((r) => r.json()).then((d) => setLiveConnected(!!d.connected)).catch(() => {});
  }, []);

  async function addFeature() {
    if (!featureName.trim()) return;
    const res = await fetch("/api/velvet/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: featureName.trim(), notes: featureNotes.trim() }),
    });
    setFeatures((await res.json()).features);
    setFeatureName("");
    setFeatureNotes("");
  }

  async function patchFeature(id, body) {
    const res = await fetch(`/api/velvet/features/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setFeatures((await res.json()).features);
  }

  async function deleteFeature(id) {
    const res = await fetch(`/api/velvet/features/${id}`, { method: "DELETE" });
    setFeatures((await res.json()).features);
  }

  async function logStats() {
    if (!totalUsers && !revenueTotal) return;
    const res = await fetch("/api/velvet/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalUsers: totalUsers === "" ? undefined : totalUsers,
        revenueTotal: revenueTotal === "" ? undefined : revenueTotal,
        note: statNote,
      }),
    });
    setStats((await res.json()).history);
    setStatNote("");
  }

  async function deleteStat(id) {
    const res = await fetch(`/api/velvet/stats/${id}`, { method: "DELETE" });
    setStats((await res.json()).history);
  }

  const counts = useMemo(() => {
    const c = { Planned: 0, "In Progress": 0, Done: 0 };
    for (const f of features) c[f.stage] = (c[f.stage] || 0) + 1;
    return c;
  }, [features]);

  const latest = stats[0];
  const previous = stats[1];
  const userDelta = latest && previous && latest.totalUsers != null && previous.totalUsers != null
    ? latest.totalUsers - previous.totalUsers
    : null;
  const revenueDelta = latest && previous && latest.revenueTotal != null && previous.revenueTotal != null
    ? latest.revenueTotal - previous.revenueTotal
    : null;

  const subtitle = latest
    ? `${latest.totalUsers != null ? `${latest.totalUsers} users` : ""}${
        latest.totalUsers != null && latest.revenueTotal != null ? ", " : ""
      }${latest.revenueTotal != null ? money(latest.revenueTotal) + " made" : ""} as of ${latest.date}.`
    : `${counts["In Progress"]} feature${counts["In Progress"] === 1 ? "" : "s"} in progress, ${counts.Planned} planned.`;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "36px 24px 72px 24px" }}>
      <PageHeader title="Velvet Circle" subtitle={subtitle} />

      {/* LIVE STATS */}
      <EyebrowLabel>Live Stats</EyebrowLabel>
      <p style={{ fontFamily: sans, fontSize: 12, margin: "8px 0 0 0", color: liveConnected ? C.oxblood : C.charcoal, opacity: liveConnected ? 1 : 0.6 }}>
        {liveConnected
          ? "\u25cf Live feed connected — updating automatically from your app."
          : "\u25cb Live feed not connected yet. Log snapshots by hand below, or wire up auto-tracking once the app is deployed (see README)."}
      </p>
      {latest ? (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "14px 0 16px 0" }}>
          {latest.totalUsers != null && (
            <StatTile
              label="Total Users"
              value={latest.totalUsers.toLocaleString()}
              sub={userDelta !== null ? `${userDelta >= 0 ? "+" : ""}${userDelta} since last log` : null}
              trend={userDelta > 0 ? "up" : undefined}
            />
          )}
          {latest.revenueTotal != null && (
            <StatTile
              label="Revenue, All Time"
              value={money(latest.revenueTotal)}
              sub={revenueDelta !== null ? `${revenueDelta >= 0 ? "+" : ""}${money(revenueDelta)} since last log` : null}
              trend={revenueDelta > 0 ? "up" : undefined}
            />
          )}
          <StatTile label="Last Logged" value={latest.date} />
        </div>
      ) : (
        <p style={{ fontFamily: sans, fontSize: 13, opacity: 0.6, margin: "10px 0 16px 0" }}>
          Nothing logged yet — once it's live, log a snapshot below whenever you check your numbers.
        </p>
      )}

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 140px" }}>
            <label style={{ fontFamily: sans, fontSize: 11, opacity: 0.6, display: "block", marginBottom: 4 }}>Total Users</label>
            <input style={inputStyle} type="number" placeholder="e.g. 1240" value={totalUsers} onChange={(e) => setTotalUsers(e.target.value)} />
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <label style={{ fontFamily: sans, fontSize: 11, opacity: 0.6, display: "block", marginBottom: 4 }}>Revenue, All Time ($)</label>
            <input style={inputStyle} type="number" placeholder="e.g. 3800" value={revenueTotal} onChange={(e) => setRevenueTotal(e.target.value)} />
          </div>
        </div>
        <input
          style={{ ...inputStyle, marginBottom: 8 }}
          placeholder="Note — anything else worth remembering about this snapshot (optional)"
          value={statNote}
          onChange={(e) => setStatNote(e.target.value)}
        />
        <button className="lux-btn" style={buttonStyle} onClick={logStats}>Log Snapshot</button>
      </Card>

      {stats.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <EyebrowLabel>History</EyebrowLabel>
          <div style={{ marginTop: 10 }}>
            {stats.map((s) => (
              <div key={s.id} className="lux-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 6px", borderBottom: `1px solid ${C.greige}` }}>
                <div>
                  <span style={{ fontFamily: sans, fontSize: 13 }}>{s.date}</span>
                  <span style={{ fontFamily: sans, fontSize: 12, opacity: 0.7, marginLeft: 10 }}>
                    {s.totalUsers != null ? `${s.totalUsers.toLocaleString()} users` : ""}
                    {s.totalUsers != null && s.revenueTotal != null ? " \u00b7 " : ""}
                    {s.revenueTotal != null ? money(s.revenueTotal) : ""}
                  </span>
                  {s.note && <p style={{ fontFamily: sans, fontSize: 12, margin: "4px 0 0 0", opacity: 0.7 }}>{s.note}</p>}
                </div>
                <RemoveButton onClick={() => deleteStat(s.id)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DEV PIPELINE */}
      <EyebrowLabel>Feature Pipeline</EyebrowLabel>
      <Card style={{ margin: "14px 0 32px 0" }}>
        <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Feature name..." value={featureName} onChange={(e) => setFeatureName(e.target.value)} />
        <textarea style={{ ...inputStyle, marginBottom: 8, minHeight: 50, resize: "vertical" }} placeholder="Notes (optional)..." value={featureNotes} onChange={(e) => setFeatureNotes(e.target.value)} />
        <button className="lux-btn" style={buttonStyle} onClick={addFeature}>Add Feature</button>
      </Card>

      {STAGES.map((stage) => {
        const inStage = features.filter((f) => f.stage === stage);
        if (inStage.length === 0) return null;
        return (
          <div key={stage} style={{ marginBottom: 32 }}>
            <EyebrowLabel>{stage}</EyebrowLabel>
            <div style={{ marginTop: 12 }}>
              {inStage.map((f) => {
                const doneCount = f.checklist.filter((i) => i.done).length;
                return (
                  <Card key={f.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <p style={{ fontFamily: serif, fontSize: 18, margin: "0 0 4px 0" }}>{f.name}</p>
                      <RemoveButton onClick={() => deleteFeature(f.id)} />
                    </div>
                    {f.notes && <p style={{ fontFamily: sans, fontSize: 13, margin: "0 0 10px 0", opacity: 0.8 }}>{f.notes}</p>}

                    {f.checklist.length > 0 && (
                      <>
                        <div style={{ height: 3, backgroundColor: C.greige, width: "100%", marginBottom: 8 }}>
                          <div style={{ height: 3, backgroundColor: C.oxblood, width: `${(doneCount / f.checklist.length) * 100}%`, transition: "width 0.3s ease" }} />
                        </div>
                        <p style={{ fontFamily: sans, fontSize: 11, opacity: 0.6, margin: "0 0 8px 0" }}>
                          {doneCount}/{f.checklist.length} steps complete
                        </p>
                      </>
                    )}
                    {f.checklist.map((item, i) => (
                      <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: sans, fontSize: 13, padding: "4px 0" }}>
                        <input type="checkbox" checked={item.done} onChange={() => patchFeature(f.id, { toggleChecklistIndex: i })} />
                        <span style={{ textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.5 : 1 }}>{item.text}</span>
                      </label>
                    ))}
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <input
                        style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }}
                        placeholder="Break it into steps (optional)..."
                        value={newItemText[f.id] || ""}
                        onChange={(e) => setNewItemText({ ...newItemText, [f.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newItemText[f.id]?.trim()) {
                            patchFeature(f.id, { addChecklistItem: newItemText[f.id] });
                            setNewItemText({ ...newItemText, [f.id]: "" });
                          }
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
                      {STAGES.map((s) => (
                        <Pill key={s} active={f.stage === s} onClick={() => patchFeature(f.id, { stage: s })}>
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
      {features.length === 0 && <p style={{ fontFamily: sans, fontSize: 13, opacity: 0.6 }}>No features logged yet.</p>}
    </div>
  );
}
