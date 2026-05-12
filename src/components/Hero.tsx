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
          <div className="home-hero__dock">
            <div className="home-hero__intro">
              <span>ASTRALIS контейнерни решения</span>
              <strong>Готови модели за бизнес, строителство и дом.</strong>
            </div>

            <div className="home-hero__actions">
              <a className="home-hero__primary" href="/#catalog">
                Към каталога
              </a>
              <a className="home-hero__secondary" href="/#contacts">
                Връзка с нас
              </a>
            </div>

            <div className="home-hero__quick" aria-label="Бърз преглед на каталога">
              <a href="/#catalog">
                <span>Контейнери</span>
                <strong>36</strong>
              </a>
              <a href="/#catalog">
                <span>Сглобяеми къщи</span>
                <strong>53</strong>
              </a>
              <a href="/#catalog">
                <span>Модулни къщи</span>
                <strong>4</strong>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
