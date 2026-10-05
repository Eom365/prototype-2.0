import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { catalogApi, productsApi } from "../api";
import { sameId } from "../cardScope";
import { CUSTOM_CODE_PREFIX } from "../customCharacteristics";
import {
  variantFillStageHeading,
} from "../stageProgress";
import "./Stage25.css";

const MAX_FEATURES = 5;
const SKIP_CODES = new Set(["brand", "manufacturer", "country", "article"]);

function findKind(catalog, kindCode) {
  if (!catalog || !kindCode) return null;
  for (const category of catalog.categories || []) {
    const kind = (category.kinds || []).find((item) => item.code === kindCode);
    if (kind) return kind;
  }
  return null;
}

function filledCharacteristics(product, catalog, variationId) {
  const names = new Map(
    (findKind(catalog, product?.kindCode)?.characteristics || []).map((field) => [
      field.code,
      field.name,
    ]),
  );
  const variation = variationId
    ? (product?.variations || []).find((item) => sameId(item.id, variationId))
    : null;
  const source = variation
    ? variation.values || []
    : (product?.values || []).filter((item) => !item.variationId);

  const options = [];
  for (const item of source) {
    if (!item.code || SKIP_CODES.has(item.code)) continue;
    if (item.code.startsWith(CUSTOM_CODE_PREFIX)) {
      const label = String(item.value || "").trim();
      const filled = String(item.customValue || "").trim();
      if (!label || !filled) continue;
      options.push({ key: item.code, label, filled });
      continue;
    }
    const filled = String(
      item.value === "other" ? item.customValue : item.value || "",
    ).trim();
    if (!filled) continue;
    options.push({
      key: item.code,
      label: names.get(item.code) || item.code,
      filled,
    });
  }
  return options;
}

function Stage25() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const productId = params.get("id");
  const variationId = params.get("variationId");

  const [product, setProduct] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [features, setFeatures] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!productId) return;
    Promise.all([productsApi.get(productId), catalogApi.get()])
      .then(([loaded, loadedCatalog]) => {
        setProduct(loaded);
        setCatalog(loadedCatalog);
        const nextDrafts = {};
        for (const opt of filledCharacteristics(loaded, loadedCatalog, variationId)) {
          nextDrafts[opt.key] = opt.filled;
        }
        setDrafts(nextDrafts);
      })
      .catch((err) => setError(err.message));
  }, [productId, variationId]);

  const search = productId
    ? `?id=${productId}${variationId ? `&variationId=${variationId}` : ""}`
    : location.search || "";

  const go = (path) =>
    navigate({ pathname: path, search: path === "/" ? "" : search });

  const toggleFeature = (key) => {
    setFeatures((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      if (prev.length >= MAX_FEATURES) {
        setError(`Можно выбрать не больше ${MAX_FEATURES} характеристик`);
        return prev;
      }
      setError("");
      return [...prev, key];
    });
  };

  const options = filledCharacteristics(product, catalog, variationId);

  const setDraft = (key, value) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const handleCancel = () => go(variationId ? "/stage23" : "/stage22");

  const handleConfirm = async () => {
    if (!productId) {
      window.alert("Сначала создайте карточку на главной странице");
      return;
    }
    if (busy) return;

    const filled = features
      .map((key) => {
        const opt = options.find((item) => item.key === key);
        return {
          key,
          value: (drafts[key] || "").trim(),
          label: opt?.label || "",
        };
      })
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

      let targetVariationId = variationId;

      if (targetVariationId) {
        const latest = await productsApi.get(productId);
        const variation = (latest.variations || []).find((item) =>
          sameId(item.id, targetVariationId),
        );
        const byCode = new Map(
          (variation?.values || []).map((item) => [item.code, item]),
        );
        for (const item of filled) {
          const prev = byCode.get(item.key);
          if (item.key.startsWith(CUSTOM_CODE_PREFIX)) {
            byCode.set(item.key, {
              code: item.key,
              value: item.label || prev?.value || "",
              customValue: item.value,
              unit: prev?.unit || null,
            });
          } else {
            byCode.set(item.key, {
              code: item.key,
              value: item.value,
              customValue: prev?.customValue || "",
              unit: prev?.unit || null,
            });
          }
        }
        await productsApi.saveVariationCharacteristics(
          productId,
          targetVariationId,
          { values: [...byCode.values()] },
        );
      } else {
        const created = await productsApi.addVariation(productId, {
          values: filled.map((item) =>
            item.key.startsWith(CUSTOM_CODE_PREFIX)
              ? {
                  code: item.key,
                  value: item.label,
                  customValue: item.value,
                }
              : { code: item.key, value: item.value },
          ),
        });
        if (!created?.id) throw new Error("Не удалось создать вариант");
        targetVariationId = created.id;
      }

      const next = new URLSearchParams();
      next.set("id", productId);
      next.set("variationId", targetVariationId);
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
        <h1 className="title">
          {variantFillStageHeading(25, "Вариант параметра продукта")}
        </h1>

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
          {options.length === 0 && (
            <p className="paragraph">
              На этапе характеристик пока нет заполненных значений.
            </p>
          )}
          {options.map((opt) => {
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
                  <span className="info-icon" title={`Заполнено: ${opt.filled}`}>
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
