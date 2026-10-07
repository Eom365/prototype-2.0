import { Fragment, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import Tip from "../components/Tip";
import VariantFlowHeader from "../components/VariantFlowHeader";
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
  loadVariantAxisDraft,
  saveVariantAxisDraft,
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

const Stage25 = forwardRef(function Stage25(
  { embedded = false, refreshKey = 0, onSelectionChange },
  ref,
) {
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
        const opts = filledCharacteristics(loaded, loadedCatalog, variationId);
        const nextDrafts = {};
        for (const opt of opts) {
          nextDrafts[opt.key] = opt.filled;
        }

        const stored = loadVariantAxisDraft(productId);
        const savedAxes = sortVariantAxisCodes(loaded.variantAxes || []).filter(
          (code) => opts.some((opt) => opt.key === code),
        );
        const draftAxes = (stored.features || []).filter((code) =>
          opts.some((opt) => opt.key === code),
        );
        const restoredFeatures = savedAxes.length ? savedAxes : draftAxes;

        for (const key of restoredFeatures) {
          const fromStore = String(stored.drafts?.[key] || "").trim();
          if (fromStore) nextDrafts[key] = fromStore;
        }

        setDrafts(nextDrafts);
        setFeatures(restoredFeatures);
        saveVariantAxisDraft(productId, {
          features: restoredFeatures,
          drafts: nextDrafts,
        });
      })
      .catch((err) => setError(err.message));
  }, [productId, variationId, refreshKey]);

  const options = filledCharacteristics(product, catalog, variationId);
  const offset = productWizardOffset(productId);
  const selectionSigRef = useRef("");

  useEffect(() => {
    if (!onSelectionChange) return;
    const selected = features
      .map((key) => {
        const opt = options.find((item) => item.key === key);
        if (!opt) return null;
        const value = (drafts[key] || opt.filled || "").trim();
        if (!value) return null;
        return { key, label: opt.label, value, unit: opt.unit || null };
      })
      .filter(Boolean);
    const signature = selected
      .map((item) => `${item.key}:${item.value}:${item.unit || ""}`)
      .join("|");
    if (signature === selectionSigRef.current) return;
    selectionSigRef.current = signature;
    onSelectionChange(selected);
    // options is derived each render; features/drafts are the real triggers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features, drafts, product, catalog, variationId, onSelectionChange]);

  const persistDraft = (nextFeatures, nextDrafts) => {
    if (!productId) return;
    saveVariantAxisDraft(productId, {
      features: nextFeatures,
      drafts: nextDrafts,
    });
  };

  const toggleFeature = (key) => {
    setFeatures((prev) => {
      let nextFeatures;
      if (prev.includes(key)) {
        nextFeatures = prev.filter((item) => item !== key);
      } else {
        if (prev.length >= MAX_FEATURES) {
          setError(`Можно выбрать не больше ${MAX_FEATURES} характеристик`);
          return prev;
        }
        setError("");
        nextFeatures = [...prev, key];
      }

      const opt = options.find((item) => item.key === key);
      setDrafts((draftsPrev) => {
        const nextDrafts =
          opt?.filled && !prev.includes(key)
            ? {
                ...draftsPrev,
                [key]: draftsPrev[key] || opt.filled,
              }
            : draftsPrev;
        persistDraft(nextFeatures, nextDrafts);
        return nextDrafts;
      });
      return nextFeatures;
    });
  };

  const setDraft = (key, value) => {
    setDrafts((prev) => {
      const nextDrafts = { ...prev, [key]: value };
      persistDraft(features, nextDrafts);
      return nextDrafts;
    });
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

      saveVariantAxisDraft(productId, {
        features: codes,
        drafts: Object.fromEntries(
          orderedFilled.map((item) => [item.key, item.value]),
        ),
      });

      if (!embedded) {
        const next = new URLSearchParams();
        next.set("id", productId);
        next.set("variationId", targetVariationId);
        navigate({ pathname: "/stage23", search: `?${next.toString()}` });
      }
      return targetVariationId;
    } catch (err) {
      setError(err.message || "Не удалось сохранить");
      throw err;
    } finally {
      setBusy(false);
    }
  };

  useImperativeHandle(ref, () => ({ save }), [
    productId,
    variationId,
    busy,
    features,
    drafts,
    options,
    embedded,
  ]);

  return (
    <>
      <div className={embedded ? "stage25-embed" : "container"}>
        {!embedded && (
          <VariantFlowHeader product={product} productId={productId} />
        )}
        <div className="stage25-heading">
          <Tip
            inline
            text="Пример вариантов параметра продукта:"
            image="/images/productParameterOption.png"
            imageAlt="Вариант параметра продукта — пример"
            imageSize="large"
            bubbleSize="large"
          />
          {embedded ? (
            <h2 className="stage2-section-title">Вариант параметра продукта</h2>
          ) : (
            <h1 className="title">
              {variantFillStageHeading(
                25,
                "Вариант параметра продукта",
                product,
                productId,
              )}
            </h1>
          )}
        </div>

        <p className="description">
          Вариант параметра продукта позволяет объединить продукты одной
          линейки, у которых меняются определенные характеристики (модель, объём
          памяти, цвет).
        </p>

        <h2 className="jh">
          Выберите варианты параметра продукта: можно выбрать от 1 до 5
          характеристик
        </h2>

        {error && <p className="form-error">{error}</p>}

        <div className="feature-list">
          {options.length === 0 && (
            <p className="paragraph">
              {embedded
                ? "Сначала заполните характеристики выше — тогда здесь появятся варианты для выбора."
                : "На этапе характеристик пока нет заполненных значений."}
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

      {!embedded && (
        <BottomBar
          current={fillProgressStep(25, product, productId) || variantFillStep(25) + offset}
          total={fillProgressTotal(product, productId) || CUSTOM_VARIANT_FILL_STAGE_COUNT + offset}
          prevPath="/stage23"
          onSave={save}
          onNext={() => {}}
        />
      )}
    </>
  );
});

export default Stage25;
