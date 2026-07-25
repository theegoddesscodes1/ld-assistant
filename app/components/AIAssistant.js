"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { C, serif, sans } from "../../lib/theme";

const QUICK_PROMPTS = [
  "Suggest 3 new products to add",
  "5 Instagram post ideas",
  "5 TikTok post ideas",
  "5 Pinterest post ideas",
  "When should I send my next newsletter?",
];

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError("Couldn't reach the assistant — check ANTHROPIC_API_KEY is set.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Open assistant"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          backgroundColor: C.oxblood,
          color: C.warmWhite,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(51,51,51,0.25)",
          zIndex: 1000,
        }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 84,
            right: 20,
            width: "min(380px, calc(100vw - 40px))",
            height: "min(560px, calc(100vh - 140px))",
            backgroundColor: C.warmWhite,
            border: `1px solid ${C.greige}`,
            boxShadow: "0 12px 40px rgba(51,51,51,0.18)",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
          }}
        >
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.greige}` }}>
            <p style={{ fontFamily: serif, fontSize: 16, margin: 0, color: C.charcoal }}>Your Assistant</p>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
            {messages.length === 0 && (
              <div>
                <p style={{ fontFamily: sans, fontSize: 13, color: C.charcoal, opacity: 0.7, marginBottom: 14, lineHeight: 1.5 }}>
                  Knows your sales, catalog, schedule, and latest research. Ask anything.
                </p>
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      fontFamily: sans,
                      fontSize: 12,
                      color: C.oxblood,
                      backgroundColor: "transparent",
                      border: `1px solid ${C.greige}`,
                      padding: "9px 12px",
                      marginBottom: 8,
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <p style={{ fontFamily: sans, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: m.role === "user" ? C.charcoal : C.oxblood, opacity: 0.6, margin: "0 0 4px 0" }}>
                  {m.role === "user" ? "You" : "Assistant"}
                </p>
                <p style={{ fontFamily: sans, fontSize: 13, lineHeight: 1.6, color: C.charcoal, margin: 0, whiteSpace: "pre-wrap" }}>{m.content}</p>
              </div>
            ))}

            {loading && <p style={{ fontFamily: sans, fontSize: 12, color: C.charcoal, opacity: 0.5 }}>Thinking...</p>}
            {error && <p style={{ fontFamily: sans, fontSize: 12, color: C.oxblood }}>{error}</p>}
          </div>

          <div style={{ display: "flex", borderTop: `1px solid ${C.greige}`, padding: 10, gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask anything..."
              style={{
                flex: 1,
                fontFamily: sans,
                fontSize: 13,
                border: `1px solid ${C.greige}`,
                padding: "9px 10px",
                outline: "none",
                backgroundColor: C.warmWhite,
                color: C.charcoal,
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading}
              style={{ backgroundColor: "#000000", border: "none", color: C.warmWhite, padding: "0 14px", cursor: "pointer" }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
