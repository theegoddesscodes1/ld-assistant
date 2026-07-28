"use client";

import { useState, useEffect, useMemo } from "react";
import { C, serif, sans, EyebrowLabel, StatTile, Card, RemoveButton, buttonStyle, ghostButtonStyle, inputStyle, money } from "../lib/theme";
import { FIVERR_STATUSES } from "../lib/fiverrStatus";
import { TASK_TAGS } from "../lib/taskTags";

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

function SectionTitle({ children, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "36px 0 14px 0" }}>
      <EyebrowLabel>{children}</EyebrowLabel>
      {right}
    </div>
  );
}

export default function Page() {
  const [now, setNow] = useState(new Date());
  const [digest, setDigest] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [taskInput, setTaskInput] = useState("");
  const [taskTag, setTaskTag] = useState(TASK_TAGS[2]); // "Personal" by default
  const [notifStatus, setNotifStatus] = useState("unknown");

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  function loadDigest() {
    fetch("/api/digest").then((r) => r.json()).then(setDigest).catch(() => {});
  }

  useEffect(() => {
    loadDigest();
    // suggestions come from cache instantly; refresh happens server-side on schedule
    fetch("/api/suggestions").then((r) => r.json()).then((d) => { if (!d.error) setSuggestions(d); }).catch(() => {});
    // 30s keeps this fresh across devices/tabs without a manual reload
    const id = setInterval(loadDigest, 30 * 1000);

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

  async function refreshSuggestions() {
    setSuggestLoading(true);
    try {
      const d = await fetch("/api/suggestions?refresh=1").then((r) => r.json());
      if (!d.error) setSuggestions(d);
    } catch (e) {}
    setSuggestLoading(false);
  }

  async function addTask() {
    if (!taskInput.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: taskInput.trim(), tag: taskTag }),
    });
    setTaskInput("");
    loadDigest();
  }

  async function completeTask(id) {
    await fetch(`/api/tasks/${id}`, { method: "PATCH" });
    loadDigest();
  }

  async function deleteTask(id) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    loadDigest();
  }

  async function toggleWorkout() {
    await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, focus: digest?.workout?.focus }),
    });
    loadDigest();
  }

  async function toggleBusinessFocus() {
    await fetch("/api/business-focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, focus: digest?.businessFocus?.focus }),
    });
    loadDigest();
  }

  async function updateFiverrStatus(id, status) {
    await fetch(`/api/fiverr/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadDigest();
  }

  // derived
  const tasks = digest?.tasks || [];
  const workoutHasSession = (digest?.workout?.exercises?.length || 0) > 0;

  const focusLine = useMemo(() => {
    if (!digest) return "Pulling today together...";
    const dueToday = (digest.fiverrActive || []).find((c) => c.deadline === today);
    if (dueToday) return `${dueToday.client} is due today.`;
    if (digest.newsletter?.dueStatus === "overdue") return "Your newsletter's overdue — worth sending soon.";
    if (digest.inventoryAlerts?.length) return `${digest.inventoryAlerts[0].title} is running low — ${digest.inventoryAlerts[0].totalInventory} left.`;
    if (suggestions?.focusToday) return suggestions.focusToday;
    if (digest.businessFocus?.done && digest.fitness?.todayDone) return "Today's focus and workout are both done — nice.";
    return `Today's focus: ${digest.businessFocus?.focus}.`;
  }, [suggestions, digest, today]);

  const s = digest?.shopify?.summary;
  const fin = digest?.finances;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px 80px 24px" }}>
      {notifStatus === "off" && (
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <button className="lux-btn" onClick={enableNotifications} style={buttonStyle}>
            Enable Notifications
          </button>
        </div>
      )}
      {notifStatus === "denied" && (
        <p style={{ textAlign: "center", fontSize: 12, color: C.charcoal, opacity: 0.6, marginBottom: 16 }}>
          Notifications are blocked in your browser settings.
        </p>
      )}

      {/* GREETING */}
      <p style={{ fontFamily: serif, fontSize: 36, margin: "0 0 6px 0", color: C.charcoal, lineHeight: 1.15 }}>
        {greetingFor(now.getHours())}, Kerry.
      </p>
      <p style={{ fontFamily: sans, fontSize: 14, margin: "0 0 4px 0", color: C.charcoal, opacity: 0.65 }}>
        {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </p>
      <p style={{ fontFamily: serif, fontStyle: "italic", fontSize: 16, margin: "10px 0 0 0", color: C.oxblood, lineHeight: 1.5 }}>
        {focusLine}
      </p>

      {/* ACTIVE FIVERR — priority placement, near the top */}
      {digest?.fiverrPriority && (
        <Card style={{ marginTop: 20, borderColor: C.oxblood }}>
          <EyebrowLabel>Active Fiverr — Priority</EyebrowLabel>
          <p style={{ fontFamily: serif, fontSize: 19, margin: "8px 0 2px 0" }}>{digest.fiverrPriority.client}</p>
          <p style={{ fontFamily: sans, fontSize: 13, opacity: 0.7, margin: "0 0 12px 0" }}>
            {digest.fiverrPriority.gigType}
            {digest.fiverrPriority.deadline ? ` · due ${digest.fiverrPriority.deadline}` : ""}
          </p>
          <select
            value={digest.fiverrPriority.status}
            onChange={(e) => updateFiverrStatus(digest.fiverrPriority.id, e.target.value)}
            style={{ fontFamily: sans, fontSize: 12, border: `1px solid ${C.greige}`, padding: "6px 8px", backgroundColor: C.warmWhite, marginBottom: 10 }}
          >
            {FIVERR_STATUSES.map((s2) => (
              <option key={s2} value={s2}>{s2}</option>
            ))}
          </select>
          {digest.fiverrPriority.nextStep && (
            <p style={{ fontFamily: sans, fontSize: 13, margin: 0, fontStyle: "italic", opacity: 0.8 }}>{digest.fiverrPriority.nextStep}</p>
          )}
          {digest.fiverrActive.length > 1 && (
            <p style={{ fontFamily: sans, fontSize: 11, margin: "10px 0 0 0", opacity: 0.5 }}>
              +{digest.fiverrActive.length - 1} more active — full list on the Fiverr page.
            </p>
          )}
        </Card>
      )}

      {/* AT A GLANCE — everything on one screen */}
      <SectionTitle>At a Glance</SectionTitle>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {s ? (
          <StatTile
            label="Store, 7 Days"
            value={money(s.revenueLast7Days)}
            sub={
              s.revenuePrevious7Days > 0
                ? `${s.revenueLast7Days >= s.revenuePrevious7Days ? "up" : "down"} from ${money(s.revenuePrevious7Days)}`
                : `${s.ordersLast7Days} orders`
            }
            trend={s.revenuePrevious7Days > 0 && s.revenueLast7Days >= s.revenuePrevious7Days ? "up" : undefined}
          />
        ) : (
          <StatTile label="Store, 7 Days" value="—" sub="connect Shopify" />
        )}
        {fin && <StatTile label="Net (all sources)" value={money(fin.net)} sub={`${money(fin.income)} in`} />}
        <StatTile label="Workout Streak" value={`${digest?.fitness?.streak ?? 0}d`} sub={digest?.fitness?.todayDone ? "done today" : "not yet today"} />
        {digest?.velvet?.latest?.totalUsers != null && (
          <StatTile label="Velvet Users" value={digest.velvet.latest.totalUsers.toLocaleString()} />
        )}
      </div>

      {/* TODAY'S PLAN */}
      <SectionTitle>Today's Plan</SectionTitle>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card style={{ flex: "1 1 260px" }}>
          <EyebrowLabel>Business</EyebrowLabel>
          {digest?.businessFocus?.done ? (
            <>
              <p style={{ fontFamily: serif, fontSize: 19, margin: "8px 0 6px 0" }}>Done for today ✓</p>
              <p style={{ fontFamily: sans, fontSize: 13, margin: "0 0 12px 0", lineHeight: 1.5, opacity: 0.75 }}>
                {digest?.fiverrPriority
                  ? `Next up: ${digest.fiverrPriority.client} needs ${digest.fiverrPriority.status.toLowerCase()}.`
                  : suggestions?.focusToday || "Nothing else flagged — check Tasks below."}
              </p>
            </>
          ) : (
            <>
              <p style={{ fontFamily: serif, fontSize: 19, margin: "8px 0 6px 0" }}>{digest?.businessFocus?.focus || "—"}</p>
              <p style={{ fontFamily: sans, fontSize: 13, margin: "0 0 12px 0", lineHeight: 1.5 }}>{digest?.businessFocus?.detail}</p>
            </>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: sans, fontSize: 13 }}>
            <input type="checkbox" checked={!!digest?.businessFocus?.done} onChange={toggleBusinessFocus} />
            Mark done
          </label>
        </Card>
        <Card style={{ flex: "1 1 260px" }}>
          <EyebrowLabel>Workout</EyebrowLabel>
          <p style={{ fontFamily: serif, fontSize: 19, margin: "8px 0 6px 0" }}>{digest?.workout?.focus || "—"}</p>
          {workoutHasSession ? (
            <>
              <p style={{ fontFamily: sans, fontSize: 12, margin: "0 0 10px 0", opacity: 0.7, lineHeight: 1.5 }}>
                {digest.workout.exercises.map((e) => e.name).join(", ")}
              </p>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: sans, fontSize: 13 }}>
                <input type="checkbox" checked={!!digest?.fitness?.todayDone} onChange={toggleWorkout} />
                Mark done
              </label>
            </>
          ) : (
            <p style={{ fontFamily: sans, fontSize: 13, margin: 0, opacity: 0.6 }}>Rest day.</p>
          )}
        </Card>
      </div>

      {/* AI SUGGESTIONS — the proactive core */}
      <SectionTitle
        right={
          <button
            onClick={refreshSuggestions}
            disabled={suggestLoading}
            style={{ fontFamily: sans, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", background: "none", border: "none", color: C.oxblood, cursor: "pointer" }}
          >
            {suggestLoading ? "thinking..." : "refresh"}
          </button>
        }
      >
        What To Do Next
      </SectionTitle>

      {!suggestions && (
        <Card>
          <p style={{ fontFamily: sans, fontSize: 13, opacity: 0.7, margin: 0, lineHeight: 1.6 }}>
            {suggestLoading
              ? "Analyzing your sales, catalog, Fiverr orders, and latest trends..."
              : "Tap refresh to have your assistant analyze your real data and suggest products, posts, Fiverr moves, and newsletter timing. (Needs the Anthropic key connected.)"}
          </p>
        </Card>
      )}

      {suggestions && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Products */}
          {suggestions.products?.length > 0 && (
            <Card>
              <EyebrowLabel>Products To Consider</EyebrowLabel>
              <div style={{ marginTop: 10 }}>
                {suggestions.products.map((p, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: i < suggestions.products.length - 1 ? `1px solid ${C.greige}` : "none" }}>
                    <span style={{ fontFamily: sans, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: p.action === "remove" ? C.oxblood : C.charcoal, backgroundColor: C.lilac, padding: "2px 8px", marginRight: 8 }}>
                      {p.action}
                    </span>
                    <span style={{ fontFamily: serif, fontSize: 15 }}>{p.name}</span>
                    <p style={{ fontFamily: sans, fontSize: 13, margin: "4px 0 0 0", opacity: 0.75, lineHeight: 1.5 }}>{p.why}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Fiverr */}
          {suggestions.fiverr?.length > 0 && (
            <Card>
              <EyebrowLabel>Fiverr</EyebrowLabel>
              <div style={{ marginTop: 10 }}>
                {suggestions.fiverr.map((f, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: i < suggestions.fiverr.length - 1 ? `1px solid ${C.greige}` : "none" }}>
                    <p style={{ fontFamily: sans, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{f.suggestion}</p>
                    <p style={{ fontFamily: sans, fontSize: 12, margin: "4px 0 0 0", opacity: 0.6 }}>{f.why}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Social */}
          {suggestions.social?.length > 0 && (
            <Card>
              <EyebrowLabel>Post Ideas</EyebrowLabel>
              <div style={{ marginTop: 10 }}>
                {suggestions.social.map((post, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: i < suggestions.social.length - 1 ? `1px solid ${C.greige}` : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: sans, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: C.oxblood }}>{post.platform}</span>
                      {post.when && <span style={{ fontFamily: sans, fontSize: 11, opacity: 0.6 }}>{post.when}</span>}
                    </div>
                    <p style={{ fontFamily: sans, fontSize: 13, margin: "4px 0 0 0", lineHeight: 1.5 }}>{post.idea}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Newsletter */}
          {suggestions.newsletter && (
            <Card style={{ borderColor: suggestions.newsletter.shouldSend ? C.oxblood : C.greige }}>
              <EyebrowLabel>Newsletter</EyebrowLabel>
              <p style={{ fontFamily: serif, fontSize: 16, margin: "8px 0 6px 0" }}>
                {suggestions.newsletter.shouldSend ? "Worth sending one soon" : "No rush right now"}
                {digest?.newsletter?.lastSent ? ` · last sent ${digest.newsletter.daysSince}d ago` : ""}
              </p>
              <p style={{ fontFamily: sans, fontSize: 13, margin: "0 0 10px 0", opacity: 0.8, lineHeight: 1.5 }}>{suggestions.newsletter.why}</p>
              {suggestions.newsletter.themes?.length > 0 && (
                <div>
                  <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: C.oxblood, margin: "0 0 4px 0" }}>Content ideas</p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {suggestions.newsletter.themes.map((t, i) => (
                      <li key={i} style={{ fontFamily: sans, fontSize: 13, lineHeight: 1.6 }}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          {/* Growth */}
          {suggestions.growth?.length > 0 && (
            <Card>
              <EyebrowLabel>Grow Your Skills</EyebrowLabel>
              <div style={{ marginTop: 10 }}>
                {suggestions.growth.map((g, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: i < suggestions.growth.length - 1 ? `1px solid ${C.greige}` : "none" }}>
                    <span style={{ fontFamily: sans, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: C.oxblood }}>{g.area}</span>
                    <p style={{ fontFamily: sans, fontSize: 13, margin: "4px 0 0 0", lineHeight: 1.5 }}>
                      {g.suggestion}
                      {g.link ? <> — <a href={g.link} target="_blank" rel="noreferrer" style={{ color: C.oxblood }}>link</a></> : null}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {suggestions.generatedAt && (
            <p style={{ fontFamily: sans, fontSize: 11, opacity: 0.5, margin: "2px 0 0 0" }}>
              Updated {new Date(suggestions.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          )}
        </div>
      )}

      {/* TASKS */}
      <SectionTitle>Tasks {tasks.length > 0 ? `· ${tasks.length} open` : ""}</SectionTitle>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          style={{ ...inputStyle, flex: "1 1 180px" }}
          placeholder="Add a task..."
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
        <select style={{ ...inputStyle, width: "auto" }} value={taskTag} onChange={(e) => setTaskTag(e.target.value)}>
          {TASK_TAGS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button className="lux-btn" onClick={addTask} style={buttonStyle}>Add</button>
      </div>
      {tasks.length === 0 && (
        <p style={{ fontFamily: sans, fontSize: 13, opacity: 0.6, margin: "4px 0" }}>Nothing open — add one above.</p>
      )}
      {tasks.map((t) => (
        <div key={t.id} className="lux-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 6px", borderBottom: `1px solid ${C.greige}` }}>
          <button
            className="lux-toggle"
            onClick={() => completeTask(t.id)}
            style={{ width: 18, height: 18, flexShrink: 0, border: `1px solid ${C.oxblood}`, backgroundColor: "transparent", cursor: "pointer", padding: 0 }}
          />
          <span style={{ fontFamily: sans, fontSize: 14, flex: 1 }}>{t.text}</span>
          <span style={{ fontFamily: sans, fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", opacity: 0.5 }}>{t.tag || "Personal"}</span>
          <RemoveButton onClick={() => deleteTask(t.id)} />
        </div>
      ))}
    </div>
  );
}