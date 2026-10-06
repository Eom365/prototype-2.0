import { Fragment, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import ExcelImportModal from "../components/ExcelImportModal";
import { catalogApi, productsApi } from "../api";
import { sameId } from "../cardScope";
import { CUSTOM_CODE_PREFIX } from "../customCharacteristics";
import {
  CUSTOM_VARIANT_FILL_STAGE_COUNT,
  fillProgressStep,
  fillProgressTotal,
  productWizardOffset,
  variantFillStageHeading,
  variantFillStep,
} from "../stageProgress";
import {
  sortByVariantAxisHierarchy,
  sortVariantAxisCodes,
  variantAxisRank,
  VARIANT_AXIS_SKIP_CODES,
} from "../variantFlow";
import "./Stage25.css";

const MAX_FEATURES = 5;

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
    if (!item.code || VARIANT_AXIS_SKIP_CODES.has(item.code)) continue;
    if (item.code.startsWith(CUSTOM_CODE_PREFIX)) {
      const label = String(item.value || "").trim();
      const filled = String(item.customValue || "").trim();
      if (!label || !filled) continue;
      options.push({
        key: item.code,
        label,
        filled,
        unit: item.unit || null,
      });
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
      unit: item.unit || null,
    });
  }
  return sortByVariantAxisHierarchy(options);
}

function Stage25() {
  const navigate = useNavigate();
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

  const options = filledCharacteristics(product, catalog, variationId);
  const offset = productWizardOffset(productId);

  const toggleFeature = (key) => {
    setFeatures((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      if (prev.length >= MAX_FEATURES) {
        setError(`Можно выбрать не больше ${MAX_FEATURES} характеристик`);
        return prev;
      }
      setError("");
      const opt = options.find((item) => item.key === key);
      if (opt?.filled) {
        setDrafts((draftsPrev) => ({
          ...draftsPrev,
          [key]: draftsPrev[key] || opt.filled,
        }));
      }
      return [...prev, key];
    });
  };

  const setDraft = (key, value) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!productId) {
      throw new Error("Сначала создайте карточку на главной странице");
    }
    if (busy) throw new Error("Сохранение уже выполняется");

    const filled = features
      .map((key) => {
        const opt = options.find((item) => item.key === key);
        return {
          key,
          value: (drafts[key] || opt?.filled || "").trim(),
          label: opt?.label || "",
          unit: opt?.unit || null,
        };
      })
      .filter((item) => item.value);

    if (filled.length === 0) {
      throw new Error("Добавьте хотя бы одну характеристику со значением");
    }

    setBusy(true);
    setError("");
    try {
      sessionStorage.setItem(`variantFlow:${productId}`, "create");
      await productsApi.saveWantsVariants(productId, { wantsVariants: true });

      const codes = sortVariantAxisCodes(filled.map((item) => item.key));
      await productsApi.saveVariantAxes(productId, { codes });

      const filledByKey = new Map(filled.map((item) => [item.key, item]));
      const orderedFilled = codes
        .map((key) => filledByKey.get(key))
        .filter(Boolean);

      let targetVariationId = variationId;

      if (targetVariationId) {
        const latest = await productsApi.get(productId);
        const variation = (latest.variations || []).find((item) =>
          sameId(item.id, targetVariationId),
        );
        const byCode = new Map(
          (variation?.values || []).map((item) => [item.code, item]),
        );
        for (const item of orderedFilled) {
          const prev = byCode.get(item.key);
          if (item.key.startsWith(CUSTOM_CODE_PREFIX)) {
            byCode.set(item.key, {
              code: item.key,
              value: item.label || prev?.value || "",
              customValue: item.value,
              unit: item.unit || prev?.unit || null,
            });
          } else {
            byCode.set(item.key, {
              code: item.key,
              value: item.value,
              customValue: prev?.customValue || "",
              unit: item.unit || prev?.unit || null,
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
          values: orderedFilled.map((item) =>
            item.key.startsWith(CUSTOM_CODE_PREFIX)
              ? {
                  code: item.key,
                  value: item.label,
                  customValue: item.value,
                  unit: item.unit || null,
                }
              : {
                  code: item.key,
                  value: item.value,
                  unit: item.unit || null,
                },
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
      throw err;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="container">
        <h1 className="title">
          {variantFillStageHeading(
            25,
            "Вариант параметра продукта",
            product,
            productId,
          )}
        </h1>

        <p className="description">
          Вариант параметра продукта позволяет объединить продукты одной
          линейки, у которых меняются определенные характеристики (модель, объём
          памяти, цвет).
        </p>

        <p className="pBold">Пример вариантов параметра продукта:</p>
        {/* <ExcelImportModal /> */}
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
          {options.map((opt, index) => {
            const checked = features.includes(opt.key);
            const previous = options[index - 1];
            const split =
              previous &&
              variantAxisRank(previous.key) !== variantAxisRank(opt.key);
            return (
              <Fragment key={opt.key}>
                {split && <div className="feature-group-divider" />}
                <div className="feature-row">
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
                    value={
                      Object.prototype.hasOwnProperty.call(drafts, opt.key)
                        ? drafts[opt.key]
                        : checked
                          ? opt.filled || ""
                          : ""
                    }
                    onChange={(e) => setDraft(opt.key, e.target.value)}
                    disabled={!checked}
                  />
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      <BottomBar
        current={fillProgressStep(25, product, productId) || variantFillStep(25) + offset}
        total={fillProgressTotal(product, productId) || CUSTOM_VARIANT_FILL_STAGE_COUNT + offset}
        prevPath="/stage23"
        onSave={save}
        onNext={() => {}}
      />
    </>
  );
}

export default Stage25;
