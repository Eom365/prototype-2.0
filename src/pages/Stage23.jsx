import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import CustomCharacteristicsBlock from "../components/CustomCharacteristicsBlock";
import DimensionsGroup from "../components/DimensionsGroup";
import ImageHint from "../components/ImageHint";
import VariantFlowHeader from "../components/VariantFlowHeader";
import { catalogApi, productsApi } from "../api";
import { axisValueFromVariation, sameId, useCardIds, variationSpecsFrom } from "../cardScope";
import {
  CUSTOM_CODE_PREFIX,
  allUnitOptions,
  customRowsFromValues,
  displayCustomCharacteristic,
  normalizeCustomRows,
  serializeCustomRows,
} from "../customCharacteristics";
import { DIMENSION_CODES, dimensionUnitLabel, prefillSpecFromProduct } from "../productSpecs";
import {
  customTechFieldsFromProduct,
  loadNameFeatures,
  needsCustomVariantSetup,
  nextPathAfterCharacteristics,
  resolveVariantFlow,
} from "../variantFlow";
import {
  VARIANT_FILL_STAGE_COUNT,
  fillProgressStep,
  fillProgressTotal,
  variantFillStageHeading,
} from "../stageProgress";
import {
  isCharacteristicsTabFilled,
  markVisited,
  tabClassName,
} from "../wizardTabStatus";
import Stage24 from "./Stage24";
import Stage25 from "./Stage25";
import Stage26 from "./Stage26";
import "./Stage2.css";
import "./Stage5.css";
import "./Stage24.css";
import "./Stage23.css";

const DIMENSIONS_HINT_IMAGE = "/images/dimensions.png";
const WEIGHT_CODES = ["weight", "weightTolerance"];
const FIELD_LABELS = {
  article: "Артикул продукта от завода-изготовителя",
};

function mainFieldsOrder(fields) {
  const rank = { article: 0, model: 1 };
  return [...fields].sort(
    (a, b) => (rank[a.code] ?? 10) - (rank[b.code] ?? 10),
  );
}

// ===== НОВЫЕ КОНСТАНТЫ ДЛЯ ГАРАНТИЙНЫХ ПОЛЕЙ =====
const WARRANTY_FIELDS = [
  {
    code: "warrantyPeriod",
    name: "Гарантийный срок эксплуатации",
    defaultUnit: "months",
    hint: "Срок, в течение которого производитель устраняет недостатки бесплатно",
  },
  {
    code: "serviceLife",
    name: "Срок службы продукта",
    defaultUnit: "months",
    hint: "Период, в течение которого товар пригоден и безопасен для использования",
  },
];

const TIME_UNITS = [
  { value: "days", label: "дней" },
  { value: "months", label: "месяцев" },
  { value: "years", label: "лет"}
];
// ===================================================

const TABS = [
  { key: "main", label: "Основные" },
  { key: "dimensions", label: "Габаритные размеры и вес" },
  { key: "manufacturer", label: "Производитель" },
  { key: "garant", label: "Гарантийные обязательства" },
  { key: "tech", label: "Технические характеристики" },
  { key: "custom", label: "Добавьте характеристики" },
  { key: "review", label: "Просмотр заполненных характеристик" },
];

const defaultUnits = {
  weight: "gram",
  tolerance: "gram",
  dimension: "millimeters",
  duration: "months",
};

function findKind(catalog, kindCode) {
  if (!catalog || !kindCode) return null;
  for (const category of catalog.categories) {
    const kind = category.kinds.find((item) => item.code === kindCode);
    if (kind) return kind;
  }
  return null;
}

function buildGroups(kind) {
  const groups = [];
  for (const field of kind?.characteristics || []) {
    let group = groups.find((item) => item.name === field.group);
    if (!group) {
      group = { name: field.group, fields: [] };
      groups.push(group);
    }
    group.fields.push(field);
  }
  return groups;
}

function unitLabelForSpec(field, unitCode, unitGroups) {
  if (!unitCode) return "";
  if (field?.unitGroup) {
    const match = (unitGroups?.[field.unitGroup] || []).find(
      (item) => item.value === unitCode,
    );
    if (match) return match.label;
  }
  for (const group of Object.values(unitGroups || {})) {
    const match = group.find((item) => item.value === unitCode);
    if (match) return match.label;
  }
  if (field?.code && DIMENSION_CODES.includes(field.code)) {
    return dimensionUnitLabel(unitCode);
  }
  return unitCode;
}

function formatSpecValue(field, value, unitGroups) {
  if (!value) return "";
  const raw =
    value.value === "other"
      ? (value.customValue || "").trim()
      : (value.value || "").trim();
  if (!raw) return "";
  const option = (field.options || []).find((o) => o.value === raw);
  let text = option ? option.label : raw;
  const unitLabel = unitLabelForSpec(field, value.unit, unitGroups);
  if (unitLabel) text = `${text} ${unitLabel}`;
  return text;
}

function formatCustomRowDisplay(row, unitGroups) {
  const value = String(row.value || "").trim();
  if (!value) return "";
  const unit =
    row.unitMode === "other"
      ? String(row.customUnit || "").trim()
      : String(row.unit || "").trim();
  if (!unit) return value;
  return displayCustomCharacteristic(
    { customValue: value, unit },
    unitGroups,
  );
}

function CharacteristicRow({ field, value, unitGroups, onChange }) {
  const raw = value || { value: "", customValue: "", unit: "" };
  const optionValues = new Set((field.options || []).map((item) => item.value));
  const current =
    field.inputType === "choice" &&
      field.allowCustom &&
      raw.value &&
      raw.value !== "other" &&
      !optionValues.has(raw.value)
      ? { ...raw, value: "other", customValue: raw.value }
      : raw;
  const units = field.unitGroup ? unitGroups?.[field.unitGroup] || [] : [];
  const placeholder =
    field.code === "article" ? "Введите значение" : "Значение";

  return (
    <div
      className={`field-row ${field.inputType === "choice" ? "field-row--options" : ""}`}
    >
      <span className="info-icon" title="Подсказка">
        ⓘ
      </span>
      <span className="required-mark-slot">
        {field.required && <span className="required-mark">✱</span>}
      </span>
      <span className="field-name">
        {FIELD_LABELS[field.code] || field.name}
      </span>

      {field.inputType === "choice" ? (
        <div className="option-group">
          {(field.options || []).map((option) => (
            <button
              type="button"
              key={option.value}
              className={`option-btn ${current.value === option.value ? "option-btn--active" : ""}`}
              onClick={() => onChange({ value: option.value, customValue: "" })}
            >
              {option.label}
            </button>
          ))}
          {field.allowCustom && (
            <button
              type="button"
              className={`option-btn ${current.value === "other" ? "option-btn--active" : ""}`}
              onClick={() => onChange({ value: "other" })}
            >
              Иное
            </button>
          )}
          {field.allowCustom && current.value === "other" && (
            <input
              type="text"
              className="field-input option-custom-input"
              placeholder="Введите своё значение"
              value={current.customValue}
              onChange={(event) =>
                onChange({ customValue: event.target.value })
              }
            />
          )}
        </div>
      ) : (
        <input
          type="text"
          className="field-input"
          placeholder={placeholder}
          value={current.value}
          onChange={(event) => onChange({ value: event.target.value })}
        />
      )}

      {units.length > 0 && (
        <select
          className="field-select"
          value={current.unit || units[0].value}
          onChange={(event) => onChange({ unit: event.target.value })}
        >
          {units.map((unit) => (
            <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function Stage23() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const productId = params.get("id");
  const { variationId } = useCardIds();

  const [catalog, setCatalog] = useState(null);
  const [kindCode, setKindCode] = useState("");
  const [nextStage, setNextStage] = useState("/stage24");
  const [specs, setSpecs] = useState({});
  const [customRows, setCustomRows] = useState(() => normalizeCustomRows([]));
  const [techCustomFields, setTechCustomFields] = useState([]);
  const [techCustomValues, setTechCustomValues] = useState({});
  const [techCustomUnits, setTechCustomUnits] = useState({});
  const [productLine, setProductLine] = useState("");
  const [categorySnapshot, setCategorySnapshot] = useState(null);
  const [progressProduct, setProgressProduct] = useState(null);
  const [stabilized, setStabilized] = useState(false);
  const [logo, setLogo] = useState(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("main");
  const [visitedTabs, setVisitedTabs] = useState(["main"]);
  const [panelFocus, setPanelFocus] = useState("characteristics");
  const [axisPreview, setAxisPreview] = useState([]);
  const [charsRefreshKey, setCharsRefreshKey] = useState(0);
  const axisRef = useRef(null);
  const nameRef = useRef(null);
  const descriptionRef = useRef(null);
  const axisPreviewSigRef = useRef("");
  const handleAxisSelectionChange = useCallback((items) => {
    const next = items || [];
    const signature = next
      .map((item) => `${item.key}:${item.value}:${item.unit || ""}`)
      .join("|");
    if (signature === axisPreviewSigRef.current) return;
    axisPreviewSigRef.current = signature;
    setAxisPreview(next);
  }, []);
  const [phase, setPhase] = useState("edit");
  const logoInputRef = useRef(null);

  const go = (path) => navigate({ pathname: path, search: location.search });

  useEffect(() => {
    catalogApi
      .get()
      .then(setCatalog)
      .catch((loadError) => setError(loadError.message));
  }, []);

  useEffect(() => {
    if (!productId || !catalog) return;
    productsApi
      .get(productId)
      .then((product) => {
        const variation = variationId
          ? (product.variations || []).find(
            (item) =>
              String(item.id).toLowerCase() ===
              String(variationId).toLowerCase(),
          )
          : null;

        setKindCode(product.kindCode || "");
        setProgressProduct(product);
        const flow = resolveVariantFlow(product);
        setStabilized(Boolean(flow.stabilized));
        setNextStage(nextPathAfterCharacteristics(product));
        setProductLine(product.productLine || "");
        setCategorySnapshot({
          purpose: product.purpose || "",
          kindCode: product.kindCode || "",
          productName: product.productName || "",
          categoryPath: product.categoryPath || "",
          productLine: product.productLine || "",
        });

        const kind = findKind(catalog, product.kindCode);
        const fields = kind?.characteristics || [];
        const techFields = flow.stabilized
          ? customTechFieldsFromProduct(product)
          : [];
        setTechCustomFields(techFields);

        if (variation) {
          // ===== ИЗМЕНЕНО: загружаем specs и добавляем гарантийные поля =====
          const loadedSpecs = variationSpecsFrom(product, variation, fields, defaultUnits);
          for (const wf of WARRANTY_FIELDS) {
            const saved = (variation.values || []).find((item) => item.code === wf.code);
            loadedSpecs[wf.code] = {
              value: String(saved?.value || saved?.customValue || "").trim(),
              customValue: "",
              unit: String(saved?.unit || wf.defaultUnit).trim(),
            };
          }
          setSpecs(loadedSpecs);
          // ================================================================

          const techValues = {};
          const techUnits = {};
          for (const field of techFields) {
            const saved = (variation.values || []).find(
              (item) => item.code === field.code,
            );
            techValues[field.code] = String(saved?.customValue || "").trim();
            techUnits[field.code] = String(
              saved?.unit || field.unit || "",
            ).trim();
          }
          setTechCustomValues(techValues);
          setTechCustomUnits(techUnits);

          const knownTechCodes = new Set(techFields.map((item) => item.code));
          setCustomRows(
            normalizeCustomRows(
              customRowsFromValues(
                (variation.values || []).filter(
                  (item) =>
                    item.code?.startsWith(CUSTOM_CODE_PREFIX) &&
                    !knownTechCodes.has(item.code),
                ),
                { variationId },
                catalog.unitGroups,
              ),
            ),
          );
          setLogo(
            (product.files || []).find(
              (file) =>
                file.role === "logo" &&
                String(file.variationId || "").toLowerCase() ===
                String(variationId).toLowerCase(),
            ) || null,
          );
        } else {
          const next = {};
          for (const field of fields) {
            const saved = (product.values || []).find(
              (value) => value.code === field.code && !value.variationId,
            );
            const defaultUnit = field.unitGroup
              ? defaultUnits[field.unitGroup]
              : "";
            next[field.code] = prefillSpecFromProduct(
              field.code,
              saved,
              product,
              defaultUnit,
            );
          }
          for (const wf of WARRANTY_FIELDS) {
            const saved = (product.values || []).find(
              (item) => item.code === wf.code && !item.variationId,
            );
            next[wf.code] = {
              value: String(saved?.value || saved?.customValue || "").trim(),
              customValue: "",
              unit: String(saved?.unit || wf.defaultUnit).trim(),
            };
          }
          setSpecs(next);

          const knownTechCodes = new Set(techFields.map((item) => item.code));
          setCustomRows(
            normalizeCustomRows(
              customRowsFromValues(
                (product.values || []).filter(
                  (item) =>
                    !item.variationId &&
                    item.code?.startsWith(CUSTOM_CODE_PREFIX) &&
                    !knownTechCodes.has(item.code),
                ),
                {},
                catalog.unitGroups,
              ),
            ),
          );
          const techValues = {};
          const techUnits = {};
          for (const field of techFields) {
            const saved = (product.values || []).find(
              (item) => item.code === field.code && !item.variationId,
            );
            techValues[field.code] = String(saved?.customValue || "").trim();
            techUnits[field.code] = String(
              saved?.unit || field.unit || "",
            ).trim();
          }
          setTechCustomValues(techValues);
          setTechCustomUnits(techUnits);
          setLogo(
            (product.files || []).find(
              (file) => file.role === "logo" && !file.variationId,
            ) || null,
          );
        }
        setLoaded(true);
      })
      .catch((loadError) => setError(loadError.message));
  }, [productId, variationId, catalog]);

  const kind = findKind(catalog, kindCode);
  const groups = buildGroups(kind);
  const mainGroup = groups.find((group) => group.name === "Основные");
  const dimensionsGroup = groups.find((group) => group.name === "Габариты");
  const manufacturerGroup = groups.find(
    (group) => group.name === "Производитель",
  );
  const techGroups = groups.filter(
    (group) =>
      ![
        "Основные",
        "Габариты",
        "Производитель",
        "Гарантия",
        "Гарантийные обязательства",
      ].includes(group.name),
  );
  const weightFields = (mainGroup?.fields || []).filter((field) =>
    WEIGHT_CODES.includes(field.code),
  );
  const mainFields = (mainGroup?.fields || []).filter(
    (field) => !WEIGHT_CODES.includes(field.code),
  );
  const manufacturerFields = (manufacturerGroup?.fields || []).filter(
    (field) =>
      field.code !== "brand" &&
      field.code !== "warranty" &&
      field.code !== "warrantyPeriod" &&
      field.code !== "serviceLife",
  );
  const isCustomFlow = resolveVariantFlow(progressProduct).mode === "custom";
  const showCustomVariantSetup = needsCustomVariantSetup(progressProduct);

  const tabs = TABS;
  const currentIndex = tabs.findIndex((tab) => tab.key === activeTab);
  const charTabContext = {
    specs,
    mainFields,
    weightFields,
    manufacturerFields,
    techGroups,
    customRows,
    productLine,
    logo,
  };

  const selectTab = (key) => {
    if (activeTab === key && panelFocus === "characteristics") {
      setActiveTab(null);
      setPanelFocus(null);
      return;
    }
    setActiveTab(key);
    setVisitedTabs((prev) => markVisited(prev, key));
    setPanelFocus("characteristics");
  };

  const handleDescriptionOpenChange = (open) => {
    if (open) {
      setPanelFocus("description");
      setActiveTab(null);
      return;
    }
    if (panelFocus === "description") {
      setPanelFocus(null);
    }
  };

  useEffect(() => {
    if (!showCustomVariantSetup || !loaded || !productId) return undefined;
    const timer = window.setTimeout(() => {
      persist()
        .then(() => setCharsRefreshKey((prev) => prev + 1))
        .catch(() => {});
    }, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showCustomVariantSetup,
    loaded,
    productId,
    specs,
    customRows,
    productLine,
    techCustomValues,
    techCustomUnits,
  ]);

  const updateSpec = (code, patch) => {
    setSpecs((prev) => {
      const next = {
        ...prev,
        [code]: {
          ...(prev[code] || { value: "", customValue: "", unit: "" }),
          ...patch,
        },
      };
      if (code === "light" && patch.value === "no") {
        next.lightSource = {
          ...(prev.lightSource || { value: "", customValue: "", unit: "" }),
          value: "",
          customValue: "",
        };
      }
      return next;
    });
  };

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !productId) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("role", "logo");
    if (variationId) formData.append("variationId", variationId);
    setError("");
    try {
      const saved = await productsApi.upload(productId, formData);
      setLogo(saved);
    } catch (uploadError) {
      setError(uploadError.message);
    }
  };

  const handleLogoRemove = async () => {
    if (!logo?.id) {
      setLogo(null);
      return;
    }
    setError("");
    try {
      await productsApi.deleteFile(logo.id);
      setLogo(null);
    } catch (removeError) {
      setError(removeError.message);
    }
  };

  const persist = async () => {
    if (!productId)
      throw new Error("Сначала создайте карточку на главной странице");
    if (!loaded) throw new Error("Карточка ещё загружается, подождите секунду");
    if (categorySnapshot) {
      await productsApi.saveCategory(productId, {
        ...categorySnapshot,
        productLine: productLine.trim() || categorySnapshot.productLine || "",
      });
    }
    const latest = variationId ? await productsApi.get(productId) : null;
    const variation = variationId && latest
      ? (latest.variations || []).find((item) => sameId(item.id, variationId))
      : null;
    const axes = new Set(latest?.variantAxes || []);

    const techCodes = new Set(techCustomFields.map((item) => item.code));
    const values = [
      ...Object.entries(specs).map(([code, spec]) => {
        let value = spec.value;
        let customValue = spec.customValue;
        const empty =
          !String(value || "").trim() && !String(customValue || "").trim();
        if (empty && variation && axes.has(code)) {
          const axisText = axisValueFromVariation(variation, code);
          if (axisText) value = axisText;
        }
        return {
          code,
          value,
          customValue,
          unit: spec.unit || null,
        };
      }),
      ...techCustomFields.map((field) => ({
        code: field.code,
        value: field.name,
        customValue: String(techCustomValues[field.code] || "").trim(),
        unit: String(techCustomUnits[field.code] || field.unit || "").trim() || null,
      })),
      ...serializeCustomRows(customRows).filter(
        (row) => !techCodes.has(row.code),
      ),
    ];
    if (variationId) {
      await productsApi.saveVariationCharacteristics(productId, variationId, {
        values,
      });
      const shouldAutoNameVariant =
        stabilized ||
        (!showCustomVariantSetup &&
          Boolean((progressProduct?.variantAxes || []).filter(Boolean).length));
      if (shouldAutoNameVariant && progressProduct) {
        let featureCodes = loadNameFeatures(productId);
        if (!featureCodes.length) {
          const approved = (progressProduct.variations || []).find(
            (item) =>
              (item.reviewStatus || "").toLowerCase() === "approved" &&
              (item.fullName || "").trim(),
          );
          const fullName = (approved?.fullName || "").trim();
          if (fullName) {
            const candidates = [
              ...techCustomFields.map((item) => ({
                code: item.code,
                label: item.name,
              })),
              ...(progressProduct.variantAxes || []).map((code) => ({
                code,
                label:
                  code === "model"
                    ? "Модель"
                    : code === "volume"
                      ? "Объем"
                      : code === "width"
                        ? "Ширина"
                        : code === "height"
                          ? "Высота"
                          : code === "length"
                            ? "Длина"
                            : code === "weight"
                              ? "Вес"
                              : code,
              })),
            ];
            featureCodes = candidates
              .filter((item) => item.label && fullName.includes(item.label))
              .map((item) => item.code)
              .slice(0, 3);
          }
        }
        const nameParts = [];
        for (const code of featureCodes) {
          const tech = techCustomFields.find((item) => item.code === code);
          if (tech) {
            const text = displayCustomCharacteristic(
              {
                customValue: String(techCustomValues[code] || "").trim(),
                unit: String(techCustomUnits[code] || tech.unit || "").trim(),
              },
              catalog?.unitGroups,
            );
            if (text) nameParts.push(text);
            continue;
          }
          const spec = specs[code];
          if (spec) {
            const field = (kind?.characteristics || []).find(
              (item) => item.code === code,
            );
            const text = field
              ? formatSpecValue(field, spec, catalog?.unitGroups)
              : spec.value === "other"
                ? String(spec.customValue || "").trim()
                : String(spec.value || "").trim();
            if (text) nameParts.push(text);
            continue;
          }
          const fromValues = values.find((item) => item.code === code);
          if (fromValues) {
            const text =
              fromValues.value === "other" ||
                String(fromValues.code || "").startsWith("custom:")
                ? String(fromValues.customValue || "").trim() ||
                String(fromValues.value || "").trim()
                : String(fromValues.value || "").trim();
            if (text) nameParts.push(text);
          }
        }
        const base = [
          (progressProduct.fullName || "").trim() ||
          [
            (progressProduct.productName || "").trim(),
            (progressProduct.brandName || "").trim(),
            (productLine || progressProduct.productLine || "").trim(),
          ]
            .filter(Boolean)
            .join(" "),
          ...nameParts,
        ]
          .filter(Boolean)
          .join(" ");
        const logoFile =
          (progressProduct.files || []).find(
            (file) =>
              file.role === "logo" &&
              String(file.variationId || "").toLowerCase() ===
              String(variationId).toLowerCase(),
          ) ||
          (progressProduct.files || []).find(
            (file) => file.role === "logo" && !file.variationId,
          );
        await productsApi.saveVariationName(productId, variationId, {
          fullName: base,
          nameIncludesLogo: Boolean(logoFile),
          nameIncludesType: false,
          nameIncludesBrand: false,
          nameIncludesLine: false,
          nameIncludesModel: featureCodes.includes("model"),
        });
      }
    } else {
      await productsApi.saveCharacteristics(productId, { values });
    }
  };

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await persist();

      if (activeTab === "review") {
        go(nextStage);
        return;
      }

      setVisitedTabs((prev) => markVisited(prev, activeTab));
      const nextIndex = currentIndex + 1;
      if (nextIndex < tabs.length) {
        selectTab(tabs[nextIndex].key);
      }
    } catch (saveError) {
      setError(saveError.message || "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    if (phase === "review") {
      setPhase("edit");
      setActiveTab(tabs[tabs.length - 1].key);
      return;
    }
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].key);
      return;
    }
    go("/stage14");
  };

  const renderFields = (fields) =>
    fields
      .filter(
        (field) =>
          !(field.code === "lightSource" && specs.light?.value === "no"),
      )
      .map((field) => (
        <CharacteristicRow
          key={field.code}
          field={field}
          value={specs[field.code]}
          unitGroups={catalog?.unitGroups}
          onChange={(patch) => updateSpec(field.code, patch)}
        />
      ));

  return (
    <>
      <div
        className={`container stage24-page stage23-page${phase === "review" ? " stage23-page--review" : ""}`}
      >
        <VariantFlowHeader product={progressProduct} productId={productId} />
        <h1 className="title stage24-title">
          {variantFillStageHeading(
            23,
            showCustomVariantSetup
              ? "Характеристики, вариант и описание продукта"
              : "Характеристики и описание продукта",
            progressProduct,
            productId,
          )}
        </h1>
        <h2 className="stage2-section-title">
          Характеристики варианта параметра продукта
        </h2>

        {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )}
        {error && <p className="form-error">{error}</p>}

        {phase === "edit" ? (
          <>
            <div className="stage24-tabs" role="tablist">
              {tabs.map((tab) => {
                const active =
                  panelFocus === "characteristics" && activeTab === tab.key;
                const visited = visitedTabs.includes(tab.key);
                const filled = isCharacteristicsTabFilled(tab.key, charTabContext);
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={tabClassName({ active, visited, filled })}
                    onClick={() => selectTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <input
              type="file"
              accept="image/*"
              ref={logoInputRef}
              onChange={handleLogoChange}
              style={{ display: "none" }}
            />

            {/* ===== ОСНОВНЫЕ ===== */}
            {panelFocus === "characteristics" && activeTab === "main" && (
              <div className="form">
                <h2 className="stage24-section-title">Основные</h2>
                <p className="stage23-subtitle-line">Заполните линейку, модель и артикул продукта от завода-изготовителя:</p>

                {mainFields
                  .filter((field) => field.code === "brand")
                  .map((field) => (
                    <CharacteristicRow
                      key={field.code}
                      field={field}
                      value={specs[field.code]}
                      unitGroups={catalog?.unitGroups}
                      onChange={(patch) => updateSpec(field.code, patch)}
                    />
                  ))}

                <div className="field-row product-line-row">
                  <span className="info-icon" title="Подсказка">
                    ⓘ
                  </span>
                  <span className="required-mark-slot" aria-hidden="true" />
                  <span className="field-name">Линейка продукции</span>
                  <div className="product-line-control">
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Линейка продукции"
                      value={productLine}
                      onChange={(event) => setProductLine(event.target.value)}
                    />
                  </div>
                </div>

                {renderFields(
                  mainFieldsOrder(
                    mainFields.filter((field) => field.code !== "brand"),
                  ),
                )}
              </div>
            )}

            {/* ===== ГАБАРИТЫ И ВЕС ===== */}
            {panelFocus === "characteristics" && activeTab === "dimensions" && (
              <div className="form">
                <h2 className="stage24-section-title">
                  Габаритные размеры и вес
                </h2>

                <p className="io">Габаритные размеры<ImageHint
                  src={DIMENSIONS_HINT_IMAGE}
                  alt="Длина, ширина и высота"
                  title="Как измерять габариты"
                  size="large"
                /></p>
                <p className="stage23-subtitle-line">Заполните габариты продукта (длина × ширина × высота):</p>
                {dimensionsGroup && (
                  <DimensionsGroup
                    fields={dimensionsGroup.fields}
                    specs={specs}
                    unitOptions={catalog?.unitGroups?.dimension || []}
                    onChange={updateSpec}
                  />
                )}
                <p className="io">Вес</p>
                <p className="stage23-subtitle-line">Заполните вес продукта:</p>
                {renderFields(weightFields)}
              </div>
            )}

            {/* ===== ПРОИЗВОДИТЕЛЬ ===== */}
            {panelFocus === "characteristics" && activeTab === "manufacturer" && (
              <div className="form">
                <h2 className="stage24-section-title">Производитель</h2>
                <p className="stage23-subtitle-line">Заполните сведения о производителе продукта. <br />При заполнении ориентируйтесь на следующие документы:<br /> 1.Руководство по эксплуатации<br /></p>

                {renderFields(
                  (manufacturerGroup?.fields || []).filter(
                    (field) =>
                      field.code !== "brand" &&
                      field.code !== "warranty" &&
                      field.code !== "warrantyPeriod" &&
                      field.code !== "serviceLife",
                  ),
                )}
              </div>
            )}

            {/* ===== ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА ===== */}
            {panelFocus === "characteristics" && activeTab === "garant" && (
              <div className="form">
                <h2 className="stage24-section-title">Гарантийные обязательства</h2>
                <p className="stage23-subtitle-line">
                  Укажите гарантийный срок эксплуатации и срок службы продукта:
                </p>

                {WARRANTY_FIELDS.map((wf) => {
                  const spec = specs[wf.code] || {
                    value: "",
                    customValue: "",
                    unit: wf.defaultUnit,
                  };
                  return (
                    <div className="field-row" key={wf.code}>
                      <span className="info-icon" title={wf.hint}>ⓘ</span>
                      <span className="required-mark-slot" aria-hidden="true" />
                      <span className="field-name">{wf.name}</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="field-input"
                        placeholder="Введите число"
                        value={spec.value || ""}
                        onChange={(event) =>
                          updateSpec(wf.code, { value: event.target.value })
                        }
                      />
                      <select
                        className="field-select"
                        value={spec.unit || wf.defaultUnit}
                        onChange={(event) =>
                          updateSpec(wf.code, { unit: event.target.value })
                        }
                      >
                        {TIME_UNITS.map((u) => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ===== ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ ===== */}
            {panelFocus === "characteristics" && activeTab === "tech" && (
              <div className="form">
                <h2 className="stage24-section-title">
                  Технические характеристики
                </h2>
                <p className="stage23-subtitle-line">Заполните технические характеристики продукта:</p>

                {techGroups.length === 0 && techCustomFields.length === 0 && (
                  <p className="paragraph">
                    Для выбранной категории технические характеристики не
                    заданы.
                  </p>
                )}
                {techGroups.map((group) => (
                  <div key={group.name}>
                    <h3 className="subtitle subtitle--spaced">{group.name}</h3>
                    {renderFields(group.fields)}
                  </div>
                ))}
                {techCustomFields.length > 0 && (
                  <div>
                    {techGroups.length > 0 && (
                      <h3 className="subtitle subtitle--spaced">
                        Добавленные характеристики
                      </h3>
                    )}
                    {techCustomFields.map((field) => {
                      const units = allUnitOptions(catalog?.unitGroups);
                      const known = new Set(units.map((item) => item.value));
                      const currentUnit = String(
                        techCustomUnits[field.code] || field.unit || "",
                      ).trim();
                      const unitMode =
                        currentUnit && !known.has(currentUnit)
                          ? "other"
                          : "preset";
                      return (
                        <div
                          className="field-row field-row--tech-custom"
                          key={field.code}
                        >
                          <span className="info-icon" title="Подсказка">
                            ⓘ
                          </span>
                          <span
                            className="required-mark-slot"
                            aria-hidden="true"
                          />
                          <span className="field-name">{field.name}</span>
                          <div className="tech-custom-control">
                            <input
                              type="text"
                              className="field-input"
                              placeholder="Значение"
                              value={techCustomValues[field.code] || ""}
                              onChange={(event) =>
                                setTechCustomValues((prev) => ({
                                  ...prev,
                                  [field.code]: event.target.value,
                                }))
                              }
                            />
                            <select
                              className="field-select"
                              value={
                                unitMode === "other" ? "other" : currentUnit
                              }
                              onChange={(event) => {
                                const next = event.target.value;
                                if (next === "other") {
                                  setTechCustomUnits((prev) => ({
                                    ...prev,
                                    [field.code]:
                                      currentUnit && !known.has(currentUnit)
                                        ? currentUnit
                                        : "",
                                  }));
                                  return;
                                }
                                setTechCustomUnits((prev) => ({
                                  ...prev,
                                  [field.code]: next,
                                }));
                              }}
                            >
                              <option value="">Единица измерения</option>
                              {units.map((unit) => (
                                <option key={unit.value} value={unit.value}>
                                  {unit.label}
                                </option>
                              ))}
                              <option value="other">Иное</option>
                            </select>
                            {unitMode === "other" && (
                              <input
                                type="text"
                                className="field-input tech-custom-control__unit"
                                placeholder="Своя единица"
                                value={currentUnit}
                                onChange={(event) =>
                                  setTechCustomUnits((prev) => ({
                                    ...prev,
                                    [field.code]: event.target.value,
                                  }))
                                }
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ===== ДОБАВЬТЕ ХАРАКТЕРИСТИКИ ===== */}
            {panelFocus === "characteristics" && activeTab === "custom" && (
              <div className="form">
                <h2 className="stage24-section-title">
                  Добавьте характеристики
                </h2>
                <p className="stage23-subtitle-line">Заполните наименование характеристики, ее значение и выберите единицу измерения:</p>

                <CustomCharacteristicsBlock
                  rows={customRows}
                  unitGroups={catalog?.unitGroups}
                  onChange={setCustomRows}
                />
              </div>
            )}

            {/* ===== ПРОСМОТР ЗАПОЛНЕННЫХ ХАРАКТЕРИСТИК ===== */}
            {panelFocus === "characteristics" && activeTab === "review" && (
              <div className="form">
                <h2 className="stage24-section-title">
                  Просмотр заполненных характеристик
                </h2>
                <p className="stage23-subtitle-line">
                  Проверьте значения перед отправкой:
                </p>

                {/* Основные + Бренд + Логотип + Линейка */}
                {(() => {
                  const rows = [];

                  const brandField = mainFields.find((f) => f.code === "brand");
                  if (brandField) {
                    const text = formatSpecValue(
                      brandField,
                      specs[brandField.code],
                      catalog?.unitGroups,
                    );
                    if (text) {
                      rows.push({
                        label: FIELD_LABELS[brandField.code] || brandField.name,
                        value: text,
                      });
                    }
                  }

                  if (logo) {
                    rows.push({
                      label: "Логотип",
                      value: logo.name,
                      isImage: true,
                      imageUrl: logo.url,
                    });
                  }

                  if (productLine?.trim()) {
                    rows.push({
                      label: "Линейка продукции",
                      value: productLine.trim(),
                    });
                  }

                  for (const field of mainFieldsOrder(mainFields)) {
                    if (field.code === "brand") continue;
                    const text = formatSpecValue(
                      field,
                      specs[field.code],
                      catalog?.unitGroups,
                    );
                    if (text) {
                      rows.push({
                        label: FIELD_LABELS[field.code] || field.name,
                        value: text,
                      });
                    }
                  }

                  for (const field of weightFields) {
                    const text = formatSpecValue(
                      field,
                      specs[field.code],
                      catalog?.unitGroups,
                    );
                    if (text) {
                      rows.push({
                        label: FIELD_LABELS[field.code] || field.name,
                        value: text,
                      });
                    }
                  }

                  if (rows.length === 0) return null;

                  return (
                    <div className="review-block">
                      <h3 className="subtitle subtitle--spaced">Основные</h3>
                      <div className="review-list">
                        {rows.map((row, i) => (
                          <div className="review-row" key={i}>
                            <span className="review-row__label">
                              {row.label}
                            </span>
                            <span className="review-row__value">
                              {row.isImage ? (
                                <img
                                  src={row.imageUrl}
                                  alt={row.value}
                                  className="review-row__img"
                                />
                              ) : (
                                row.value
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Габариты и вес */}
                {(() => {
                  const rows = [];

                  for (const field of dimensionsGroup?.fields || []) {
                    const text = formatSpecValue(
                      field,
                      specs[field.code],
                      catalog?.unitGroups,
                    );
                    if (text) {
                      rows.push({
                        label: FIELD_LABELS[field.code] || field.name,
                        value: text,
                      });
                    }
                  }

                  for (const field of weightFields) {
                    const text = formatSpecValue(
                      field,
                      specs[field.code],
                      catalog?.unitGroups,
                    );
                    if (text) {
                      rows.push({
                        label: FIELD_LABELS[field.code] || field.name,
                        value: text,
                      });
                    }
                  }

                  if (rows.length === 0) return null;

                  return (
                    <div className="review-block">
                      <h3 className="subtitle subtitle--spaced">
                        Габаритные размеры и вес
                      </h3>
                      <div className="review-list">
                        {rows.map((row, i) => (
                          <div className="review-row" key={i}>
                            <span className="review-row__label">
                              {row.label}
                            </span>
                            <span className="review-row__value">
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Производитель */}
                {(() => {
                  const rows = [];

                  for (const field of (manufacturerGroup?.fields || []).filter(
                    (f) =>
                      f.code !== "brand" &&
                      f.code !== "warranty" &&
                      f.code !== "warrantyPeriod" &&
                      f.code !== "serviceLife",
                  )) {
                    const text = formatSpecValue(
                      field,
                      specs[field.code],
                      catalog?.unitGroups,
                    );
                    if (text) {
                      rows.push({
                        label: FIELD_LABELS[field.code] || field.name,
                        value: text,
                      });
                    }
                  }

                  if (rows.length === 0) return null;

                  return (
                    <div className="review-block">
                      <h3 className="subtitle subtitle--spaced">
                        Производитель
                      </h3>
                      <div className="review-list">
                        {rows.map((row, i) => (
                          <div className="review-row" key={i}>
                            <span className="review-row__label">
                              {row.label}
                            </span>
                            <span className="review-row__value">
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* ===== ДОБАВЛЕНО: Гарантийные обязательства ===== */}
                {(() => {
                  const rows = [];
                  for (const wf of WARRANTY_FIELDS) {
                    const spec = specs[wf.code];
                    if (!spec || !String(spec.value || "").trim()) continue;
                    const unitLabel =
                      TIME_UNITS.find(
                        (u) => u.value === (spec.unit || wf.defaultUnit),
                      )?.label || "";
                    rows.push({
                      label: wf.name,
                      value: `${String(spec.value).trim()} ${unitLabel}`.trim(),
                    });
                  }
                  if (rows.length === 0) return null;
                  return (
                    <div className="review-block">
                      <h3 className="subtitle subtitle--spaced">
                        Гарантийные обязательства
                      </h3>
                      <div className="review-list">
                        {rows.map((row, i) => (
                          <div className="review-row" key={i}>
                            <span className="review-row__label">{row.label}</span>
                            <span className="review-row__value">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Технические характеристики */}
                {(() => {
                  const rows = [];

                  for (const group of techGroups) {
                    for (const field of group.fields) {
                      const text = formatSpecValue(
                        field,
                        specs[field.code],
                        catalog?.unitGroups,
                      );
                      if (text) {
                        rows.push({
                          label: FIELD_LABELS[field.code] || field.name,
                          value: text,
                          group: group.name,
                        });
                      }
                    }
                  }

                  for (const field of techCustomFields) {
                    const text = displayCustomCharacteristic(
                      {
                        customValue: String(
                          techCustomValues[field.code] || "",
                        ).trim(),
                        unit: String(
                          techCustomUnits[field.code] || field.unit || "",
                        ).trim(),
                      },
                      catalog?.unitGroups,
                    );
                    if (text) {
                      rows.push({
                        label: field.name,
                        value: text,
                      });
                    }
                  }

                  if (rows.length === 0) return null;

                  return (
                    <div className="review-block">
                      <h3 className="subtitle subtitle--spaced">
                        Технические характеристики
                      </h3>
                      <div className="review-list">
                        {rows.map((row, i) => (
                          <div className="review-row" key={i}>
                            <span className="review-row__label">
                              {row.label}
                            </span>
                            <span className="review-row__value">
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Кастомные характеристики */}
                {(() => {
                  const filled = (customRows || []).filter((row) => {
                    const name = (row.name || "").trim();
                    const value = (row.value || "").trim();
                    return name && value;
                  });

                  if (filled.length === 0) return null;

                  return (
                    <div className="review-block">
                      <h3 className="subtitle subtitle--spaced">
                        Дополнительные характеристики
                      </h3>
                      <div className="review-list">
                        {filled.map((row, i) => {
                          const valueText = formatCustomRowDisplay(
                            row,
                            catalog?.unitGroups,
                          );
                          return (
                            <div className="review-row" key={i}>
                              <span className="review-row__label">
                                {row.name}
                              </span>
                              <span className="review-row__value">
                                {valueText}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Если ничего не заполнено */}
                {specs &&
                  Object.values(specs).every(
                    (v) => !v?.value?.trim() && !v?.customValue?.trim(),
                  ) &&
                  (!customRows || customRows.length === 0) &&
                  !logo &&
                  !productLine?.trim() && (
                    <p className="paragraph">
                      Пока ничего не заполнено. Вернитесь на предыдущие вкладки
                      и заполните характеристики.
                    </p>
                  )}
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="subtitleOne subtitle--spaced">
              Заполните характеристики продукта:
            </h2>
            <p className="stage24-hint">
              Проверьте заполненные характеристики перед переходом к описанию.
            </p>
            <div className="form descriptionM">
              <input
                type="file"
                accept="image/*"
                ref={logoInputRef}
                onChange={handleLogoChange}
                style={{ display: "none" }}
              />
              {groups.map((group) => (
                <div key={group.name}>
                  <h3 className="subtitle subtitle--spaced group-title">
                    {group.name}
                  </h3>
                  {group.name === "Габариты" && (
                    <DimensionsGroup
                      fields={group.fields}
                      specs={specs}
                      unitOptions={catalog?.unitGroups?.dimension || []}
                      onChange={updateSpec}
                    />
                  )}
                  {group.name === "Основные" && (
                    <>
                      {mainFields
                        .filter((field) => field.code === "brand")
                        .map((field) => (
                          <CharacteristicRow
                            key={field.code}
                            field={field}
                            value={specs[field.code]}
                            unitGroups={catalog?.unitGroups}
                            onChange={(patch) => updateSpec(field.code, patch)}
                          />
                        ))}
                      <div className="field-row field-row--logo">
                        <span className="info-icon" title="Подсказка">
                          ⓘ
                        </span>
                        <span
                          className="required-mark-slot"
                          aria-hidden="true"
                        />
                        <span className="field-name">Логотип</span>
                        {logo ? (
                          <div className="field-input field-input--file field-input--has-file">
                            <img
                              src={logo.url}
                              alt="Логотип"
                              className="file-preview"
                            />
                            <span className="file-text">{logo.name}</span>
                            <button
                              type="button"
                              className="file-remove"
                              onClick={handleLogoRemove}
                              title="Удалить"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="field-input field-input--file"
                            onClick={() => logoInputRef.current?.click()}
                          >
                            <span className="file-icon">📎</span>
                            <span className="file-text">
                              Загрузить фотографию
                            </span>
                          </button>
                        )}
                      </div>
                      <div className="field-row product-line-row">
                        <span className="info-icon" title="Подсказка">
                          ⓘ
                        </span>
                        <span
                          className="required-mark-slot"
                          aria-hidden="true"
                        />
                        <span className="field-name">Линейка продукции</span>
                        <div className="product-line-control">
                          <input
                            type="text"
                            className="field-input"
                            placeholder="Линейка продукции"
                            value={productLine}
                            onChange={(event) =>
                              setProductLine(event.target.value)
                            }
                          />
                        </div>
                      </div>
                      {renderFields(
                        mainFieldsOrder(
                          mainFields.filter((field) => field.code !== "brand"),
                        ),
                      )}
                      {renderFields(weightFields)}
                    </>
                  )}
                  {group.name !== "Основные" &&
                    renderFields(
                      group.fields.filter(
                        (field) =>
                          group.name !== "Габаритные размеры" ||
                          !DIMENSION_CODES.includes(field.code),
                      ),
                    )}
                </div>
              ))}
              <CustomCharacteristicsBlock
                rows={customRows}
                unitGroups={catalog?.unitGroups}
                onChange={setCustomRows}
              />
            </div>
          </>
        )}
        {activeTab === "review" ? (
          <p className="modal-sheet__subhint nm">
          </p>
        ) : (
          <p className="modal-sheet__subhint nm">
          </p>
        )}

        {showCustomVariantSetup && (
          <>
            <div className="matches-divider stage23-bundle-divider" />
            <Stage25
              ref={axisRef}
              embedded
              refreshKey={charsRefreshKey}
              onSelectionChange={handleAxisSelectionChange}
            />
            <div className="matches-divider stage23-bundle-divider" />
            <Stage26
              ref={nameRef}
              embedded
              previewOptions={axisPreview}
            />
          </>
        )}

        <div className="matches-divider stage23-bundle-divider" />
        <Stage24
          ref={descriptionRef}
          embedded
          contentOpen={panelFocus === "description"}
          onContentOpenChange={handleDescriptionOpenChange}
        />
      </div>

      <BottomBar
        current={fillProgressStep(23, progressProduct, productId)}
        total={fillProgressTotal(progressProduct, productId) || VARIANT_FILL_STAGE_COUNT}
        prevPath="/stage14"
        nextPath={nextStage || (isCustomFlow ? "/stage28" : "/stage18")}
        onSave={async () => {
          await persist();
          setCharsRefreshKey((prev) => prev + 1);
          let savedVariationId = variationId;
          if (showCustomVariantSetup && axisPreview.length > 0) {
            savedVariationId =
              (await axisRef.current?.save?.()) || savedVariationId;
            if (savedVariationId && productId) {
              const next = new URLSearchParams(location.search);
              next.set("id", productId);
              next.set("variationId", savedVariationId);
              navigate(
                { pathname: location.pathname, search: `?${next.toString()}` },
                { replace: true },
              );
            }
            await nameRef.current?.save?.(savedVariationId);
          }
          await descriptionRef.current?.save?.();
        }}
      />
    </>
  );
}

export default Stage23;