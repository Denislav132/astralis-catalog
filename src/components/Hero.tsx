"use client";

import { type CSSProperties, type FormEvent, useMemo, useState } from "react";
import { submitInquiry } from "@/app/actions";

const containerTypes = [
  { label: "Офис контейнер", value: "Офис контейнер" },
  { label: "Жилищен контейнер", value: "Жилищен контейнер" },
  { label: "Санитарен контейнер", value: "Санитарен контейнер" },
  { label: "Складов контейнер", value: "Складов контейнер" },
];

const containerSizes = ["3 x 2.4 м", "6 x 2.4 м", "7 x 3 м", "По проект"];

const containerColors = [
  { label: "Бял", value: "Бял", color: "#f3f1e8" },
  { label: "Графит", value: "Графит", color: "#2f3334" },
  { label: "Антрацит", value: "Антрацит", color: "#17191a" },
  { label: "Бежов", value: "Бежов", color: "#d9cbb2" },
];

const containerExtras = ["Ел. инсталация", "ВиК инсталация", "Климатик", "Транспорт"];

export default function Hero() {
  const [configOpen, setConfigOpen] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [type, setType] = useState(containerTypes[0].value);
  const [size, setSize] = useState(containerSizes[1]);
  const [color, setColor] = useState(containerColors[0].value);

  const selectedColor = useMemo(
    () => containerColors.find((item) => item.value === color) || containerColors[0],
    [color]
  );

  function openConfigurator() {
    setSubmitState("idle");
    setConfigOpen(true);
  }

  function closeConfigurator() {
    setSubmitState("idle");
    setConfigOpen(false);
  }

  async function handleConfiguratorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("loading");

    try {
      await submitInquiry(new FormData(event.currentTarget), undefined, "Конфигуриран контейнер");
      setSubmitState("success");
      event.currentTarget.reset();
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <>
      <section id="top" className="home-hero">
        <div className="home-hero__image" />
        <div className="home-hero__shade" />

        <div className="home-hero__inner">
          <div className="home-hero__copy">
            <span className="home-hero__eyebrow">ASTRALIS контейнерни решения</span>
            <h1>Контейнери за работа, живеене и бърз старт.</h1>
            <p>
              Изберете готов модел или конфигурирайте базово запитване. Ние ще върнем конкретна оферта според
              предназначение, размер, екстри и транспорт.
            </p>

            <div className="home-hero__actions">
              <button type="button" className="home-hero__primary" onClick={openConfigurator}>
                Конфигурирай контейнер
              </button>
              <a className="home-hero__secondary" href="/#catalog">
                Към каталога
              </a>
            </div>

            <div className="home-hero__trust" aria-label="Основни предимства">
              <span>Оферта по заявка</span>
              <span>Ясни параметри</span>
              <span>Доставка и монтаж</span>
            </div>
          </div>

          <div className="home-hero__visual" aria-hidden="true">
            <div className="home-hero__visual-card">
              <span>Бърза конфигурация</span>
              <strong>{type}</strong>
              <small>{size} / {color}</small>
            </div>
          </div>
        </div>
      </section>

      {configOpen && (
        <div className="config-modal" role="dialog" aria-modal="true" aria-label="Конфигуриране на контейнер">
          <button className="config-modal__backdrop" type="button" onClick={closeConfigurator} />
          <div className="config-modal__panel">
            <button className="config-modal__close" type="button" onClick={closeConfigurator} aria-label="Затвори">
              ×
            </button>

            {submitState === "success" ? (
              <div className="config-success">
                <span>Запитването е изпратено</span>
                <h2>Получихме конфигурацията.</h2>
                <p>Ще се свържем с Вас с конкретна оферта и уточняващи въпроси.</p>
                <button type="button" onClick={closeConfigurator}>
                  Затвори
                </button>
              </div>
            ) : (
              <form className="config-form" onSubmit={handleConfiguratorSubmit}>
                <div className="config-form__head">
                  <span>Smart configurator</span>
                  <h2>Конфигурирайте запитване за контейнер</h2>
                  <p>Изберете основните параметри. Това не е финална поръчка, а по-точна база за оферта.</p>
                </div>

                <div className="config-form__grid">
                  <div className="config-form__main">
                    <fieldset>
                      <legend>Тип контейнер</legend>
                      <div className="config-options">
                        {containerTypes.map((item) => (
                          <label key={item.value} className={type === item.value ? "selected" : ""}>
                            <input
                              type="radio"
                              name="configuration_type"
                              value={item.value}
                              checked={type === item.value}
                              onChange={(event) => setType(event.target.value)}
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <div className="config-form__row">
                      <label>
                        <span>Размер</span>
                        <select name="configuration_size" value={size} onChange={(event) => setSize(event.target.value)}>
                          {containerSizes.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Предназначение</span>
                        <input name="configuration_use" placeholder="Напр. офис на обект" />
                      </label>
                    </div>

                    <fieldset>
                      <legend>Цвят</legend>
                      <div className="color-options">
                        {containerColors.map((item) => (
                          <label key={item.value} className={color === item.value ? "selected" : ""}>
                            <input
                              type="radio"
                              name="configuration_color"
                              value={item.value}
                              checked={color === item.value}
                              onChange={(event) => setColor(event.target.value)}
                            />
                            <i style={{ background: item.color }} />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend>Екстри</legend>
                      <div className="extra-options">
                        {containerExtras.map((item) => (
                          <label key={item}>
                            <input type="checkbox" name="configuration_extras" value={item} />
                            <span>{item}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>

                  <aside className="config-preview">
                    <div className="config-preview__box" style={{ "--preview-color": selectedColor.color } as CSSProperties}>
                      <div className="config-preview__roof" />
                      <div className="config-preview__window" />
                      <div className="config-preview__door" />
                    </div>
                    <span>Вашата конфигурация</span>
                    <strong>{type}</strong>
                    <p>{size} / {color}</p>
                  </aside>
                </div>

                <div className="config-contact">
                  <input name="name" required placeholder="Вашето име *" />
                  <input name="phone" required type="tel" placeholder="Телефон *" />
                  <textarea name="message" rows={3} placeholder="Допълнително описание, локация или срок..." />
                </div>

                {submitState === "error" && (
                  <p className="config-error">Не успяхме да изпратим запитването. Опитайте пак след малко.</p>
                )}

                <button className="config-submit" type="submit" disabled={submitState === "loading"}>
                  {submitState === "loading" ? "Изпращане..." : "Изпрати конфигурацията"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
