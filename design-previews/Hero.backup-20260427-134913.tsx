"use client";

export default function Hero() {
  return (
    <section
      id="top"
      style={{
        position: "relative",
        height: "85vh",
        minHeight: "600px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        background: "#000"
      }}
    >
      {/* Main Background Image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.7) 20%, rgba(0,0,0,0.3) 80%), url(/images/hero-container-construction.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 1
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          width: "100%",
        }}
      >
        <div style={{ maxWidth: 750 }}>
          {/* Label */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div style={{ width: 32, height: 2, background: "var(--accent)" }} />
            <span
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
                fontSize: "0.75rem",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "var(--accent)",
              }}
            >
              Директно от производител
            </span>
          </div>

          {/* Main headline */}
          <h1
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
              lineHeight: 1.05,
              color: "#fff",
              letterSpacing: "-0.02em",
              marginBottom: 24,
            }}
          >
            ASTRALIS <br />
            <span style={{ color: "var(--accent)", fontWeight: 300, fontStyle: "italic" }}>Контейнери</span>
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontSize: "1.25rem",
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.6,
              marginBottom: 40,
              maxWidth: 580,
              fontWeight: 400,
            }}
          >
            Професионални решения за вашия бизнес и дом. 
            Висококачествени контейнери и модулни конструкции с бърза доставка в цялата страна.
          </p>

          {/* CTA buttons */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a
              href="/#catalog"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 800,
                fontSize: "0.85rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#fff",
                textDecoration: "none",
                padding: "20px 48px",
                background: "var(--accent)",
                borderRadius: 2,
                display: "inline-block",
                transition: "all 0.3s ease",
                boxShadow: "0 8px 30px rgba(212, 132, 26, 0.25)"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#B56E10")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
            >
              Към каталога
            </a>
            <a
              href="/#contacts"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 800,
                fontSize: "0.85rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#fff",
                textDecoration: "none",
                padding: "20px 48px",
                background: "transparent",
                border: "2px solid #fff",
                borderRadius: 2,
                display: "inline-block",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.color = "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#fff";
              }}
            >
              Връзка с нас
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
