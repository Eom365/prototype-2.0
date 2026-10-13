// Варианты параметров продукта
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottomBar2 from "../components/BottomBar2";
import VariantFlowHeader from "../components/VariantFlowHeader";
import { catalogApi, productsApi } from "../api";
import { formatVariantParameterLabel } from "../variantAxisDisplay";
import { setProductWizard } from "../stageProgress";
import { skipsVariantParamStage } from "../variantFlow";
import "./Stage22.css";
import PreviewBar from "../components/PreviewBar";
import PageHelp from "../components/PageHelp";

function LinePhotos({ photos }) {
  const [mainIndex, setMainIndex] = useState(0);
  const main = photos[mainIndex] || photos[0];

  if (!photos.length) {
    return (
      <p className="form-error">Презентационные фотографии ещё не загружены.</p>
    );
  }

  return (
    <div className="product-gallery">
      <div className="product-gallery__main">
        {main && <img src={main.url} alt="Главное фото" />}
      </div>

      <div className="product-gallery__thumbs">
        {photos.slice(1, 5).map((photo, index) => (
          <div
            key={photo.id || index}
            className={`product-gallery__thumb ${mainIndex === index + 1 ? "product-gallery__thumb--active" : ""}`}
            onClick={() => setMainIndex(index + 1)}
          >
            <img src={photo.url} alt={`Фото ${index + 2}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function variantPhoto(files, variationId) {
  const own = (files || [])
    .filter(
      (file) =>
        String(file.variationId || "").toLowerCase() ===
        String(variationId || "").toLowerCase() && file.role === "product",
    )
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  return own[0]?.url || null;
}

function setVariantFlow(productId, mode) {
  if (!productId) return;
  sessionStorage.setItem(`variantFlow:${productId}`, mode);
}

function setVariantBaseline(variationId, signature) {
  if (!variationId) return;
  sessionStorage.setItem(`variantBaseline:${variationId}`, signature || "");
}

function VariantCard({ label, photoUrl, bordered, onEdit, onDelete }) {
  return (
    <div
      className={`variant-tile${bordered ? " variant-tile--review" : " variant-tile--created"}`}
    >
      {(onEdit || onDelete) && (
        <div className="variant-tile__actions">
          {onEdit && (
            <button
              type="button"
              className="variant-tile__edit"
              title="Редактировать"
              onClick={onEdit}
            >
              ✎
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="variant-tile__delete"
              title="Удалить"
              onClick={onDelete}
            >
              ✕
            </button>
          )}
        </div>
      )}
      <div className="variant-tile__image">
        {photoUrl ? (
          <img src={photoUrl} alt={label} />
        ) : (
          <span className="variant-tile__placeholder">Нет фото</span>
        )}
      </div>
      <div className="variant-tile__label">{label}</div>
    </div>
  );
}

function Stage22() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const productId = params.get("id");
  const [product, setProduct] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /* ---------- Inline-редактирование ---------- */
  const [editingField, setEditingField] = useState(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef(null);
  const brandDocInputRef = useRef(null);

  const reload = () => {
    if (!productId) return;
    return Promise.all([productsApi.get(productId), catalogApi.get()])
      .then(([loadedProduct, loadedCatalog]) => {
        setProduct(loadedProduct);
        setCatalog(loadedCatalog);
      })
      .catch((loadError) => setError(loadError.message));
  };

  useEffect(() => {
    if (productId) setProductWizard(productId, false);
    reload();
  }, [productId]);

  const files = product?.files || [];
  const photos = files
    .filter((file) => file.role === "presentation" && !file.variationId)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const logo =
    files.find((file) => file.role === "logo" && !file.variationId) || null;
  const brandDoc =
    files.find(
      (file) =>
        file.role === "document" &&
        file.documentType === "brand" &&
        !file.variationId,
    ) || null;

  const category = product?.categoryPath || "";
  const productLine = product?.productLine || "";
  const brandName = product?.brandName || "";
  const productName =
    [(product?.productName || "").trim(), brandName.trim(), productLine.trim()]
      .filter(Boolean)
      .join(" ") ||
    product?.fullName ||
    "";
  const brandStatus = brandName.trim() && brandDoc ? "Подтвержден" : "";
  const variations = product?.variations || [];
  const variantLabel = (variation) =>
    formatVariantParameterLabel(product, variation, catalog) ||
    variation.fullName ||
    variation.model ||
    `Вариант ${variation.id.slice(0, 6)}`;
  const created = variations.filter((item) => {
    const status = (item.reviewStatus || "").toLowerCase();
    return status !== "rejected" && status !== "archived";
  });
  const hasFilledVariant = variations.some((variation) => {
    const values = variation.values || [];
    const hasValues = values.some(
      (item) =>
        String(item.value || "").trim() ||
        String(item.customValue || "").trim(),
    );
    if (hasValues) return true;

    const description =
      variation.description?.purpose ||
      variation.description?.principle ||
      (variation.complectation?.items || []).length;
    if (description) return true;

    const status = (variation.reviewStatus || "").toLowerCase();
    if (status && status !== "filling") return true;

    return false;
  });

  /* ---------- Редактирование полей ---------- */
  const [brandEdited, setBrandEdited] = useState(false);
  const handleBrandDocFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !productId) return;
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("role", "document");
      formData.append("documentType", "brand");
      await productsApi.upload(productId, formData);
      await reload();
    } catch (uploadError) {
      setError(uploadError.message || "Не удалось загрузить документ");
    } finally {
      setSaving(false);
    }
  };

  const handleBrandDocRemove = async () => {
    if (!brandDoc?.id) return;
    setSaving(true);
    setError("");
    try {
      await productsApi.deleteFile(brandDoc.id);
      await reload();
    } catch (removeError) {
      setError(removeError.message || "Не удалось удалить документ");
    } finally {
      setSaving(false);
    }
  };
  const startEdit = (field, value) => {
    setEditingField(field);
    setDraft(value || "");
    setError("");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setDraft("");
  };

  const withSave = async (fn) => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await fn();
      cancelEdit();
      await reload();
    } catch (saveError) {
      setError(saveError.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const saveBrandName = () =>
    withSave(async () => {
      const nextBrand = draft.trim();
      const prevBrand = (product?.brandName || "").trim();
      const changed = nextBrand !== prevBrand;

      await productsApi.saveIdentity(productId, {
        authorLastName: product?.authorLastName || "",
        authorFirstName: product?.authorFirstName || "",
        authorMiddleName: product?.authorMiddleName || "",
        tradeName: product?.tradeName || "",
        brandName: nextBrand,
        manufacturerName: product?.manufacturerName || "",
        manufacturerCountry: product?.manufacturerCountry || "",
        productIdentifier: product?.productIdentifier || "",
        internalArticle: product?.internalArticle || "",
      });

      // Показываем поле документов только при реальном изменении бренда
      if (changed) setBrandEdited(true);
    });

  const saveProductLine = () =>
    withSave(() =>
      productsApi.saveCategory(productId, {
        purpose: product?.purpose || "",
        kindCode: product?.kindCode || "",
        productName: product?.productName || "",
        categoryPath: product?.categoryPath || "",
        productLine: draft.trim(),
      }),
    );

  const saveLineName = () =>
    withSave(() =>
      productsApi.saveName(productId, {
        fullName: draft.trim(),
        nameIncludesLogo: Boolean(logo),
        nameIncludesType: false,
        nameIncludesBrand: false,
        nameIncludesLine: false,
        nameIncludesModel: false,
      }),
    );

  const handleLogoFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !productId) return;
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("role", "logo");
      await productsApi.upload(productId, formData);
      await reload();
    } catch (uploadError) {
      setError(uploadError.message || "Не удалось загрузить логотип");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoRemove = async () => {
    if (!logo?.id) return;
    setSaving(true);
    setError("");
    try {
      await productsApi.deleteFile(logo.id);
      await reload();
    } catch (removeError) {
      setError(removeError.message || "Не удалось удалить логотип");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Создание / редактирование варианта ---------- */

  const openCreate = async () => {
    if (!productId || busy) return;
    setVariantFlow(productId, "create");
    setBusy(true);
    setError("");
    try {
      await productsApi.saveWantsVariants(productId, { wantsVariants: true });
      const created = await productsApi.addVariation(productId, { values: [] });
      if (!created?.id) throw new Error("Не удалось создать вариант");

      const next = new URLSearchParams();
      next.set("id", productId);
      next.set("variationId", created.id);
      navigate({ pathname: "/Add", search: `?${next.toString()}` });
    } catch (createError) {
      setError(createError.message || "Не удалось создать вариант");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (variation) => {
    setVariantFlow(productId, "edit");
    setVariantBaseline(variation.id, variation.signature || "");
    const next = new URLSearchParams();
    if (productId) next.set("id", productId);
    next.set("variationId", variation.id);
    navigate({ pathname: "/Add", search: `?${next.toString()}` });
  };

  const removeVariant = async (variation) => {
    if (!productId || !variation?.id || busy) return;
    if (!window.confirm("Удалить этот вариант?")) return;
    setBusy(true);
    setError("");
    try {
      await productsApi.deleteVariation(productId, variation.id);
      await reload();
    } catch (removeError) {
      setError(removeError.message || "Не удалось удалить");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Универсальная строка с карандашом ---------- */

  const EditableValue = ({ field, value, onSave, children }) => {
    const editing = editingField === field;
    if (!editing) {
      return (
        <>
          {children || value || "—"}
          <button
            type="button"
            className="row__edit"
            onClick={() => startEdit(field, value)}
            title="Редактировать"
          >
            ✎
          </button>
        </>
      );
    }
    return (
      <span className="row__edit-wrap">
        <input
          type="text"
          className="row__edit-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSave();
            if (event.key === "Escape") cancelEdit();
          }}
          autoFocus
        />
        <button
          type="button"
          className="row__edit-ok"
          onClick={onSave}
          disabled={saving}
          title="Сохранить"
        >
          ✓
        </button>
        <button
          type="button"
          className="row__edit-cancel"
          onClick={cancelEdit}
          disabled={saving}
          title="Отмена"
        >
          ✕
        </button>
      </span>
    );
  };

  return (
    <>
      <div className="container">
        {/* {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )} */}
        {error && <p className="form-error">{error}</p>}

        <h1 className="iio">
          {hasFilledVariant
            ? "Черновик карточки продукта"
            : "Этап 3 - Черновик карточки продукта"}
        </h1>

        <h2 className="section-title subtitle lli">Линейка продукта</h2>

        <div className="field">
          <span className="standartW">
            Презентационное видео линейки продукции:
          </span>
          <img
            src="/images/video.png"
            alt="Презентационное видео"
            className="field__video"
          />
        </div>

        <div className="field">
          <span className="standartW">
            Презентационные фотографии линейки продукции
          </span>
          <LinePhotos photos={photos} />
        </div>

        <input
          type="file"
          accept="image/*"
          ref={logoInputRef}
          onChange={handleLogoFileChange}
          style={{ display: "none" }}
        />

        <input
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          ref={brandDocInputRef}
          onChange={handleBrandDocFileChange}
          style={{ display: "none" }}
        />

        {/* ===== Основные данные ===== */}
        <div className="rows">
          <div className="row">
            <span className="row__label">Категория линейки:</span>
            <span className="row__value row__value--breadcrumb">
              {category || "—"}
            </span>
          </div>

          {/* ===== Данные о бренде ===== */}
          <div className="rows rows--brand">
            <div className="row">
              <span className="row__label">Бренд</span>
              <span className="row__value">
                {brandStatus ? (
                  <span className="row__status">{brandStatus}</span>
                ) : (
                  "—"
                )}
              </span>
            </div>

            <div className="row">
              <span className="row__label">Название бренда:</span>
              <span className="row__value">
                <EditableValue
                  field="brandName"
                  value={brandName}
                  onSave={saveBrandName}
                />
              </span>
            </div>

            {brandEdited && brandName.trim() && (
              <div className="row">
                <span className="row__label">Документы на бренд:</span>
                <span className="row__value">
                  {brandDoc ? (
                    <>
                      <button
                        type="button"
                        className="row__edit"
                        onClick={() => brandDocInputRef.current?.click()}
                        disabled={saving}
                        title="Заменить документ"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="row__edit row__edit--danger"
                        onClick={handleBrandDocRemove}
                        disabled={saving}
                        title="Удалить документ"
                      >
                        ✕
                      </button>
                      <a
                        href={brandDoc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="row__doc-link"
                      >
                        {brandDoc.originalName || "Документ"}
                      </a>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="row__edit"
                        onClick={() => brandDocInputRef.current?.click()}
                        disabled={saving}
                        title="Загрузить документ"
                      >
                        ✎
                      </button>
                      —
                    </>
                  )}
                </span>
              </div>
            )}

            <div className="row">
              <span className="row__label">Логотип</span>
              <span className="row__value">
                {logo ? (
                  <>
                    <img src={logo.url} alt="Логотип" className="row__logo" />
                    <button
                      type="button"
                      className="row__edit"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={saving}
                      title="Заменить логотип"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="row__edit row__edit--danger"
                      onClick={handleLogoRemove}
                      disabled={saving}
                      title="Удалить логотип"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    —
                    <button
                      type="button"
                      className="row__edit"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={saving}
                      title="Загрузить логотип"
                    >
                      ✎
                    </button>
                  </>
                )}
              </span>
            </div>

            <div className="row">
              <span className="row__label">Линейка продукта:</span>
              <span className="row__value">
                <EditableValue
                  field="productLine"
                  value={productLine}
                  onSave={saveProductLine}
                />
              </span>
            </div>
          </div>

          <div className="row">
            <span className="row__label">Наименование линейки:</span>
            <span className="row__value">
              {logo && (
                <img src={logo.url} alt="Логотип" className="row__mini-logo" />
              )}
              {productName || "—"}
            </span>
          </div>
        </div>

        <div className="divider" />

        <h2 className="section-title">Модель (параметр)</h2>

        <div className="variants-board">
          <div className="variants-group">
            <div className="variants-group__create-wrap">
              <PageHelp
                inline
                context="Добавление модели"
                buttonTitle="Подсказка по добавлению модели"
              />
              <button
                type="button"
                className="variants-create"
                onClick={openCreate}
              >
                <span className="variants-create__image" aria-hidden="true">
                  <span className="variants-create__icon">+</span>
                </span>
                <span className="variants-create__text">Добавить</span>
              </button>
            </div>

            <div className="variants-group__list">
              {created.map((variation) => (
                <VariantCard
                  key={variation.id}
                  label={
                    variantLabel(variation) === "—"
                      ? "2 характеристики"
                      : variantLabel(variation)
                  }
                  photoUrl={variantPhoto(files, variation.id)}
                  onEdit={() => openEdit(variation)}
                  onDelete={() => removeVariant(variation)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <PreviewBar
        current={3}
        total={4}
        prevPath="/stage2"
        previewPath="/stage22"
        managePath="/products"
        homeIconSrc="/images/Home.png"
        onSave={async () => { }}
        onNext={() => openCreate()}
        showManage={hasFilledVariant}
        showNext={!hasFilledVariant}
        showStep={!hasFilledVariant}
      />
    </>
  );
}

export default Stage22;