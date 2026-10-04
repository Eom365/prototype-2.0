// Этап 5 - наименование продукта
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import { productsApi } from "../api";
import "./Stage26.css";

// Характеристики, которые выводятся под наименованием
const FEATURE_OPTIONS = [
  { key: "model", label: "Модель" },
  { key: "other1", label: "Иное" },
  { key: "other2", label: "Иное" },
];

function Stage26() {
  const [params] = useSearchParams();
  const productId = params.get("id");
  const [fullName, setFullName] = useState("");
  const [logo, setLogo] = useState(null);
  const [error, setError] = useState("");
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    if (!productId) return;
    productsApi
      .get(productId)
      .then((product) => {
        const logoFile =
          (product.files || []).find(
            (file) => file.role === "logo" && !file.variationId,
          ) || null;
        const composed = [
          (product.productName || "").trim(),
          (product.brandName || "").trim(),
          (product.productLine || "").trim(),
        ]
          .filter(Boolean)
          .join(" ");
        setLogo(logoFile);
        setFullName(composed);
      })
      .catch((loadError) => setError(loadError.message));
  }, [productId]);

  const toggleFeature = (key) => {
    setFeatures((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <>
      <div className="container stage3-page stage4-page">
        <h1 className="title stage3-title">
          Этап 5 - Наименование варианта параметра продукта
        </h1>
        {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )}
        {error && <p className="form-error">{error}</p>}

        <p className="stage4-lead">
          Наименование продукта - формируется из заполненных характеристик
          товара, которые моуг изменяться при добавлении вариантов параметров
          товара
        </p>

        <div className="stage4-name-box">
          {logo && (
            <img
              className="stage4-name-box__logo"
              src={logo.url}
              alt="Логотип"
            />
          )}
          <input
            type="text"
            className="stage4-name-box__text"
            value={fullName}
            readOnly
            placeholder="Логотип Категория Бренд Линейка"
          />
        </div>

        <p className="standart">
          Выберите от 1 до 3 характеристик, которые будут отображаться в
          наименовании варианта параметра продукта:{" "}
        </p>

        {/* ===== Список чекбоксов с характеристиками ===== */}
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
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <BottomBar
        current={4}
        total={5}
        prevPath="/stage25"
        nextPath="/stage27"
      />
    </>
  );
}

export default Stage26;
