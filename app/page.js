"use client";

import { useState, useEffect, useMemo } from "react";
import { RHYTHM, WORKOUT, todayKey } from "../lib/schedule";
import { C, serif, sans, EyebrowLabel, StatTile, Card, RemoveButton, buttonStyle, ghostButtonStyle, inputStyle, money } from "../lib/theme";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function greetingFor(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Page() {
  const [now, setNow] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [workoutLog, setWorkoutLog] = useState({});
  const [businessFocusLog, setBusinessFocusLog] = useState({});
  const [taskInput, setTaskInput] = useState("");
  const [notifStatus, setNotifStatus] = useState("unknown");
  const [shopify, setShopify] = useState(null);
  const [fiverrClients, setFiverrClients] = useState([]);
  const [newsletter, setNewsletter] = useState(null);

  const dayIndex = now.getDay();
  const today = todayKey();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  function loadAll() {
    fetch("/api/tasks").then((r) => r.json()).then((d) => setTasks(d.tasks || []));
    fetch("/api/workouts").then((r) => r.json()).then((d) => setWorkoutLog(d.workoutLog || {}));
    fetch("/api/business-focus").then((r) => r.json()).then((d) => setBusinessFocusLog(d.log || {}));
    fetch("/api/shopify").then((r) => r.json()).then(setShopify).catch(() => {});
    fetch("/api/fiverr").then((r) => r.json()).then((d) => setFiverrClients(d.clients || [])).catch(() => {});
    fetch("/api/newsletter").then((r) => r.json()).then(setNewsletter).catch(() => {});
  }

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 5 * 60 * 1000);

    if (typeof window !== "undefined") {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) setNotifStatus("unsupported");
      else if (Notification.permission === "denied") setNotifStatus("denied");
      else if (Notification.permission === "granted") setNotifStatus("on");
      else setNotifStatus("off");
    }
    return () => clearInterval(id);
  }, []);

  async function enableNotifications() {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotifStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      setNotifStatus("on");
    } catch (e) {
      setNotifStatus("off");
    }
  }

  async function addTask() {
    if (!taskInput.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: taskInput.trim() }),
    });
    setTasks((await res.json()).tasks);
    setTaskInput("");
  }

  async function toggleTask(id) {
    const res = await fetch(`/api/tasks/${id}`, { method: "PATCH" });
    setTasks((await res.json()).tasks);
  }

  async function deleteTask(id) {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((await res.json()).tasks);
  }

  async function toggleWorkout() {
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today }),
    });
    setWorkoutLog((await res.json()).workoutLog);
  }

  async function toggleBusinessFocus() {
    const res = await fetch("/api/business-focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today }),
    });
    setBusinessFocusLog((await res.json()).log);
  }

  async function logNewsletterSend() {
    await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logSend" }),
    });
    fetch("/api/newsletter").then((r) => r.json()).then(setNewsletter);
  }

  const openTasks = tasks.filter((t) => !t.done);
  const doneCount = tasks.filter((t) => t.done).length;
  const workoutHasSession = WORKOUT[dayIndex].exercises.length > 0;
  const workoutDone = !!(workoutLog[today] && workoutLog[today].done);
  const businessFocusDone = !!businessFocusLog[today];

  const checklistTotal = 1 + (workoutHasSession ? 1 : 0);
  const checklistDone = (businessFocusDone ? 1 : 0) + (workoutHasSession && workoutDone ? 1 : 0);
  const progressPct = Math.round((checklistDone / checklistTotal) * 100);

  const nextDeadline = useMemo(() => {
    return fiverrClients
      .filter((c) => c.status !== "Delivered" && c.deadline)
      .sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
  }, [fiverrClients]);

  const dayShapeLine = useMemo(() => {
    const deadlineToday = nextDeadline && nextDeadline.deadline === today;
    if (deadlineToday) return `${nextDeadline.client} is due today.`;
    if (newsletter?.dueStatus === "overdue") return "Your newsletter's overdue — worth sending today.";
    if (openTasks.length > 6) return "A full list today — pick one thing to lead with.";
    if (openTasks.length === 0 && !workoutHasSession) return "Nothing urgent on the list — a good day to get ahead.";
    if (nextDeadline) return `Next up for Fiverr: ${nextDeadline.client}, due ${nextDeadline.deadline}.`;
    return "Here's what's on for today.";
  }, [nextDeadline, newsletter, openTasks.length, workoutHasSession, today]);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "36px 24px 72px 24px" }}>
      {notifStatus === "off" && (
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <button className="lux-btn" onClick={enableNotifications} style={buttonStyle}>
            Enable Notifications
          </button>
        </div>
      )}

      {/* GREETING */}
      <p style={{ fontFamily: serif, fontSize: 36, margin: "0 0 6px 0", color: C.charcoal, lineHeight: 1.15 }}>
        {greetingFor(now.getHours())}, Kerry.
      </p>
      <p style={{ fontFamily: sans, fontSize: 14, margin: "0 0 4px 0", color: C.charcoal, opacity: 0.65 }}>
        {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </p>
      <p style={{ fontFamily: serif, fontStyle: "italic", fontSize: 16, margin: "10px 0 32px 0", color: C.oxblood }}>
        {dayShapeLine}
      </p>

      {/* DAY PROGRESS */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <EyebrowLabel>Today's Progress</EyebrowLabel>
          <span style={{ fontFamily: sans, fontSize: 12, color: C.charcoal, opacity: 0.6 }}>
            {checklistDone}/{checklistTotal}
          </span>
        </div>
        <div style={{ height: 4, backgroundColor: C.greige, width: "100%" }}>
          <div style={{ height: 4, backgroundColor: C.oxblood, width: `${progressPct}%`, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 32 }}>
        {shopify?.summary ? (
          <>
            <StatTile
              label="Revenue, 7 Days"
              value={money(shopify.summary.revenueLast7Days)}
              sub={
                shopify.summary.revenuePrevious7Days > 0
                  ? `${shopify.summary.revenueLast7Days >= shopify.summary.revenuePrevious7Days ? "up" : "down"} from ${money(shopify.summary.revenuePrevious7Days)} the week before`
                  : null
              }
              trend={shopify.summary.revenueLast7Days >= shopify.summary.revenuePrevious7Days ? "up" : "down"}
            />
            <StatTile label="Orders, 7 Days" value={shopify.summary.ordersLast7Days} />
            <StatTile label="Avg Order" value={money(shopify.summary.avgOrderValue7d)} />
          </>
        ) : (
          <Card style={{ flex: "1 1 100%" }}>
            <EyebrowLabel>Sales</EyebrowLabel>
            <p style={{ fontFamily: sans, fontSize: 13, margin: "8px 0 0 0", opacity: 0.6 }}>
              Connect Shopify to see real revenue here — see README.
            </p>
          </Card>
        )}
      </div>

      {/* NEWSLETTER NUDGE */}
      {newsletter && (
        <Card
          style={{
            borderColor: newsletter.dueStatus === "overdue" ? C.oxblood : C.greige,
            marginBottom: 32,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <EyebrowLabel>Newsletter</EyebrowLabel>
            <p style={{ fontFamily: sans, fontSize: 13, margin: "6px 0 0 0" }}>
              {newsletter.lastSent
                ? `Last sent ${newsletter.daysSinceLastSend} day${newsletter.daysSinceLastSend === 1 ? "" : "s"} ago${
                    newsletter.dueStatus === "overdue" ? " — worth sending soon" : ""
                  }.`
                : `No sends logged yet. Target cadence: every ${newsletter.cadenceDays} days.`}
            </p>
          </div>
          <button className="lux-pill" onClick={logNewsletterSend} style={ghostButtonStyle}>
            Log a Send
          </button>
        </Card>
      )}

      {/* FOCUS CARDS */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <Card style={{ flex: "1 1 280px" }}>
          <EyebrowLabel>Business Focus</EyebrowLabel>
          <p style={{ fontFamily: serif, fontSize: 20, margin: "8px 0 6px 0" }}>{RHYTHM[dayIndex].focus}</p>
          <p style={{ fontFamily: sans, fontSize: 13, margin: "0 0 12px 0", lineHeight: 1.5 }}>{RHYTHM[dayIndex].detail}</p>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: sans, fontSize: 13 }}>
            <input type="checkbox" checked={businessFocusDone} onChange={toggleBusinessFocus} />
            Done for today
          </label>
        </Card>
        <Card style={{ flex: "1 1 280px" }}>
          <EyebrowLabel>Workout Focus</EyebrowLabel>
          <p style={{ fontFamily: serif, fontSize: 20, margin: "8px 0 6px 0" }}>{WORKOUT[dayIndex].focus}</p>
          {workoutHasSession ? (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: sans, fontSize: 13 }}>
              <input type="checkbox" checked={workoutDone} onChange={toggleWorkout} />
              Done for today
            </label>
          ) : (
            <p style={{ fontFamily: sans, fontSize: 13, margin: 0, opacity: 0.6 }}>Rest day.</p>
          )}
        </Card>
      </div>

      {/* FIVERR DEADLINE */}
      {nextDeadline && (
        <Card style={{ marginBottom: 32 }}>
          <EyebrowLabel>Next Fiverr Deadline</EyebrowLabel>
          <p style={{ fontFamily: serif, fontSize: 18, margin: "8px 0 2px 0" }}>{nextDeadline.client}</p>
          <p style={{ fontFamily: sans, fontSize: 13, margin: 0, opacity: 0.7 }}>{nextDeadline.gigType} &middot; due {nextDeadline.deadline}</p>
        </Card>
      )}

      {/* TASKS */}
      <EyebrowLabel>
        Tasks &middot; {openTasks.length} open{doneCount > 0 ? `, ${doneCount} done` : ""}
      </EyebrowLabel>
      <div style={{ display: "flex", gap: 8, margin: "12px 0 16px 0" }}>
        <input
          style={inputStyle}
          placeholder="Add a task..."
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
        <button className="lux-btn" onClick={addTask} style={buttonStyle}>
          Add
        </button>
      </div>
      {tasks.map((t) => (
        <div key={t.id} className="lux-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 6px", borderBottom: `1px solid ${C.greige}` }}>
          <button
            className="lux-toggle"
            onClick={() => toggleTask(t.id)}
            style={{ width: 18, height: 18, flexShrink: 0, border: `1px solid ${C.oxblood}`, backgroundColor: t.done ? C.oxblood : "transparent", cursor: "pointer", padding: 0 }}
          />
          <span style={{ fontFamily: sans, fontSize: 14, flex: 1, textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.5 : 1 }}>{t.text}</span>
          <RemoveButton onClick={() => deleteTask(t.id)} />
        </div>
      ))}
    </div>
  );
}
