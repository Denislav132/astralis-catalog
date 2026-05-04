import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "За нас — ASTRALIS",
  description: "Научете повече за ASTRALIS и нашите решения за контейнери и сглобяеми къщи.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "За нас — ASTRALIS",
    description: "Научете повече за ASTRALIS и нашите решения за контейнери и сглобяеми къщи.",
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <div style={{ padding: "120px 24px", minHeight: "60vh" }}>
      <div className="max-w-4xl mx-auto">
        <div
          style={{
            width: 48,
            height: 4,
            background: "var(--accent)",
            borderRadius: 2,
            margin: "0 auto 24px",
          }}
        />
        <h1
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 900,
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            color: "var(--carbon)",
            letterSpacing: "-0.02em",
            marginBottom: 32,
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          За нас
        </h1>
        
        <div style={{ color: "var(--carbon-70)", fontSize: "1.2rem", lineHeight: 1.8 }}>
          <p style={{ marginBottom: 24 }}>
            ASTRALIS е водещ доставчик на съвременни контейнерни решения, сглобяеми къщи и модулни конструкции. 
            Нашата мисия е да предоставим качествено, бързо и достъпно жилищно или бизнес пространство, 
            което отговаря на индивидуалните нужди на всеки клиент.
          </p>
          <p style={{ marginBottom: 24 }}>
            С фокус върху иновациите и енергийната ефективност, ние предлагаме продукти, които съчетават 
            функционален дизайн с дългосрочна надеждност. Работим с екип от професионалисти, които 
            консултират клиентите още от първото запитване, за да стигнем до точната конфигурация, бюджет и срок.
          </p>
          <p>
            Независимо дали търсите уютен дом, модерен офис или временно складово пространство, 
            ASTRALIS има правилното решение за вас. Доставяме и монтираме в цяла България, 
            гарантирайки безкомпромисно качество на всяка стъпка.
          </p>
        </div>
      </div>
    </div>
  );
}
