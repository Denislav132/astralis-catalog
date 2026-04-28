"use client";

export default function Hero() {
  return (
    <section id="top" className="home-hero">
      <div className="home-hero__image" />
      <div className="home-hero__shade" />

      <div className="home-hero__inner">
        <div className="home-hero__copy">
          <div className="home-hero__eyebrow">
            <span />
            Директно от производител
          </div>

          <h1 className="home-hero__title">
            ASTRALIS
            <span>Контейнери</span>
          </h1>

          <p className="home-hero__text">
            Контейнери и модулни конструкции за бизнес, строителство и дом.
          </p>

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
