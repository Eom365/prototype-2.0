import { Fragment, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import { catalogApi, productsApi } from "../api";
import { sameId } from "../cardScope";
import { CUSTOM_CODE_PREFIX } from "../customCharacteristics";
import {
  CUSTOM_VARIANT_FILL_STAGE_COUNT,
  variantFillStageHeading,
  variantFillStep,
} from "../stageProgress";
import { saveNameFeatures, sortByVariantAxisHierarchy, sortVariantAxisCodes, variantAxisRank } from "../variantFlow";
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

function valueText(saved) {
  if (!saved) return "";
  if (saved.value === "other") return String(saved.customValue || "").trim();
  return String(saved.value || "").trim();
}

function axisOptions(product, catalog, variationId) {
  const axes = sortVariantAxisCodes(product?.variantAxes || []);
  if (!axes.length) return [];

  const variation = variationId
    ? (product?.variations || []).find((item) => sameId(item.id, variationId))
    : null;
  const values = variation?.values || [];
  const names = new Map(
    (findKind(catalog, product?.kindCode)?.characteristics || []).map((field) => [
      field.code,
      field.name,
    ]),
  );

  const options = [];
  for (const code of axes) {
    const saved = values.find((item) => item.code === code);
    if (!saved) continue;

    if (code.startsWith(CUSTOM_CODE_PREFIX)) {
      const name = String(saved.value || "").trim();
      const filled = String(saved.customValue || "").trim();
      if (!name && !filled) continue;
      if (filled) {
        options.push({ key: code, label: name, value: filled });
      } else {
        options.push({ key: code, label: name, value: name });
      }
      continue;
    }

    const filled = valueText(saved);
    if (!filled) continue;
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
  const parts = ["Логотип", "категория", "бренд", "линейка"];
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

function Stage26() {
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
        const nextOptions = axisOptions(product, catalog, variationId);
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
              .filter((item) => savedName.includes(item.label))
              .map((item) => item.key)
              .slice(0, MAX_NAME_FEATURES)
          : [];
        const selected = matched.length ? matched : [];
        setFeatures(selected);
        setLoaded(true);
      })
      .catch((loadError) => setError(loadError.message));
  }, [productId, variationId]);

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
      return next;
    });
  };

  const displayName = composeDisplayName(productSnapshot, options, features);

  const save = async () => {
    if (!productId) throw new Error("Сначала создайте карточку на главной странице");
    if (!variationId) throw new Error("Сначала создайте вариант");
    if (!loaded) throw new Error("Карточка ещё загружается, подождите секунду");
    if (!features.length) {
      throw new Error("Выберите от 1 до 3 характеристик для наименования");
    }
    const name = displayName;
    saveNameFeatures(productId, orderedSelectedKeys(features));
    await productsApi.saveVariationName(productId, variationId, {
      fullName: name,
      nameIncludesLogo: Boolean(logo),
      nameIncludesType: false,
      nameIncludesBrand: false,
      nameIncludesLine: false,
      nameIncludesModel: features.some((key) => key === "model"),
    });
  };

  return (
    <>
      <div className="container stage3-page stage4-page">
        <h1 className="title stage3-title">
          {variantFillStageHeading(
            26,
            "Наименование варианта параметра продукта",
          )}
        </h1>
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
          Наименование продукта - формируется из заполненных характеристик
          товара, которые могут изменяться при добавлении вариантов параметров
          товара
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
            value={displayName}
            readOnly
            placeholder="Наименование из выбранных характеристик"
          />
        </div>

        <p className="standart">
          Выберите от 1 до 3 характеристик, которые будут отображаться в
          наименовании варианта параметра продукта:
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

      <BottomBar
        current={variantFillStep(26)}
        total={CUSTOM_VARIANT_FILL_STAGE_COUNT}
        prevPath="/stage25"
        nextPath="/stage27"
        onSave={save}
      />
    </>
  );
}

export default Stage26;
