"use client";

import { useState, useEffect, useMemo } from "react";
import { C, serif, sans, EyebrowLabel, PageHeader, StatTile, Card, Pill, RemoveButton, buttonStyle, inputStyle, money } from "../../lib/theme";
import { FIVERR_STATUSES, FIVERR_NEXT_STEP, normalizeFiverrStatus } from "../../lib/fiverrStatus";

const GIG_TYPES = ["Website Build", "Logo Design", "Site Refresh", "Digital Template"];

export default function FiverrPage() {
  const [clients, setClients] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [completedLog, setCompletedLog] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [client, setClient] = useState("");
  const [gigType, setGigType] = useState(GIG_TYPES[0]);
  const [deadline, setDeadline] = useState("");
  const [rate, setRate] = useState("");
  const [notes, setNotes] = useState("");
  const [showApproved, setShowApproved] = useState(false);

  useEffect(() => {
    fetch("/api/fiverr", { cache: "no-store" }).then((r) => r.json()).then((d) => setClients((d.clients || []).map((c) => ({ ...c, status: normalizeFiverrStatus(c.status) }))));
    fetch("/api/finances", { cache: "no-store" }).then((r) => r.json()).then((d) => setTransactions(d.transactions || [])).catch(() => {});
    fetch("/api/completed", { cache: "no-store" }).then((r) => r.json()).then((d) => setCompletedLog(d.log || []));
    fetch("/api/tasks", { cache: "no-store" }).then((r) => r.json()).then((d) => setTasks(d.tasks || []));
  }, []);

  async function addClient() {
    if (!client.trim()) return;
    const res = await fetch("/api/fiverr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client: client.trim(), gigType, deadline, rate, notes }),
    });
    const data = await res.json();
    setClients((data.clients || []).map((c) => ({ ...c, status: normalizeFiverrStatus(c.status) })));
    setClient("");
    setDeadline("");
    setRate("");
    setNotes("");
  }

  async function updateStatus(id, status) {
    const res = await fetch(`/api/fiverr/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setClients((data.clients || []).map((c) => ({ ...c, status: normalizeFiverrStatus(c.status) })));
    fetch("/api/completed", { cache: "no-store" }).then((r) => r.json()).then((d) => setCompletedLog(d.log || []));
  }

  async function deleteClient(id) {
    const res = await fetch(`/api/fiverr/${id}`, { method: "DELETE" });
    const data = await res.json();
    setClients((data.clients || []).map((c) => ({ ...c, status: normalizeFiverrStatus(c.status) })));
  }

  async function completeTask(id) {
    await fetch(`/api/tasks/${id}`, { method: "PATCH" });
    const [t, c] = await Promise.all([
      fetch("/api/tasks", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/completed", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setTasks(t.tasks || []);
    setCompletedLog(c.log || []);
  }

  const active = clients.filter((c) => c.status !== "Approved");
  const visible = clients.filter((c) => showApproved || c.status !== "Approved");
  const fiverrTasks = useMemo(() => tasks.filter((t) => t.tag === "Fiverr"), [tasks]);
  const fiverrCompletedLog = useMemo(
    () => completedLog.filter((e) => e.type === "fiverr" || (e.type === "task" && e.tag === "Fiverr")),
    [completedLog]
  );

  const nextDeadline = useMemo(
    () => active.filter((c) => c.deadline).sort((a, b) => a.deadline.localeCompare(b.deadline))[0],
    [active]
  );

  const monthIncome = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((t) => t.business === "Fiverr" && t.type === "income")
      .filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const subtitle = active.length === 0
    ? "Nothing active right now."
    : nextDeadline
    ? `${active.length} active \u00b7 next due ${nextDeadline.deadline}.`
    : `${active.length} active, no deadlines set.`;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "36px 24px 72px 24px" }}>
      <PageHeader title="Fiverr" subtitle={subtitle} />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 40 }}>
        <StatTile label="Active Gigs" value={active.length} />
        <StatTile label="This Month" value={money(monthIncome)} sub="from Fiverr, logged in Finances" />
        {nextDeadline && <StatTile label="Next Deadline" value={nextDeadline.deadline} sub={nextDeadline.client} />}
      </div>

      <EyebrowLabel>New Inquiry / Gig</EyebrowLabel>
      <Card style={{ margin: "14px 0 40px 0" }}>
        <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Client name or handle..." value={client} onChange={(e) => setClient(e.target.value)} />
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <select style={{ ...inputStyle, width: "auto" }} value={gigType} onChange={(e) => setGigType(e.target.value)}>
            {GIG_TYPES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <input style={{ ...inputStyle, width: "auto" }} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <input style={{ ...inputStyle, width: 110 }} placeholder="Rate ($)" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <textarea style={{ ...inputStyle, marginBottom: 8, minHeight: 50, resize: "vertical" }} placeholder="Notes (scope, requirements)..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="lux-btn" style={buttonStyle} onClick={addClient}>Add</button>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <EyebrowLabel>Active &amp; Upcoming</EyebrowLabel>
        <label style={{ fontFamily: sans, fontSize: 12, color: C.charcoal, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={showApproved} onChange={(e) => setShowApproved(e.target.checked)} />
          show approved
        </label>
      </div>

      <div style={{ marginTop: 14, marginBottom: 40 }}>
        {visible.length === 0 && <p style={{ fontFamily: sans, fontSize: 13, opacity: 0.6 }}>Nothing here.</p>}
        {visible.map((c) => (
          <Card key={c.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontFamily: serif, fontSize: 18, margin: "0 0 4px 0" }}>{c.client}</p>
                <p style={{ fontFamily: sans, fontSize: 12, opacity: 0.7, margin: 0 }}>
                  {c.gigType}
                  {c.rate ? ` \u00b7 $${c.rate}` : ""}
                  {c.deadline ? ` \u00b7 due ${c.deadline}` : ""}
                </p>
              </div>
              <RemoveButton onClick={() => deleteClient(c.id)} />
            </div>
            {c.notes && <p style={{ fontFamily: sans, fontSize: 13, margin: "10px 0", lineHeight: 1.5 }}>{c.notes}</p>}
            {FIVERR_NEXT_STEP[c.status] && (
              <p style={{ fontFamily: sans, fontSize: 12, margin: "0 0 10px 0", fontStyle: "italic", opacity: 0.7 }}>{FIVERR_NEXT_STEP[c.status]}</p>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {FIVERR_STATUSES.map((s) => (
                <Pill key={s} active={c.status === s} onClick={() => updateStatus(c.id, s)}>
                  {s}
                </Pill>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {fiverrTasks.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <EyebrowLabel>Fiverr Tasks</EyebrowLabel>
          <div style={{ marginTop: 12 }}>
            {fiverrTasks.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.greige}` }}>
                <button
                  onClick={() => completeTask(t.id)}
                  style={{ width: 16, height: 16, flexShrink: 0, border: `1px solid ${C.oxblood}`, backgroundColor: "transparent", cursor: "pointer", padding: 0 }}
                />
                <span style={{ fontFamily: sans, fontSize: 13 }}>{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {fiverrCompletedLog.length > 0 && (
        <div>
          <EyebrowLabel>Completed</EyebrowLabel>
          <div style={{ marginTop: 12 }}>
            {fiverrCompletedLog.slice(0, 20).map((entry) => (
              <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.greige}` }}>
                <span style={{ fontFamily: sans, fontSize: 13 }}>{entry.label}</span>
                <span style={{ fontFamily: sans, fontSize: 11, opacity: 0.6 }}>
                  {new Date(entry.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}