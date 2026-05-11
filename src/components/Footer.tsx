"use client";

import type { SiteSettings } from "@/lib/site-settings";

type FooterProps = {
  settings: SiteSettings;
};

export default function Footer({ settings }: FooterProps) {
  return (
    <>
      {/* ── CONTACTS SECTION ── */}
      <section
        id="contacts"
        style={{
          background: "#1A1A1A",
          padding: "80px 24px",
          scrollMarginTop: 68,
        }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <div
              style={{
                display: "inline-block",
                width: 48, height: 4,
                background: "#D4841A",
                borderRadius: 2,
                marginBottom: 20,
              }}
            />
            <h2
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 900,
                fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
                color: "#fff",
                lineHeight: 1.1,
                marginBottom: 16,
              }}
            >
              Свържете се с нас
            </h2>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.95rem", lineHeight: 1.7 }}>
              Нашите специалисти ще ви помогнат да изберете правилния модел
              и ще ви дадат точна оферта в рамките на 24 часа.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "📞", label: "Телефон", value: settings.contact_phone },
              { icon: "✉️", label: "Имейл",  value: settings.contact_email },
              { icon: "📍", label: "Адрес",  value: settings.contact_address },
            ].map((c) => (
              <div
                key={c.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 20px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 2,
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>{c.icon}</span>
                <div>
                  <div
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.65rem",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "#D4841A",
                      marginBottom: 2,
                    }}
                  >
                    {c.label}
                  </div>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.9rem" }}>
                    {c.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer-bar">
        © {new Date().getFullYear()} ASTRALIS — Всички права запазени.
      </footer>
    </>
  );
}
