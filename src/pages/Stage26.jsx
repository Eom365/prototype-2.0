import { Fragment, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import VariantFlowHeader from "../components/VariantFlowHeader";
import { catalogApi, productsApi } from "../api";
import { sameId } from "../cardScope";
import { CUSTOM_CODE_PREFIX } from "../customCharacteristics";
import {
  CUSTOM_VARIANT_FILL_STAGE_COUNT,
  productWizardOffset,
  variantFillStageHeading,
  variantFillStep,
} from "../stageProgress";
import { formatVariantAxisValue } from "../variantAxisDisplay";
import {
  loadNameFeatures,
  saveNameFeatures,
  sortByVariantAxisHierarchy,
  sortVariantAxisCodes,
  variantAxisRank,
} from "../variantFlow";
import "./Stage2_3.css";
import "./Stage25.css";
import "./Stage26.css";

const MAX_NAME_FEATURES = 3;

function findKind(catalog, kindCode) {
  if (!catalog || !kindCode) return null;
  for (const category of catalog.categories || []) {
    const kind = (category.kinds || []).find((item) => item.code === kindCode);
    if (kind) return kind;
  }
  return null;
}

function axisOptions(product, catalog, variationId) {
  const axes = sortVariantAxisCodes(product?.variantAxes || []);
  if (!axes.length) return [];

  const variation = variationId
    ? (product?.variations || []).find((item) => sameId(item.id, variationId))
    : null;
  if (!variation) return [];
  const names = new Map(
    (findKind(catalog, product?.kindCode)?.characteristics || []).map((field) => [
      field.code,
      field.name,
    ]),
  );

  const options = [];
  for (const code of axes) {
    const filled = formatVariantAxisValue(product, catalog, variation, code);
    if (!filled) continue;
    if (code.startsWith(CUSTOM_CODE_PREFIX)) {
      const saved = (variation.values || []).find((item) => item.code === code);
      const name = String(saved?.value || "").trim();
      options.push({
        key: code,
        label: name || "Иное",
        value: filled,
      });
      continue;
    }
    options.push({
      key: code,
      label: names.get(code) || code,
      value: filled,
    });
  }
  return sortByVariantAxisHierarchy(options);
}

function orderedSelectedKeys(selectedKeys) {
  return sortVariantAxisCodes(selectedKeys).slice(0, MAX_NAME_FEATURES);
}

function buildFormula(options, selectedKeys) {
  const byKey = new Map(options.map((item) => [item.key, item]));
  const parts = ["Логотип", "тип продукта", "бренд", "линейка"];
  for (const key of orderedSelectedKeys(selectedKeys)) {
    const label = byKey.get(key)?.label;
    if (label) parts.push(label);
  }
  return parts.join(" + ");
}

function baseName(product) {
  const stored = (product?.fullName || "").trim();
  if (stored) return stored;
  return [
    (product?.productName || product?.categoryName || "").trim(),
    (product?.brandName || "").trim(),
    (product?.productLine || "").trim(),
  ]
    .filter(Boolean)
    .join(" ");
}

function composeDisplayName(product, options, selectedKeys) {
  const byKey = new Map(options.map((item) => [item.key, item]));
  const parts = [
    baseName(product),
    ...orderedSelectedKeys(selectedKeys)
      .map((key) => byKey.get(key)?.value)
      .filter(Boolean),
  ].filter(Boolean);
  return parts.join(" ");
}

const Stage26 = forwardRef(function Stage26(
  { embedded = false, previewOptions = null },
  ref,
) {
  const [params] = useSearchParams();
  const productId = params.get("id");
  const variationId = params.get("variationId");
  const [options, setOptions] = useState([]);
  const [productSnapshot, setProductSnapshot] = useState(null);
  const [logo, setLogo] = useState(null);
  const [error, setError] = useState("");
  const [features, setFeatures] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!productId) return;
    Promise.all([productsApi.get(productId), catalogApi.get()])
      .then(([product, catalog]) => {
        setProductSnapshot(product);
        const nextOptions =
          Array.isArray(previewOptions) && previewOptions.length
            ? previewOptions.map((item) => ({
                key: item.key,
                label: item.label,
                value: item.value,
              }))
            : axisOptions(product, catalog, variationId);
        setOptions(nextOptions);

        const logoFile =
          (product.files || []).find(
            (file) =>
              file.role === "logo" &&
              variationId &&
              sameId(file.variationId, variationId),
          ) ||
          (product.files || []).find(
            (file) => file.role === "logo" && !file.variationId,
          ) ||
          null;
        setLogo(logoFile);

        const variation = variationId
          ? (product.variations || []).find((item) =>
              sameId(item.id, variationId),
            )
          : null;

        const savedName = (variation?.fullName || "").trim();
        const matched = savedName
          ? nextOptions
              .filter(
                (item) =>
                  savedName.includes(item.value) ||
                  savedName.includes(item.label),
              )
              .map((item) => item.key)
              .slice(0, MAX_NAME_FEATURES)
          : [];
        const stored = loadNameFeatures(productId).filter((key) =>
          nextOptions.some((item) => item.key === key),
        );
        const selected = (matched.length ? matched : stored).slice(
          0,
          MAX_NAME_FEATURES,
        );
        setFeatures(selected);
        setLoaded(true);
      })
      .catch((loadError) => setError(loadError.message));
  }, [productId, variationId]);

  const previewSigRef = useRef("");
  useEffect(() => {
    if (!Array.isArray(previewOptions) || !previewOptions.length) return;
    const signature = previewOptions
      .map((item) => `${item.key}:${item.value}:${item.label || ""}`)
      .join("|");
    if (signature === previewSigRef.current) return;
    previewSigRef.current = signature;
    const nextOptions = previewOptions.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.value,
    }));
    setOptions(nextOptions);
    setFeatures((prev) => {
      const next = prev.filter((key) => nextOptions.some((item) => item.key === key));
      if (
        next.length === prev.length &&
        next.every((key, index) => key === prev[index])
      ) {
        return prev;
      }
      return next;
    });
  }, [previewOptions]);

  const toggleFeature = (key) => {
    setFeatures((prev) => {
      let next;
      if (prev.includes(key)) {
        next = prev.filter((item) => item !== key);
      } else {
        if (prev.length >= MAX_NAME_FEATURES) {
          setError(`Можно выбрать не больше ${MAX_NAME_FEATURES} характеристик`);
          return prev;
        }
        setError("");
        next = [...prev, key];
      }
      if (productId) saveNameFeatures(productId, orderedSelectedKeys(next));
      return next;
    });
  };

  const save = async (overrideVariationId) => {
    if (!productId) throw new Error("Сначала создайте карточку на главной странице");
    const targetVariationId = overrideVariationId || variationId;
    if (!targetVariationId) throw new Error("Сначала создайте вариант");
    if (!loaded) throw new Error("Карточка ещё загружается, подождите секунду");
    if (!features.length) {
      throw new Error("Выберите от 1 до 3 характеристик для наименования");
    }
    const name = composeDisplayName(productSnapshot, options, features);
    if (!name) throw new Error("Заполните наименование варианта");
    saveNameFeatures(productId, orderedSelectedKeys(features));
    await productsApi.saveVariationName(productId, targetVariationId, {
      fullName: name,
      nameIncludesLogo: Boolean(logo),
      nameIncludesType: false,
      nameIncludesBrand: false,
      nameIncludesLine: false,
      nameIncludesModel: features.some((key) => key === "model"),
    });
  };

  useImperativeHandle(ref, () => ({ save }), [
    productId,
    variationId,
    loaded,
    features,
    options,
    productSnapshot,
    logo,
  ]);

  return (
    <>
      <div className={embedded ? "stage26-embed stage3-page stage4-page" : "container stage3-page stage4-page"}>
        {!embedded && (
          <VariantFlowHeader product={productSnapshot} productId={productId} />
        )}
        {embedded ? (
          <h2 className="stage2-section-title">
            Наименование варианта параметра (модели) линейки продукта
          </h2>
        ) : (
          <h1 className="title stage3-title">
            {variantFillStageHeading(
              26,
              "Наименование варианта параметра продукта",
              null,
              productId,
            )}
          </h1>
        )}
        {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )}
        {productId && !variationId && (
          <p className="form-error">Сначала создайте вариант параметра продукта.</p>
        )}
        {error && <p className="form-error">{error}</p>}

        <p className="stage4-lead">
          Наименование варианта формируется из наименования линейки продукта и
          выбранных характеристик.
        </p>

        <p className="stage26-formula">{buildFormula(options, features)}</p>

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
            value={composeDisplayName(productSnapshot, options, features)}
            readOnly
            placeholder="Наименование варианта параметра продукта"
          />
        </div>

        <p className="standart">
          Выберите от 1 до 3 характеристик, которые будут отображаться в
          наименовании варианта параметра (модели) линейки продукта:
        </p>

        <div className="feature-list">
          {options.length === 0 && (
            <p className="paragraph">
              На этапе 4 пока не выбраны характеристики варианта параметра
              продукта.
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
                </label>
              </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      {!embedded && (
        <BottomBar
          current={variantFillStep(26) + productWizardOffset(productId)}
          total={CUSTOM_VARIANT_FILL_STAGE_COUNT + productWizardOffset(productId)}
          prevPath="/stage23"
          nextPath="/stage23"
          onSave={save}
        />
      )}
    </>
  );
});

export default Stage26;
