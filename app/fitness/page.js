"use client";

import { useState, useEffect } from "react";
import { WORKOUT, DAY_NAMES, todayKey } from "../../lib/schedule";
import { C, serif, sans, EyebrowLabel, PageHeader, StatTile, inputStyle } from "../../lib/theme";

export default function FitnessPage() {
  const [workoutLog, setWorkoutLog] = useState({});
  const [workoutNote, setWorkoutNote] = useState("");

  const dayIndex = new Date().getDay();

  useEffect(() => {
    fetch("/api/workouts").then((r) => r.json()).then((d) => setWorkoutLog(d.workoutLog || {}));
  }, []);

  async function toggleWorkoutDay(dateKey) {
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateKey }),
    });
    setWorkoutLog((await res.json()).workoutLog);
  }

  async function saveTodayNote() {
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: todayKey(), note: workoutNote, noteOnly: true }),
    });
    setWorkoutLog((await res.json()).workoutLog);
  }

  function currentStreak() {
    let streak = 0;
    let offset = 0;
    while (true) {
      const key = todayKey(-offset);
      if (workoutLog[key] && workoutLog[key].done) {
        streak += 1;
        offset += 1;
      } else break;
    }
    return streak;
  }

  const streak = currentStreak();
  const todayDone = !!(workoutLog[todayKey()] && workoutLog[todayKey()].done);
  const subtitle = WORKOUT[dayIndex].exercises.length === 0
    ? "Rest day today."
    : todayDone
    ? "Today's session is done."
    : `Today: ${WORKOUT[dayIndex].focus}.`;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "36px 24px 72px 24px" }}>
      <PageHeader title="Fitness" subtitle={subtitle} />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 32 }}>
        <StatTile label="Streak" value={`${streak} day${streak === 1 ? "" : "s"}`} />
      </div>

      <EyebrowLabel>Last 7 Days</EyebrowLabel>
      <div style={{ display: "flex", gap: 6, margin: "12px 0 32px 0" }}>
        {[6, 5, 4, 3, 2, 1, 0].map((offset) => {
          const key = todayKey(-offset);
          const done = workoutLog[key] && workoutLog[key].done;
          return (
            <button
              key={key}
              className="lux-toggle"
              onClick={() => toggleWorkoutDay(key)}
              title={key}
              style={{ flex: 1, height: 36, backgroundColor: done ? C.oxblood : "transparent", border: `1px solid ${done ? C.oxblood : C.greige}`, cursor: "pointer" }}
            />
          );
        })}
      </div>

      <EyebrowLabel>Today's Notes</EyebrowLabel>
      <input
        style={{ ...inputStyle, margin: "12px 0 32px 0" }}
        placeholder="How'd it feel? (optional)"
        value={workoutNote}
        onChange={(e) => setWorkoutNote(e.target.value)}
        onBlur={saveTodayNote}
        onKeyDown={(e) => e.key === "Enter" && saveTodayNote()}
      />

      <EyebrowLabel>Weekly Split</EyebrowLabel>
      <div style={{ marginTop: 14 }}>
        {DAY_NAMES.map((name, i) => (
          <div key={name} style={{ padding: "16px 0", borderBottom: `1px solid ${C.greige}`, ...(i === dayIndex ? { backgroundColor: C.lilac, padding: "16px 12px" } : {}) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <p style={{ fontFamily: sans, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: C.oxblood, margin: 0 }}>{name}</p>
              <p style={{ fontFamily: serif, fontSize: 16, margin: 0 }}>{WORKOUT[i].focus}</p>
            </div>
            {WORKOUT[i].exercises.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {WORKOUT[i].exercises.map((ex) => (
                  <div key={ex.name} style={{ display: "flex", justifyContent: "space-between", fontFamily: sans, fontSize: 13, padding: "3px 0" }}>
                    <span>{ex.name}</span>
                    <span style={{ opacity: 0.7 }}>{ex.sets}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <p style={{ fontFamily: sans, fontSize: 11, opacity: 0.55, marginTop: 20 }}>
        General strength program — adjust weights, reps, and rest to your own level.
      </p>
    </div>
  );
}
