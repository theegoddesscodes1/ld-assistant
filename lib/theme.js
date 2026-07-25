export const C = {
  charcoal: "#333333",
  warmWhite: "#FAFAF8",
  lilac: "#D6D0DE",
  oxblood: "#5C181E",
  greige: "#D5D2CC",
};

export const serif = "var(--serif)";
export const sans = "var(--sans)";

export function EyebrowLabel({ children, color = C.oxblood }) {
  return (
    <p style={{ fontFamily: sans, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color, margin: 0 }}>
      {children}
    </p>
  );
}

export const buttonStyle = {
  fontFamily: sans,
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  color: C.warmWhite,
  backgroundColor: "#000000",
  border: "none",
  padding: "10px 18px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const ghostButtonStyle = {
  fontFamily: sans,
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  color: C.oxblood,
  backgroundColor: "transparent",
  border: `1px solid ${C.oxblood}`,
  padding: "9px 16px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const inputStyle = {
  fontFamily: sans,
  fontSize: 14,
  color: C.charcoal,
  border: `1px solid ${C.greige}`,
  padding: "10px 12px",
  backgroundColor: C.warmWhite,
  outline: "none",
  width: "100%",
};

export const cardStyle = { border: `1px solid ${C.greige}`, padding: 20 };

export function Card({ children, style = {}, ...rest }) {
  return (
    <div className="lux-card" style={{ ...cardStyle, ...style }} {...rest}>
      {children}
    </div>
  );
}

export function Row({ children, style = {}, ...rest }) {
  return (
    <div
      className="lux-row"
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 6px", borderBottom: `1px solid ${C.greige}`, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function StatTile({ label, value, sub, trend }) {
  return (
    <Card style={{ flex: "1 1 160px", padding: "20px 22px" }}>
      <EyebrowLabel>{label}</EyebrowLabel>
      <p style={{ fontFamily: serif, fontSize: 26, margin: "8px 0 0 0", color: C.charcoal }}>{value}</p>
      {sub && (
        <p style={{ fontFamily: sans, fontSize: 12, margin: "4px 0 0 0", color: trend === "up" ? C.oxblood : C.charcoal, opacity: trend ? 1 : 0.6 }}>
          {sub}
        </p>
      )}
    </Card>
  );
}

export function Pill({ active, children, ...rest }) {
  return (
    <button
      className="lux-pill"
      style={{
        fontFamily: sans,
        fontSize: 10,
        letterSpacing: 1,
        textTransform: "uppercase",
        padding: "6px 10px",
        cursor: "pointer",
        backgroundColor: active ? C.oxblood : "transparent",
        color: active ? C.warmWhite : C.charcoal,
        border: `1px solid ${active ? C.oxblood : C.greige}`,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function RemoveButton(props) {
  return (
    <button
      className="lux-link"
      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.greige, fontFamily: sans }}
      {...props}
    >
      remove
    </button>
  );
}

export function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <p style={{ fontFamily: serif, fontSize: 32, margin: "0 0 8px 0", color: C.charcoal, lineHeight: 1.15 }}>{title}</p>
      {subtitle && (
        <p style={{ fontFamily: serif, fontStyle: "italic", fontSize: 15, margin: 0, color: C.oxblood }}>{subtitle}</p>
      )}
    </div>
  );
}

export function money(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
