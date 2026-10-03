import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import CustomCharacteristicsBlock from "../components/CustomCharacteristicsBlock";
import DimensionsGroup from "../components/DimensionsGroup";
import ImageHint from "../components/ImageHint";
import { catalogApi, productsApi } from "../api";
import { useCardIds, variationSpecsFrom } from "../cardScope";
import {
  customRowsFromValues,
  normalizeCustomRows,
  serializeCustomRows,
} from "../customCharacteristics";
import { DIMENSION_CODES, prefillSpecFromProduct } from "../productSpecs";
import {
  VARIANT_FILL_STAGE_COUNT,
  variantFillStageHeading,
  variantFillStep,
} from "../stageProgress";
import "./Stage5.css";
import "./Stage24.css";
import "./Stage23.css";

const DIMENSIONS_HINT_IMAGE = "/images/dimensions.png";
const WEIGHT_CODES = ["weight", "weightTolerance"];
const FIELD_LABELS = {
  article: "Артикул продукта от завода-изготовителя",
};

const TABS = [
  { key: "main", label: "Основные" },
  { key: "dimensions", label: "Габариты и вес" },
  { key: "manufacturer", label: "Производитель" },
  { key: "tech", label: "Технические характеристики" },
  { key: "custom", label: "Добавьте характеристики" },
  { key: "review", label: "Просмотр заполненных характеристик" },
];

const defaultUnits = {
  weight: "gram",
  tolerance: "gram",
  dimension: "millimeters",
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

// Возвращает "человеческое" значение поля (с учётом "Иное" и единиц измерения)
function formatSpecValue(field, value, unitGroups) {
  if (!value) return "";
  const raw =
    value.value === "other"
      ? (value.customValue || "").trim()
      : (value.value || "").trim();
  if (!raw) return "";
  const option = (field.options || []).find((o) => o.value === raw);
  let text = option ? option.label : raw;
  if (value.unit && field.unitGroup) {
    const unit = (unitGroups?.[field.unitGroup] || []).find(
      (u) => u.value === value.unit,
    );
    if (unit) text = `${text} ${unit.label}`;
  }
  return text;
}

function CharacteristicRow({ field, value, unitGroups, onChange }) {
  const current = value || { value: "", customValue: "", unit: "" };
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
  const [specs, setSpecs] = useState({});
  const [customRows, setCustomRows] = useState(() => normalizeCustomRows([]));
  const [productLine, setProductLine] = useState("");
  const [categorySnapshot, setCategorySnapshot] = useState(null);
  const [logo, setLogo] = useState(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("main");
  const [completedTabs, setCompletedTabs] = useState([]);
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
        setProductLine(product.productLine || "");
        setCategorySnapshot({
          purpose: product.purpose || "",
          kindCode: product.kindCode || "",
          productName: product.productName || "",
          categoryPath: product.categoryPath || "",
        });

        const kind = findKind(catalog, product.kindCode);
        const fields = kind?.characteristics || [];

        if (variation) {
          setSpecs(
            variationSpecsFrom(product, variation, fields, defaultUnits),
          );
          setCustomRows(
            normalizeCustomRows(
              customRowsFromValues(
                variation.values,
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
            ) ||
              (product.files || []).find(
                (file) => file.role === "logo" && !file.variationId,
              ) ||
              null,
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
          setSpecs(next);
          setCustomRows(
            normalizeCustomRows(
              customRowsFromValues(product.values, {}, catalog.unitGroups),
            ),
          );
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
  const warrantyGroup = groups.find((group) => group.name === "Гарантия");
  const techGroups = groups.filter(
    (group) =>
      !["Основные", "Габариты", "Производитель", "Гарантия"].includes(
        group.name,
      ),
  );
  const weightFields = (mainGroup?.fields || []).filter((field) =>
    WEIGHT_CODES.includes(field.code),
  );
  const mainFields = (mainGroup?.fields || []).filter(
    (field) => !WEIGHT_CODES.includes(field.code),
  );

  const currentIndex = TABS.findIndex((tab) => tab.key === activeTab);

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
        productLine,
      });
    }
    const values = [
      ...Object.entries(specs).map(([code, value]) => ({
        code,
        value: value.value,
        customValue: value.customValue,
        unit: value.unit || null,
      })),
      ...serializeCustomRows(customRows),
    ];
    if (variationId) {
      await productsApi.saveVariationCharacteristics(productId, variationId, {
        values,
      });
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

      // Если на вкладке "Просмотр" — сразу на следующий этап
      if (activeTab === "review") {
        go("/stage24");
        return;
      }

      setCompletedTabs((prev) =>
        prev.includes(activeTab) ? prev : [...prev, activeTab],
      );
      const nextIndex = currentIndex + 1;
      if (nextIndex < TABS.length) {
        setActiveTab(TABS[nextIndex].key);
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
      setActiveTab(TABS[TABS.length - 1].key);
      return;
    }
    if (currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1].key);
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
        <h1 className="title stage24-title">
          {variantFillStageHeading(
            23,
            "Характеристики варианта параметра продукта",
          )}
        </h1>

        {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )}
        {error && <p className="form-error">{error}</p>}

        {phase === "edit" ? (
          <>
            <div className="stage24-tabs" role="tablist">
              {TABS.map((tab) => {
                const done = completedTabs.includes(tab.key);
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`stage24-tab${active ? " stage24-tab--active" : ""}${done ? " stage24-tab--done" : ""}`}
                    onClick={() => setActiveTab(tab.key)}
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
            {activeTab === "main" && (
              <div className="form">
                <h2 className="stage24-section-title">Основные</h2>
                <p className="stage23-subtitle-line">Введите значения:</p>

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
                  <span className="required-mark-slot" aria-hidden="true" />
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
                      <span className="file-text">Загрузить фотографию</span>
                    </button>
                  )}
                </div>

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
                  mainFields.filter((field) => field.code !== "brand"),
                )}
              </div>
            )}

            {/* ===== ГАБАРИТЫ И ВЕС ===== */}
            {activeTab === "dimensions" && (
              <div className="form">
                <h2 className="stage24-section-title">
                  Габариты и вес
                  <ImageHint
                    src={DIMENSIONS_HINT_IMAGE}
                    alt="Длина, ширина и высота"
                    title="Как измерять габариты"
                    size="large"
                  />
                </h2>
                <p className="stage23-subtitle-line">Введите значения:</p>
                <p className="io">Габариты</p>
                {dimensionsGroup && (
                  <DimensionsGroup
                    fields={dimensionsGroup.fields}
                    specs={specs}
                    unitOptions={catalog?.unitGroups?.dimension || []}
                    onChange={updateSpec}
                  />
                )}
                <p className="io">Вес</p>
                {renderFields(weightFields)}
              </div>
            )}

            {/* ===== ПРОИЗВОДИТЕЛЬ ===== */}
            {activeTab === "manufacturer" && (
              <div className="form">
                <h2 className="stage24-section-title">Производитель</h2>
                <p className="stage23-subtitle-line">Введите значения:</p>

                {renderFields(
                  (manufacturerGroup?.fields || []).filter(
                    (field) => field.code !== "brand",
                  ),
                )}
                {warrantyGroup && (
                  <>
                    <h3 className="subtitle subtitle--spaced">Гарантия</h3>
                    {renderFields(warrantyGroup.fields)}
                  </>
                )}
              </div>
            )}

            {/* ===== ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ ===== */}
            {activeTab === "tech" && (
              <div className="form">
                <h2 className="stage24-section-title">
                  Технические характеристики
                </h2>
                <p className="stage23-subtitle-line">Введите значения:</p>

                {techGroups.length === 0 && (
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
              </div>
            )}

            {/* ===== ДОБАВЬТЕ ХАРАКТЕРИСТИКИ ===== */}
            {activeTab === "custom" && (
              <div className="form">
                <h2 className="stage24-section-title">
                  Добавьте характеристики
                </h2>
                <p className="stage23-subtitle-line">Введите значения:</p>

                <CustomCharacteristicsBlock
                  rows={customRows}
                  unitGroups={catalog?.unitGroups}
                  onChange={setCustomRows}
                />
              </div>
            )}

            {/* ===== ПРОСМОТР ЗАПОЛНЕННЫХ ХАРАКТЕРИСТИК ===== */}
            {activeTab === "review" && (
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

                  // Бренд
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

                  // Логотип
                  if (logo) {
                    rows.push({
                      label: "Логотип",
                      value: logo.name,
                      isImage: true,
                      imageUrl: logo.url,
                    });
                  }

                  // Линейка
                  if (productLine?.trim()) {
                    rows.push({
                      label: "Линейка продукции",
                      value: productLine.trim(),
                    });
                  }

                  // Остальные поля Основные
                  for (const field of mainFields) {
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

                  // Вес и погрешность
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

                  // Габариты (DimensionsGroup) — поля из dimensionsGroup.fields
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

                  // Вес и погрешность
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
                        Габариты и вес
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

                {/* Производитель + Гарантия */}
                {(() => {
                  const rows = [];

                  for (const field of (manufacturerGroup?.fields || []).filter(
                    (f) => f.code !== "brand",
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

                  if (warrantyGroup) {
                    for (const field of warrantyGroup.fields) {
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
                          let valueText = row.value;
                          if (row.unit) {
                            valueText = `${valueText} ${row.unit}`;
                          }
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
                        mainFields.filter((field) => field.code !== "brand"),
                      )}
                      {renderFields(weightFields)}
                    </>
                  )}
                  {group.name !== "Основные" &&
                    renderFields(
                      group.fields.filter(
                        (field) =>
                          group.name !== "Габариты" ||
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
            Если все верно - нажмите{" "}
            <span className="modal-sheet__subhint-check" aria-hidden>
              ✓
            </span>
          </p>
        ) : (
          <p className="modal-sheet__subhint nm">
            Если вы заполнили все значения — нажмите{" "}
            <span className="modal-sheet__subhint-check" aria-hidden>
              ✓
            </span>
          </p>
        )}
        {/* ===== Панель ✕/✓ — ВНУТРИ контейнера, под полями ===== */}
        {phase !== "review" && (
          <div className="wizard-action-bar">
            <button
              type="button"
              className="wizard-action-btn wizard-action-btn--no"
              onClick={handleCancel}
              title="Назад"
              disabled={busy}
            >
              <span className="wizard-action-btn__circle">✕</span>
            </button>
            <button
              type="button"
              className="wizard-action-btn wizard-action-btn--yes"
              onClick={handleConfirm}
              title="Далее"
              disabled={busy || !loaded}
            >
              <span className="wizard-action-btn__circle">✓</span>
            </button>
          </div>
        )}
      </div>

      <BottomBar
        current={variantFillStep(23)}
        total={VARIANT_FILL_STAGE_COUNT}
        prevPath="/stage14"
        nextPath="/stage24"
        onSave={persist}
      />
    </>
  );
}

export default Stage23;
