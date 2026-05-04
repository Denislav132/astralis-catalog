"use client";

export default function Hero() {
  return (
    <section id="top" className="home-hero">
      <div className="home-hero__image" />
      <div className="home-hero__shade" />

      <div className="home-hero__inner">
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
