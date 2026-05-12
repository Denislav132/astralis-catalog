"use client";

export default function Hero() {
  return (
    <section id="top" className="home-hero">
      <div className="home-hero__image" />
      <div className="home-hero__shade" />

      <div className="home-hero__inner">
        <div className="home-hero__feature home-hero__feature--shell">
          <span>Стоманена конструкция</span>
        </div>
        <div className="home-hero__feature home-hero__feature--window">
          <span>PVC дограма</span>
        </div>
        <div className="home-hero__feature home-hero__feature--panel">
          <span>Изолиран термопанел</span>
        </div>

        <div className="home-hero__copy">
          <div className="home-hero__actions">
            <a className="home-hero__primary" href="/#catalog">
              Към каталога
            </a>
            <a className="home-hero__secondary" href="/#contacts">
              Връзка с нас
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
