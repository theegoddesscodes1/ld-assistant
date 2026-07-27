"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { C, serif, sans } from "../../lib/theme";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/business", label: "Business" },
  { href: "/fiverr", label: "Fiverr" },
  { href: "/products", label: "Products" },
  { href: "/velvet", label: "Velvet Circle" },
  { href: "/finances", label: "Finances" },
  { href: "/fitness", label: "Fitness" },
  { href: "/growth", label: "Growth" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <div>
      <div style={{ padding: "28px 24px 20px 24px", textAlign: "center" }}>
        <p style={{ fontFamily: serif, fontSize: 18, letterSpacing: 4, textTransform: "uppercase", margin: 0 }}>
          Command Center
        </p>
        <div style={{ height: 1, backgroundColor: C.greige, width: 56, margin: "12px auto 0 auto" }} />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 2,
          borderBottom: `1px solid ${C.greige}`,
          padding: "0 8px",
          overflowX: "auto",
        }}
      >
        {LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="lux-link"
              style={{
                display: "block",
                borderBottom: active ? `2px solid ${C.oxblood}` : "2px solid transparent",
                padding: "12px 14px",
                fontFamily: sans,
                fontSize: 11,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: active ? C.oxblood : C.charcoal,
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
