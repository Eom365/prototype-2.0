import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import HazardClassField from "../components/HazardClassField";
import VariantFlowHeader from "../components/VariantFlowHeader";
import PageHelp from "../components/PageHelp";
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
  fillProgressStep,
  fillProgressTotal,
  variantFillMode,
  variantFillStageHeading,
} from "../stageProgress";
import {
  descriptionTabRequiresFill,
  isDescriptionTabFilled,
  markVisited,
  tabClassName,
  tabFilledState,
} from "../wizardTabStatus";
import "./Stage24.css";

const TABS = [
  { key: "description", label: "Порядок работы с продуктом" },
  { key: "complectation", label: "Комплектация" },
  {
    key: "storageConditions",
    label: "Условия транспортировки, хранения и эксплуатации",
  },
  { key: "precautions", label: "Меры безопасности при работе с моделью" },
];

const TAB_HINTS = {
  description:
    "Заполните назначение и принцип действия продукта. При заполнении ориентируйтесь на следующие документы: 1. Руководство по эксплуатации",
  complectation: "",
  applicationArea:
    "Опишите подготовку к работе продукта и порядок работы с продуктом. При заполнении ориентируйтесь на следующие документы: 1. Руководство по эксплуатации",
  storageConditions:
    "Заполните условия транспортировки, хранения, эксплуатации и срок эксплуатации. При заполнении ориентируйтесь на следующие документы: 1. Руководство по эксплуатации",
  precautions:
    "Заполните меры безопасности при использовании продукта. При заполнении ориентируйтесь на следующие документы: 1. Руководство по эксплуатации",
};

/* Минимум строк комплектации, которые видны всегда */
const MIN_COMPLECTATION_ROWS = 3;

/* Пустая строка комплектации */
const emptyCompItem = () => ({ name: "", quantity: "", photo: null });

/* Гарантирует, что в массиве не меньше MIN_COMPLECTATION_ROWS строк */
function ensureMinCompItems(items) {
  const safe = Array.isArray(items) ? items : [];
  const next = [...safe];
  while (next.length < MIN_COMPLECTATION_ROWS) {
    next.push(emptyCompItem());
  }
  return next;
}

function DescField({
  label,
  value,
  onChange,
  placeholder = "",
  helpContext = "",
}) {
  return (
    <div className="desc-field">
      <div className="desc-field__label-row">
        {helpContext && (
          <PageHelp
            inline
            context={helpContext}
            buttonTitle={`Подсказка по полю «${helpContext}»`}
          />
        )}
        <label className="desc-field__label">{label}</label>
      </div>
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

function formatRange(from, to, unit) {
  const f = (from || "").trim();
  const t = (to || "").trim();
  if (!f && !t) return "";
  if (f && t) return `от ${f} до ${t} ${unit}`;
  if (f) return `от ${f} ${unit}`;
  return `до ${t} ${unit}`;
}

const Stage24 = forwardRef(function Stage24(
  {
    embedded = false,
    contentOpen = true,
    openDescriptionTick = 0,
    onContentOpenChange,
    onDescriptionInteract,
  },
  ref,
) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const productId = params.get("id");
  const variationId = params.get("variationId");

  const [activeTab, setActiveTab] = useState("description");
  const [visitedTabs, setVisitedTabs] = useState(["description"]);
  const [form, setForm] = useState(emptyDescriptionForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hazardGroup, setHazardGroup] = useState(null);
  const [product, setProduct] = useState(null);

  /* ---------- Загрузка фото комплектации ---------- */
  const photoInputRef = useRef(null);
  const [photoTargetIndex, setPhotoTargetIndex] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const go = (path) => navigate({ pathname: path, search: location.search });
  const panelVisible = !embedded || contentOpen;
  const currentIndex = TABS.findIndex((tab) => tab.key === activeTab);
  const currentTab = panelVisible ? TABS[currentIndex] : null;
  const isCustomFlow = variantFillMode(product) === "custom";
  const prevStagePath = "/stage23";
  const nextStagePath = isCustomFlow ? "/stage28" : "/stage18";

  const touchDescription = () => {
    onDescriptionInteract?.();
  };

  const selectTab = (key) => {
    if (activeTab === key && panelVisible) {
      setActiveTab(null);
      onContentOpenChange?.(false);
      return;
    }
    touchDescription();
    setActiveTab(key);
    setVisitedTabs((prev) => markVisited(prev, key));
    onContentOpenChange?.(true);
  };

  useEffect(() => {
    if (!embedded || !contentOpen) return;
    if (activeTab) return;
    setActiveTab("description");
    setVisitedTabs((prev) => markVisited(prev, "description"));
  }, [embedded, contentOpen, activeTab]);

  useEffect(() => {
    if (!embedded || !openDescriptionTick) return;
    setActiveTab("description");
    setVisitedTabs((prev) => markVisited(prev, "description"));
  }, [embedded, openDescriptionTick]);

  useEffect(() => {
    if (!productId) return;
    productsApi
      .get(productId)
      .then((loadedProduct) => {
        setProduct(loadedProduct);
        const group = resolveHazardGroup(loadedProduct);
        setHazardGroup(group);

        const applyForm = (source) => {
          const parsed = parseDescriptionForm(source);
          parsed.precautions = {
            ...parsed.precautions,
            hazardClass: sanitizeHazardClass(parsed.precautions.hazardClass, group),
          };
          // Гарантируем минимум MIN_COMPLECTATION_ROWS строк
          parsed.complectation = {
            ...parsed.complectation,
            items: ensureMinCompItems(parsed.complectation?.items),
          };
          setForm(parsed);
        };

        if (variationId) {
          const variation = (loadedProduct.variations || []).find(
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
          applyForm(loadedProduct);
        }
        setLoaded(true);
      })
      .catch((loadError) => setError(loadError.message));
  }, [productId, variationId]);

  const patchForm = (section, value) => {
    touchDescription();
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

  useImperativeHandle(ref, () => ({ save: persist }), [
    productId,
    variationId,
    loaded,
    form,
  ]);

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await persist();

      setVisitedTabs((prev) => markVisited(prev, activeTab));
      const nextIndex = currentIndex + 1;

      if (nextIndex < TABS.length) {
        selectTab(TABS[nextIndex].key);
      } else {
        go(nextStagePath);
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
    go(prevStagePath);
  };

  /* =========================================================
     Обработчики фото для комплектации
     ========================================================= */

  const openPhotoPicker = (index) => {
    setPhotoTargetIndex(index);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
      photoInputRef.current.click();
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !productId || photoTargetIndex == null) return;

    setPhotoBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("role", "complectation");
      formData.append("index", String(photoTargetIndex));
      if (variationId) formData.append("variationId", variationId);

      const saved = await productsApi.upload(productId, formData);

      const items = [...(form.complectation.items || [])];
      if (!items[photoTargetIndex]) {
        items[photoTargetIndex] = emptyCompItem();
      }
      items[photoTargetIndex] = {
        ...items[photoTargetIndex],
        photo: saved,
      };
      // Поддерживаем минимум строк
      patchForm("complectation", { items: ensureMinCompItems(items) });
    } catch (uploadError) {
      setError(uploadError.message || "Не удалось загрузить фото");
    } finally {
      setPhotoBusy(false);
      setPhotoTargetIndex(null);
    }
  };

  const handlePhotoRemove = async (index) => {
    const items = [...(form.complectation.items || [])];
    const current = items[index];
    if (!current?.photo) return;

    const photoId = current.photo.id;
    setError("");
    try {
      if (photoId && productsApi.deleteFile) {
        await productsApi.deleteFile(photoId);
      }
    } catch (removeError) {
      setError(removeError.message || "Не удалось удалить фото");
    }
    items[index] = { ...current, photo: null };
    patchForm("complectation", { items: ensureMinCompItems(items) });
  };

  /* =========================================================
     Рендер полей
     ========================================================= */

  const renderFields = () => {
    if (activeTab === "description") {
      return (
        <div className="desc-fields">
          <DescField
            label="Назначение модели"
            helpContext="Назначение модели"
            value={form.description.purpose}
            onChange={(v) =>
              patchForm("description", { ...form.description, purpose: v })
            }
          />
          <DescField
            label="Принцип действия модели"
            helpContext="Принцип действия модели"
            value={form.description.principle}
            onChange={(v) =>
              patchForm("description", { ...form.description, principle: v })
            }
          />
        </div>
      );
    }

    if (activeTab === "complectation") {
      // Всегда показываем минимум MIN_COMPLECTATION_ROWS строк
      const rawItems = form.complectation.items || [];
      const items = ensureMinCompItems(rawItems);

      const patchItem = (index, patch) => {
        // Базовый массив — тоже нормализуем, чтобы индексы совпадали
        const next = ensureMinCompItems(items).map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        );
        // Если последняя строка заполнена — добавляем ещё одну пустую
        const last = next[next.length - 1];
        if (
          (last.name || "").trim() ||
          (last.quantity || "").trim() ||
          last.photo
        ) {
          next.push(emptyCompItem());
        }
        patchForm("complectation", { items: next });
      };

      return (
        <div className="desc-fields">
          <div>
            Опишите все, что входит в комплект поставки (в упаковку): <br />
            Аксессуары, которые находятся в упаковке с моделью (например: кабель, зарядное устройство, чехол, ремешок)
            Документы (инструкция)
          </div>
          {items.map((item, index) => (
            <div className="comp-row" key={index}>
              <PageHelp
                inline
                context={`Комплектация — строка ${index + 1}`}
                buttonTitle="Подсказка по строке комплектации"
              />
              <span className="comp-row__label">{index + 1}.</span>
              
              <input
                type="text"
                className="comp-row__input"
                placeholder={index === 0 ? "*Наименование модели*" : "Наименование"}
                value={item.name || ""}
                onChange={(event) =>
                  patchItem(index, { name: event.target.value })
                }
              />
              <span className="comp-row__dash">—</span>
              <input
                type="text"
                className="comp-row__input comp-row__input--short"
                placeholder={index === 0 ? "1" : "Количество"}
                value={item.quantity || ""}
                onChange={(event) =>
                  patchItem(index, { quantity: event.target.value })
                }
              />
              <span className="comp-row__unit">штук</span>

              <div className="comp-row__photo">
                {item.photo?.url ? (
                  <div className="comp-photo comp-photo--filled">
                    <img
                      src={item.photo.url}
                      alt={item.photo.name || "Фото комплектации"}
                      className="comp-photo__img"
                    />
                    <button
                      type="button"
                      className="comp-photo__remove"
                      onClick={() => handlePhotoRemove(index)}
                      title="Удалить фото"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="comp-photo comp-photo--add"
                    onClick={() => openPhotoPicker(index)}
                    disabled={photoBusy && photoTargetIndex === index}
                    title="Добавить фото"
                  >
                    <span className="comp-photo__icon">＋</span>
                    <span className="comp-photo__text">Добавить фото</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoChange}
          />

        </div>
      );
    }

    if (activeTab === "applicationArea") {
      return (
        <div className="desc-fields">
          <DescField
            label=""
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
            title="Условия хранения на складе"
            
            values={form.storageConditions.storage}
            onChange={(v) =>
              patchForm("storageConditions", {
                ...form.storageConditions,
                storage: v,
              })
            }
          />
          <StorageGroup
            title="Условия эксплуатации модели (параметра)"
            values={form.storageConditions.operation}
            onChange={(v) =>
              patchForm("storageConditions", {
                ...form.storageConditions,
                operation: v,
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
            helpContext="Указание мер безопасности"
            value={form.precautions.safety}
            onChange={(v) =>
              patchForm("precautions", { ...form.precautions, safety: v })
            }
          />
          <DescField
            label="Утилизация товаров и упаковки"
            helpContext="Указание мер безопасности"
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

  return (
    <>
      <div className={embedded ? "stage24-embed stage24-page" : "container stage24-page"}>
        {!embedded && (
          <VariantFlowHeader product={product} productId={productId} />
        )}
        {embedded ? (
          <h2 className="stage2-section-title stage24-embed-title">Описание модели (параметра)</h2>
        ) : (
          <h1 className="title stage24-title">
            {variantFillStageHeading(24, "Описание продукта", product, productId)}
          </h1>
        )}

        {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )}
        {error && <p className="form-error">{error}</p>}

        <div className="stage24-tabs stage24-tabs--description" role="tablist">
          {TABS.map((tab) => {
            const active = panelVisible && activeTab === tab.key;
            const visited = visitedTabs.includes(tab.key);
            const filled = tabFilledState({
              key: tab.key,
              visited,
              contentFilled: isDescriptionTabFilled(tab.key, form),
              requiresFill: descriptionTabRequiresFill(tab.key),
            });
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

        {panelVisible && activeTab && (
          <>
            <div className="stage24-section-title-row">
              <PageHelp
                inline
                context={currentTab?.label}
                buttonTitle={`Подсказка по разделу «${currentTab?.label}»`}
              />
              <h2 className="stage24-section-title">{currentTab?.label}</h2>
            </div>
            <p className="stage24-hint">{TAB_HINTS[activeTab]}</p>
            {activeTab === "review" ? renderReview() : renderFields()}
          </>
        )}
      </div>

      {!embedded && (
        <BottomBar
          current={fillProgressStep(24, product, productId)}
          total={fillProgressTotal(product, productId)}
          prevPath={prevStagePath}
          nextPath={nextStagePath}
          onSave={persist}
        />
      )}
    </>
  );
});

export default Stage24;