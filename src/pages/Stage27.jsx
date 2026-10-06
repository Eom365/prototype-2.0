// Этап 6 - Описание продукта
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import HazardClassField from "../components/HazardClassField";
import { productsApi } from "../api";
import {
  formatHazardClass,
  resolveHazardGroup,
  sanitizeHazardClass,
} from "../hazardClassByCategory";
import {
  emptyDescriptionForm,
  parseDescriptionForm,
  serializeDescriptionForm,
} from "../descriptionForm";
import {
  CUSTOM_VARIANT_FILL_STAGE_COUNT,
  productWizardOffset,
  variantFillStageHeading,
  variantFillStep,
} from "../stageProgress";
import "./Stage24.css";
import "./Stage27.css";

const TABS = [
  { key: "description", label: "Описание" },
  { key: "complectation", label: "Комплектация" },
  { key: "applicationArea", label: "Область эксплуатации продукта" },
  {
    key: "storageConditions",
    label: "Условия транспортировки, хранения и эксплуатации",
  },
  { key: "precautions", label: "Меры предосторожности" },
  { key: "review", label: "Просмотр заполненного описания" },
];

const TAB_HINTS = {
  description:
    "Заполните информацию о продукте. При заполнении ориентируйтесь на следующие документы: 1. Руководство по эксплуатации",
  complectation:
    "Заполните информацию о продукте. При заполнении ориентируйтесь на следующие документы: 1. Руководство по эксплуатации",
  applicationArea:
    "Заполните информацию о продукте. При заполнении ориентируйтесь на следующие документы: 1. Руководство по эксплуатации",
  storageConditions:
    "Заполните информацию о продукте. При заполнении ориентируйтесь на следующие документы: 1. Руководство по эксплуатации",
  precautions:
    "Заполните информацию о продукте. При заполнении ориентируйтесь на следующие документы: 1. Руководство по эксплуатации",
  review: "Проверьте заполненные данные перед отправкой:",
};

function DescField({ label, value, onChange, placeholder = "" }) {
  return (
    <div className="desc-field">
      <label className="desc-field__label">{label}</label>
      <input
        type="text"
        className="desc-field__input"
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function RangeField({
  label,
  unit,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
}) {
  return (
    <div className="desc-field">
      <label className="desc-field__label">{label}</label>
      <div className="desc-range">
        <span className="desc-range__caption">От</span>
        <input
          type="text"
          className="desc-range__input"
          value={fromValue || ""}
          onChange={(event) => onFromChange(event.target.value)}
        />
        <span className="desc-range__caption">До</span>
        <input
          type="text"
          className="desc-range__input"
          value={toValue || ""}
          onChange={(event) => onToChange(event.target.value)}
        />
        <span className="desc-range__unit">{unit}</span>
      </div>
    </div>
  );
}

function StorageGroup({ title, values, onChange }) {
  const patch = (key, val) => onChange({ ...values, [key]: val });
  return (
    <div className="desc-storage-group">
      <h3 className="desc-storage-group__title">{title}</h3>
      <RangeField
        label="Температурный режим"
        unit="°C"
        fromValue={values.temperatureFrom}
        toValue={values.temperatureTo}
        onFromChange={(v) => patch("temperatureFrom", v)}
        onToChange={(v) => patch("temperatureTo", v)}
      />
      <RangeField
        label="Влажность"
        unit="%"
        fromValue={values.humidityFrom}
        toValue={values.humidityTo}
        onFromChange={(v) => patch("humidityFrom", v)}
        onToChange={(v) => patch("humidityTo", v)}
      />
      <div className="desc-field">
        <label className="desc-field__label">
          Попадание прямых солнечных лучей
        </label>
        <div className="desc-choice-group">
          <button
            type="button"
            className={`desc-choice-btn ${values.lighting === "Не допускается" ? "desc-choice-btn--active" : ""}`}
            onClick={() => patch("lighting", "Не допускается")}
          >
            Не допускается
          </button>
          <button
            type="button"
            className={`desc-choice-btn ${values.lighting === "Допускается" ? "desc-choice-btn--active" : ""}`}
            onClick={() => patch("lighting", "Допускается")}
          >
            Допускается
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Хелпер для форматирования диапазона "От — До" =====
function formatRange(from, to, unit) {
  const f = (from || "").trim();
  const t = (to || "").trim();
  if (!f && !t) return "";
  if (f && t) return `от ${f} до ${t} ${unit}`;
  if (f) return `от ${f} ${unit}`;
  return `до ${t} ${unit}`;
}

// ===== Строка обзора =====
function ReviewRow({ label, value }) {
  if (!value || !String(value).trim()) return null;
  return (
    <div className="review-row">
      <span className="review-row__label">{label}</span>
      <span className="review-row__value">{value}</span>
    </div>
  );
}

function ReviewBlock({ title, children }) {
  // Если все дочерние ReviewRow вернули null — блок не показываем
  const validChildren = Array.isArray(children)
    ? children.filter(Boolean)
    : children;
  if (
    !validChildren ||
    (Array.isArray(validChildren) && validChildren.length === 0)
  ) {
    return null;
  }
  return (
    <div className="review-block">
      <h3 className="subtitle subtitle--spaced">{title}</h3>
      <div className="review-list">{children}</div>
    </div>
  );
}

function Stage27() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const productId = params.get("id");
  const variationId = params.get("variationId");

  const [activeTab, setActiveTab] = useState("description");
  const [completedTabs, setCompletedTabs] = useState([]);
  const [form, setForm] = useState(emptyDescriptionForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hazardGroup, setHazardGroup] = useState(null);

  const go = (path) => navigate({ pathname: path, search: location.search });
  const currentIndex = TABS.findIndex((tab) => tab.key === activeTab);
  const currentTab = TABS[currentIndex];

  useEffect(() => {
    if (!productId) return;
    productsApi
      .get(productId)
      .then((product) => {
        const group = resolveHazardGroup(product);
        setHazardGroup(group);

        const applyForm = (source) => {
          const parsed = parseDescriptionForm(source);
          parsed.precautions = {
            ...parsed.precautions,
            hazardClass: sanitizeHazardClass(parsed.precautions.hazardClass, group),
          };
          setForm(parsed);
        };

        if (variationId) {
          const variation = (product.variations || []).find(
            (item) =>
              String(item.id).toLowerCase() ===
              String(variationId).toLowerCase(),
          );
          applyForm({
            description: variation?.description,
            complectation: variation?.complectation,
            applicationArea: variation?.applicationArea,
            storageConditions: variation?.storageConditions,
            precautions: variation?.precautions,
          });
        } else {
          applyForm(product);
        }
        setLoaded(true);
      })
      .catch((loadError) => setError(loadError.message));
  }, [productId, variationId]);

  const patchForm = (section, value) => {
    setForm((prev) => ({ ...prev, [section]: value }));
  };

  const persist = async () => {
    if (!productId || !loaded) return;
    const body = serializeDescriptionForm(form);
    if (variationId) {
      await productsApi.saveVariationDescription(productId, variationId, body);
    } else {
      await productsApi.saveDescription(productId, body);
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
        go("/stage18");
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
    if (currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1].key);
      return;
    }
    go("/stage23");
  };

  // ===== Рендер полей для редактируемых табов =====
  const renderFields = () => {
    if (activeTab === "description") {
      return (
        <div className="desc-fields">
          <DescField
            label="Назначение продукта - что это за продукт"
            value={form.description.purpose}
            onChange={(v) =>
              patchForm("description", { ...form.description, purpose: v })
            }
          />
          <DescField
            label="Для чего используется продукт"
            value={form.description.usage}
            onChange={(v) =>
              patchForm("description", { ...form.description, usage: v })
            }
          />
          <DescField
            label="Принцип работы продукта"
            value={form.description.principle}
            onChange={(v) =>
              patchForm("description", { ...form.description, principle: v })
            }
          />
        </div>
      );
    }

    if (activeTab === "complectation") {
      const items = form.complectation.items || [{ name: "", quantity: "" }];
      const patchItem = (index, patch) => {
        const next = items.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        );
        const last = next[next.length - 1];
        if ((last.name || "").trim() || (last.quantity || "").trim()) {
          next.push({ name: "", quantity: "" });
        }
        patchForm("complectation", { items: next });
      };

      return (
        <div className="desc-fields">
          {items.map((item, index) => (
            <div className="comp-row" key={index}>
              <span className="comp-row__label">Что находится в упаковке</span>
              <input
                type="text"
                className="comp-row__input"
                placeholder="Наименование"
                value={item.name || ""}
                onChange={(event) =>
                  patchItem(index, { name: event.target.value })
                }
              />
              <span className="comp-row__dash">—</span>
              <input
                type="text"
                className="comp-row__input comp-row__input--short"
                placeholder="Количество"
                value={item.quantity || ""}
                onChange={(event) =>
                  patchItem(index, { quantity: event.target.value })
                }
              />
              <span className="comp-row__unit">штук</span>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "applicationArea") {
      return (
        <div className="desc-fields">
          <DescField
            label="Для какой сферы предназначен этот продукт"
            value={form.applicationArea.sphere}
            onChange={(v) =>
              patchForm("applicationArea", {
                ...form.applicationArea,
                sphere: v,
              })
            }
          />
          <DescField
            label="Способ применения"
            value={form.applicationArea.method}
            onChange={(v) =>
              patchForm("applicationArea", {
                ...form.applicationArea,
                method: v,
              })
            }
          />
        </div>
      );
    }

    if (activeTab === "storageConditions") {
      return (
        <div className="desc-fields">
          <StorageGroup
            title="Условия транспортировки"
            values={form.storageConditions.transport}
            onChange={(v) =>
              patchForm("storageConditions", {
                ...form.storageConditions,
                transport: v,
              })
            }
          />
          <StorageGroup
            title="Условия хранения"
            values={form.storageConditions.storage}
            onChange={(v) =>
              patchForm("storageConditions", {
                ...form.storageConditions,
                storage: v,
              })
            }
          />
          <StorageGroup
            title="Условия эксплуатации"
            values={form.storageConditions.operation}
            onChange={(v) =>
              patchForm("storageConditions", {
                ...form.storageConditions,
                operation: v,
              })
            }
          />
          <DescField
            label="Срок службы продукта"
            value={form.storageConditions.shelfLife}
            onChange={(v) =>
              patchForm("storageConditions", {
                ...form.storageConditions,
                shelfLife: v,
              })
            }
          />
        </div>
      );
    }

    if (activeTab === "precautions") {
      return (
        <div className="desc-fields">
          {!loaded || !hazardGroup ? (
            <p className="paragraph">Загрузка категории продукта…</p>
          ) : (
            <HazardClassField
              group={hazardGroup}
              hazardClass={form.precautions.hazardClass}
              onSelect={(value) =>
                patchForm("precautions", {
                  ...form.precautions,
                  hazardClass: value,
                })
              }
            />
          )}

          <DescField
            label="Указание мер безопасности"
            value={form.precautions.safety}
            onChange={(v) =>
              patchForm("precautions", { ...form.precautions, safety: v })
            }
          />
          <DescField
            label="Утилизация товаров и упаковки"
            value={form.precautions.disposal}
            onChange={(v) =>
              patchForm("precautions", { ...form.precautions, disposal: v })
            }
          />
        </div>
      );
    }

    return null;
  };

  // ===== Рендер вкладки "Просмотр" =====
  const renderReview = () => {
    const d = form.description;
    const c = form.complectation;
    const a = form.applicationArea;
    const s = form.storageConditions;
    const p = form.precautions;

    const complectationItems = (c.items || []).filter(
      (item) => (item.name || "").trim() || (item.quantity || "").trim(),
    );
    const hasAny =
      (d.purpose || "").trim() ||
      (d.usage || "").trim() ||
      (d.principle || "").trim() ||
      complectationItems.length > 0 ||
      (a.sphere || "").trim() ||
      (a.method || "").trim() ||
      (s.shelfLife || "").trim() ||
      (p.safety || "").trim() ||
      (p.disposal || "").trim() ||
      p.hazardClass ||
      s.transport.lighting ||
      s.storage.lighting ||
      s.operation.lighting ||
      (s.transport.temperatureFrom || "").trim() ||
      (s.transport.temperatureTo || "").trim() ||
      (s.transport.humidityFrom || "").trim() ||
      (s.transport.humidityTo || "").trim() ||
      (s.transport.lighting || "").trim() ||
      (s.storage.temperatureFrom || "").trim() ||
      (s.storage.temperatureTo || "").trim() ||
      (s.storage.humidityFrom || "").trim() ||
      (s.storage.humidityTo || "").trim() ||
      (s.storage.lighting || "").trim() ||
      (s.operation.temperatureFrom || "").trim() ||
      (s.operation.temperatureTo || "").trim() ||
      (s.operation.humidityFrom || "").trim() ||
      (s.operation.humidityTo || "").trim() ||
      (s.operation.lighting || "").trim();

    return (
      <div className="desc-fields">
        {!hasAny && (
          <p className="paragraph">
            Пока ничего не заполнено. Вернитесь на предыдущие вкладки и
            заполните описание продукта.
          </p>
        )}

        {/* Описание */}
        <ReviewBlock title="Описание">
          <ReviewRow label="Назначение продукта" value={d.purpose} />
          <ReviewRow label="Для чего используется" value={d.usage} />
          <ReviewRow label="Принцип работы" value={d.principle} />
        </ReviewBlock>

        {/* Комплектация */}
        <ReviewBlock title="Комплектация">
          {complectationItems.length === 0 ? (
            <ReviewRow label="Что находится в упаковке" value="" />
          ) : (
            complectationItems.map((item, index) => (
              <ReviewRow
                key={index}
                label="Что находится в упаковке"
                value={
                  (item.name || "").trim() && (item.quantity || "").trim()
                    ? `${item.name} — ${item.quantity} штук`
                    : item.name || (item.quantity ? `${item.quantity} штук` : "")
                }
              />
            ))
          )}
        </ReviewBlock>

        {/* Область эксплуатации */}
        <ReviewBlock title="Область эксплуатации продукта">
          <ReviewRow label="Сфера применения" value={a.sphere} />
          <ReviewRow label="Способ применения" value={a.method} />
        </ReviewBlock>

        {/* Условия транспортировки, хранения и эксплуатации */}
        <ReviewBlock title="Условия транспортировки, хранения и эксплуатации">
          <ReviewRow
            label="Условия транспортировки — температура"
            value={formatRange(
              s.transport.temperatureFrom,
              s.transport.temperatureTo,
              "°C",
            )}
          />
          <ReviewRow
            label="Условия транспортировки — влажность"
            value={formatRange(
              s.transport.humidityFrom,
              s.transport.humidityTo,
              "%",
            )}
          />
          <ReviewRow
            label="Условия транспортировки — освещение"
            value={s.transport.lighting}
          />
          <ReviewRow
            label="Условия хранения — температура"
            value={formatRange(
              s.storage.temperatureFrom,
              s.storage.temperatureTo,
              "°C",
            )}
          />
          <ReviewRow
            label="Условия хранения — влажность"
            value={formatRange(
              s.storage.humidityFrom,
              s.storage.humidityTo,
              "%",
            )}
          />
          <ReviewRow
            label="Условия хранения — освещение"
            value={s.storage.lighting}
          />
          <ReviewRow
            label="Условия эксплуатации — температура"
            value={formatRange(
              s.operation.temperatureFrom,
              s.operation.temperatureTo,
              "°C",
            )}
          />
          <ReviewRow
            label="Условия эксплуатации — влажность"
            value={formatRange(
              s.operation.humidityFrom,
              s.operation.humidityTo,
              "%",
            )}
          />
          <ReviewRow
            label="Условия эксплуатации — освещение"
            value={s.operation.lighting}
          />
          <ReviewRow label="Срок службы" value={s.shelfLife} />
        </ReviewBlock>

        {/* Меры предосторожности */}
        <ReviewBlock title="Меры предосторожности">
          <ReviewRow
            label="Класс опасности"
            value={formatHazardClass(p.hazardClass)}
          />
          <ReviewRow label="Указание мер безопасности" value={p.safety} />
          <ReviewRow label="Утилизация товаров и упаковки" value={p.disposal} />
        </ReviewBlock>
      </div>
    );
  };

  return (
    <>
      <div className="container stage24-page">
        <h1 className="title stage24-title">
          {variantFillStageHeading(27, "Описание продукта", null, productId)}
        </h1>

        {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )}
        {error && <p className="form-error">{error}</p>}

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

        <h2 className="stage24-section-title">{currentTab?.label}</h2>
        <p className="stage24-hint">{TAB_HINTS[activeTab]}</p>

        {activeTab === "review" ? renderReview() : renderFields()}

        <p className="modal-sheet__subhint nm">
          {activeTab === "review"
            ? "Если всё верно — нажмите "
            : "Если вы заполнили все значения — нажмите "}
          <span className="modal-sheet__subhint-check" aria-hidden>
            ✓
          </span>
        </p>

        {/* ===== Панель ✕/✓ ===== */}
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
      </div>

      <BottomBar
        current={variantFillStep(27) + productWizardOffset(productId)}
        total={CUSTOM_VARIANT_FILL_STAGE_COUNT + productWizardOffset(productId)}
        prevPath="/stage26"
        nextPath="/stage28"
        onSave={persist}
      />
    </>
  );
}

export default Stage27;
