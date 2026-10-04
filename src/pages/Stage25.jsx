import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { catalogApi, productsApi } from "../api";
import "./Stage25.css";

// Доступные характеристики для выбора (можешь менять)
const FEATURE_OPTIONS = [{ key: "model", label: "Модель" }];

function Stage25() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const productId = params.get("id");

  const [product, setProduct] = useState(null);
  const [features, setFeatures] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!productId) return;
    Promise.all([productsApi.get(productId), catalogApi.get()])
      .then(([loaded]) => {
        setProduct(loaded);
      })
      .catch((err) => setError(err.message));
  }, [productId]);

  const search = productId ? `?id=${productId}` : location.search || "";

  const go = (path) =>
    navigate({ pathname: path, search: path === "/" ? "" : search });

  // Переключить чекбокс
  const toggleFeature = (key) => {
    setFeatures((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  // Изменить значение в поле ввода
  const setDraft = (key, value) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const handleCancel = () => go("/stage22");

  const handleConfirm = async () => {
    if (!productId) {
      window.alert("Сначала создайте карточку на главной странице");
      return;
    }
    if (busy) return;

    // Собираем непустые значения
    const filled = features
      .map((key) => ({ key, value: (drafts[key] || "").trim() }))
      .filter((item) => item.value);

    if (filled.length === 0) {
      window.alert("Добавьте хотя бы одну характеристику со значением");
      return;
    }

    setBusy(true);
    setError("");
    try {
      sessionStorage.setItem(`variantFlow:${productId}`, "create");
      await productsApi.saveWantsVariants(productId, { wantsVariants: true });

      const codes = filled.map((item) => item.key);
      await productsApi.saveVariantAxes(productId, { codes });

      let latest = await productsApi.get(productId);
      let variationId = null;

      // Создаём по одному варианту на каждое значение
      for (const item of filled) {
        const created = await productsApi.addVariation(productId, {
          values: [{ code: item.key, value: item.value }],
        });
        if (created?.id) {
          if (!variationId) variationId = created.id;
          latest = {
            ...latest,
            variations: [...(latest.variations || []), created],
          };
        }
      }

      const next = new URLSearchParams();
      next.set("id", productId);
      if (variationId) next.set("variationId", variationId);
      navigate({ pathname: "/stage26", search: `?${next.toString()}` });
    } catch (err) {
      setError(err.message || "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="container">
        <h1 className="title">Этап 4 - Вариант параметра продукта</h1>

        <p className="description">
          Вариант параметра продукта позволяет объединить продукты одной
          линейки, у которых меняются определенные характеристики (модель, объём
          памяти, цвет).
        </p>

        <p className="pBold">Пример вариантов параметра продукта:</p>
        <img
          src="/images/productParameterOption.png"
          alt="Вариант параметра продукта - пример"
          className="imgOne"
        />

        <h2 className="jh">
          Выберите варианты параметра продукта: можно выбрать от 1 до 5
          характеристик
        </h2>

        {error && <p className="form-error">{error}</p>}

        <div className="feature-list">
          {FEATURE_OPTIONS.map((opt) => {
            const checked = features.includes(opt.key);
            return (
              <div className="feature-row" key={opt.key}>
                <label className="feature-item">
                  <span
                    className={`checkbox ${checked ? "checkbox--checked" : ""}`}
                  >
                    {checked && (
                      <svg
                        className="checkbox__tick"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M5 12.5L10 17.5L19 7"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>

                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFeature(opt.key)}
                    className="feature-item__input"
                  />

                  <span className="feature-item__label">{opt.label}</span>
                  <span className="info-icon" title="Подсказка">
                    ?
                  </span>
                </label>

                <input
                  type="text"
                  className="feature-input"
                  placeholder="Введите значение"
                  value={drafts[opt.key] || ""}
                  onChange={(e) => setDraft(opt.key, e.target.value)}
                  disabled={!checked}
                />
              </div>
            );
          })}
          <p>Иное подгрузить</p>
        </div>
      </div>

      <div className="action-bar">
        <button
          type="button"
          className="action-btn action-btn--no"
          onClick={handleCancel}
          title="Нет"
          disabled={busy}
        >
          <span className="action-btn__circle">✕</span>
        </button>

        <button
          type="button"
          className="action-btn action-btn--yes"
          onClick={handleConfirm}
          title="Да"
          disabled={busy}
        >
          <span className="action-btn__circle">✓</span>
        </button>
      </div>
    </>
  );
}

export default Stage25;
