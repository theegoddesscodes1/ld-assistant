"use client";

import { useState, useEffect, useMemo } from "react";
import { todayKey } from "../../lib/schedule";
import { C, serif, sans, EyebrowLabel, PageHeader, StatTile, Card, Row, RemoveButton, buttonStyle, inputStyle } from "../../lib/theme";

const LEARNING_TYPES = ["Book", "Course", "Article", "Skill"];
const LEARNING_STATUSES = ["Want to", "In Progress", "Done"];

export default function GrowthPage() {
  const [learning, setLearning] = useState([]);
  const [learnTitle, setLearnTitle] = useState("");
  const [learnType, setLearnType] = useState("Book");

  const [routineItems, setRoutineItems] = useState([]);
  const [routineLog, setRoutineLog] = useState({});
  const [newRoutineItem, setNewRoutineItem] = useState("");

  const [healthLog, setHealthLog] = useState({});
  const [sleepHours, setSleepHours] = useState("");
  const [waterGlasses, setWaterGlasses] = useState("");
  const [restDay, setRestDay] = useState(false);

  const today = todayKey();

  useEffect(() => {
    fetch("/api/learning").then((r) => r.json()).then((d) => setLearning(d.items || []));
    fetch("/api/routine").then((r) => r.json()).then((d) => {
      setRoutineItems(d.items || []);
      setRoutineLog(d.log || {});
    });
    fetch("/api/health").then((r) => r.json()).then((d) => {
      setHealthLog(d.log || {});
      const t = (d.log || {})[today];
      if (t) {
        setSleepHours(t.sleepHours ?? "");
        setWaterGlasses(t.waterGlasses ?? "");
        setRestDay(!!t.restDay);
      }
    });
  }, []);

  async function addLearning() {
    if (!learnTitle.trim()) return;
    const res = await fetch("/api/learning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: learnTitle.trim(), type: learnType }),
    });
    setLearning((await res.json()).items);
    setLearnTitle("");
  }

  async function updateLearningStatus(id, status) {
    const res = await fetch(`/api/learning/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLearning((await res.json()).items);
  }

  async function deleteLearning(id) {
    const res = await fetch(`/api/learning/${id}`, { method: "DELETE" });
    setLearning((await res.json()).items);
  }

  async function addRoutineItem() {
    if (!newRoutineItem.trim()) return;
    const res = await fetch("/api/routine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addItem", text: newRoutineItem.trim() }),
    });
    const data = await res.json();
    setRoutineItems(data.items);
    setNewRoutineItem("");
  }

  async function toggleRoutine(item) {
    const res = await fetch("/api/routine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", date: today, item }),
    });
    const data = await res.json();
    setRoutineLog(data.log);
  }

  async function saveHealth() {
    const res = await fetch("/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        sleepHours: sleepHours === "" ? undefined : Number(sleepHours),
        waterGlasses: waterGlasses === "" ? undefined : Number(waterGlasses),
        restDay,
      }),
    });
    setHealthLog((await res.json()).log);
  }

  const todaysRoutineDone = new Set(routineLog[today] || []);
  const inProgressCount = learning.filter((l) => l.status === "In Progress").length;
  const routinePct = routineItems.length ? Math.round((todaysRoutineDone.size / routineItems.length) * 100) : 0;

  const subtitle = useMemo(() => {
    const bits = [];
    if (inProgressCount > 0) bits.push(`${inProgressCount} learning in progress`);
    bits.push(`routine ${routinePct}% today`);
    return bits.join(" \u00b7 ") + ".";
  }, [inProgressCount, routinePct]);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "36px 24px 72px 24px" }}>
      <PageHeader title="Growth" subtitle={subtitle} />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 40 }}>
        <StatTile label="Learning" value={learning.length} sub={`${inProgressCount} in progress`} />
        <StatTile label="Routine Today" value={`${routinePct}%`} sub={`${todaysRoutineDone.size}/${routineItems.length} steps`} />
      </div>

      {/* LEARNING */}
      <EyebrowLabel>Learning</EyebrowLabel>
      <div style={{ display: "flex", gap: 8, margin: "14px 0 16px 0", flexWrap: "wrap" }}>
        <input style={{ ...inputStyle, flex: "1 1 200px" }} placeholder="Book, course, skill..." value={learnTitle} onChange={(e) => setLearnTitle(e.target.value)} />
        <select style={{ ...inputStyle, width: "auto" }} value={learnType} onChange={(e) => setLearnType(e.target.value)}>
          {LEARNING_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button className="lux-btn" style={buttonStyle} onClick={addLearning}>Add</button>
      </div>
      <div style={{ marginBottom: 40 }}>
        {learning.map((item) => (
          <Row key={item.id}>
            <div>
              <span style={{ fontFamily: sans, fontSize: 14 }}>{item.title}</span>
              <span style={{ fontFamily: sans, fontSize: 11, opacity: 0.6, marginLeft: 8 }}>{item.type}</span>
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <select
                value={item.status}
                onChange={(e) => updateLearningStatus(item.id, e.target.value)}
                style={{ fontFamily: sans, fontSize: 11, border: `1px solid ${C.greige}`, padding: "4px 6px", backgroundColor: C.warmWhite }}
              >
                {LEARNING_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <RemoveButton onClick={() => deleteLearning(item.id)} />
            </div>
          </Row>
        ))}
      </div>

      {/* SELF-CARE */}
      <div style={{ marginBottom: 40 }}>
        <EyebrowLabel>Self-Care Routine &middot; Today</EyebrowLabel>
        <Card style={{ marginTop: 12 }}>
          {routineItems.map((item) => (
            <label key={item} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: sans, fontSize: 14, padding: "6px 0" }}>
              <input type="checkbox" checked={todaysRoutineDone.has(item)} onChange={() => toggleRoutine(item)} />
              {item}
            </label>
          ))}
        </Card>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input style={inputStyle} placeholder="Add a routine step..." value={newRoutineItem} onChange={(e) => setNewRoutineItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRoutineItem()} />
          <button className="lux-btn" style={buttonStyle} onClick={addRoutineItem}>Add</button>
        </div>
      </div>

      {/* HEALTH */}
      <div>
        <EyebrowLabel>Health &middot; Today</EyebrowLabel>
        <Card style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <label style={{ fontFamily: sans, fontSize: 11, opacity: 0.6, display: "block", marginBottom: 4 }}>Sleep (hrs)</label>
              <input style={{ ...inputStyle, width: 80 }} type="number" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} />
            </div>
            <div>
              <label style={{ fontFamily: sans, fontSize: 11, opacity: 0.6, display: "block", marginBottom: 4 }}>Water (glasses)</label>
              <input style={{ ...inputStyle, width: 80 }} type="number" value={waterGlasses} onChange={(e) => setWaterGlasses(e.target.value)} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: sans, fontSize: 13, marginTop: 18, cursor: "pointer" }}>
              <input type="checkbox" checked={restDay} onChange={(e) => setRestDay(e.target.checked)} />
              Rest day
            </label>
          </div>
          <button className="lux-btn" style={buttonStyle} onClick={saveHealth}>Save Today</button>
        </Card>
      </div>
    </div>
  );
}
