"use client";

import { useState, useEffect } from "react";
import { C, serif, sans, EyebrowLabel, PageHeader, StatTile, Card, Row, RemoveButton, buttonStyle, inputStyle, money } from "../../lib/theme";

const BUSINESSES = ["Lilac Desk", "Fiverr", "Velvet Circle"];
const INCOME_CATEGORIES = ["Product Sale", "Client Payment", "Other Income"];
const EXPENSE_CATEGORIES = ["Materials/Tools", "Software/Subscriptions", "Marketing", "Fees", "Other Expense"];

export default function FinancesPage() {
  const [transactions, setTransactions] = useState([]);
  const [type, setType] = useState("income");
  const [business, setBusiness] = useState("Lilac Desk");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [setAsidePercent, setSetAsidePercent] = useState("");
  const [savedPercent, setSavedPercent] = useState(null);

  const [computed, setComputed] = useState(null);

  useEffect(() => {
    fetch("/api/finances").then((r) => r.json()).then((d) => {
      setTransactions(d.transactions || []);
      setComputed(d.computed || null);
    });
    fetch("/api/finances/settings").then((r) => r.json()).then((d) => {
      setSavedPercent(d.setAsidePercent);
      if (d.setAsidePercent != null) setSetAsidePercent(String(d.setAsidePercent));
    });
  }, []);

  async function addTransaction() {
    if (!amount || isNaN(Number(amount))) return;
    const res = await fetch("/api/finances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, business, amount, category, note: note.trim() }),
    });
    setTransactions((await res.json()).transactions);
    setAmount("");
    setNote("");
  }

  async function deleteTransaction(id) {
    const res = await fetch(`/api/finances/${id}`, { method: "DELETE" });
    setTransactions((await res.json()).transactions);
  }

  async function savePercent() {
    const res = await fetch("/api/finances/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setAsidePercent: Number(setAsidePercent) }),
    });
    const data = await res.json();
    if (data.setAsidePercent !== undefined) setSavedPercent(data.setAsidePercent);
  }

  // Prefer the server-computed totals (which fold in Shopify sales, Velvet Circle
  // revenue, and delivered Fiverr gigs automatically). Fall back to manual-only.
  const manualIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const manualExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalIncome = computed ? computed.income : manualIncome;
  const totalExpense = computed ? computed.expense : manualExpense;
  const net = totalIncome - totalExpense;
  const setAside = computed?.setAside != null ? computed.setAside : (savedPercent != null ? (totalIncome * savedPercent) / 100 : null);

  const byBusiness = (biz) => {
    if (computed?.bySource && computed.bySource[biz] !== undefined) {
      const exp = transactions.filter((t) => t.business === biz && t.type === "expense").reduce((s, t) => s + t.amount, 0);
      return { inc: computed.bySource[biz], exp };
    }
    const inc = transactions.filter((t) => t.business === biz && t.type === "income").reduce((s, t) => s + t.amount, 0);
    const exp = transactions.filter((t) => t.business === biz && t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { inc, exp };
  };

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "36px 24px 72px 24px" }}>
      <PageHeader title="Finances" subtitle={computed ? `Net ${money(net)} — includes Shopify, Velvet Circle, and delivered Fiverr automatically.` : `Net ${money(net)} logged so far.`} />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <StatTile label="Total Income" value={money(totalIncome)} sub={computed?.auto?.shopifyRevenue ? `${money(computed.auto.shopifyRevenue)} from store` : null} />
        <StatTile label="Total Expenses" value={money(totalExpense)} />
        <StatTile label="Net" value={money(net)} />
      </div>

      {BUSINESSES.map((biz) => {
        const { inc, exp } = byBusiness(biz);
        return (
          <p key={biz} style={{ fontFamily: sans, fontSize: 12, opacity: 0.7, margin: "0 0 6px 0" }}>
            {biz}: {money(inc)} in &middot; {money(exp)} out
          </p>
        );
      })}

      <Card style={{ marginTop: 24, marginBottom: 32 }}>
        <EyebrowLabel>Tax Set-Aside</EyebrowLabel>
        <p style={{ fontFamily: sans, fontSize: 12, opacity: 0.6, margin: "8px 0 12px 0" }}>
          Set the percentage yourself — check with an accountant for what's right for your
          situation, this is just a calculator, not tax advice.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            style={{ ...inputStyle, width: 80 }}
            type="number"
            placeholder="25"
            value={setAsidePercent}
            onChange={(e) => setSetAsidePercent(e.target.value)}
          />
          <span style={{ fontFamily: sans, fontSize: 13 }}>%</span>
          <button className="lux-btn" style={buttonStyle} onClick={savePercent}>Save</button>
        </div>
        {setAside !== null && (
          <p style={{ fontFamily: serif, fontSize: 18, margin: "12px 0 0 0" }}>
            Set aside {money(setAside)} from income logged so far
          </p>
        )}
      </Card>

      <EyebrowLabel>Log a Transaction</EyebrowLabel>
      <Card style={{ margin: "14px 0 32px 0" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <select style={{ ...inputStyle, width: "auto" }} value={type} onChange={(e) => { setType(e.target.value); setCategory(e.target.value === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]); }}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select style={{ ...inputStyle, width: "auto" }} value={business} onChange={(e) => setBusiness(e.target.value)}>
            {BUSINESSES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <input style={{ ...inputStyle, width: 110 }} placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <select style={{ ...inputStyle, width: "auto" }} value={category} onChange={(e) => setCategory(e.target.value)}>
            {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button className="lux-btn" style={buttonStyle} onClick={addTransaction}>Log It</button>
      </Card>

      <EyebrowLabel>History</EyebrowLabel>
      <div style={{ marginTop: 12 }}>
        {transactions.map((t) => (
          <Row key={t.id} style={{ display: "block" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontFamily: sans, fontSize: 14, color: t.type === "income" ? C.oxblood : C.charcoal }}>
                  {t.type === "income" ? "+" : "-"}{money(t.amount)}
                </span>
                <span style={{ fontFamily: sans, fontSize: 11, opacity: 0.6, marginLeft: 8 }}>
                  {t.business} &middot; {t.category} &middot; {t.date}
                </span>
              </div>
              <RemoveButton onClick={() => deleteTransaction(t.id)} />
            </div>
            {t.note && <p style={{ fontFamily: sans, fontSize: 12, margin: "2px 0 0 0", opacity: 0.7 }}>{t.note}</p>}
          </Row>
        ))}
      </div>
    </div>
  );
}
