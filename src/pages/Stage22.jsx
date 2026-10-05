// Варианты параметров продукта
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import { productsApi } from "../api";
import { resolveVariantFlow, variantAxisFields } from "../variantFlow";
import "./Stage22.css";

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

function resolveAxis(product) {
  const flow = resolveVariantFlow(product);
  if (flow.mode === "known" && flow.axis) {
    return { code: flow.axis, label: flow.label || flow.axis };
  }
  const axes = product?.variantAxes || [];
  if (axes[0]) {
    return { code: axes[0], label: axes[0] };
  }
  return { code: "model", label: "Модель" };
}

function axisValue(variation, axis) {
  const row = (variation.values || []).find((item) => item.code === axis);
  if (!row) {
    if (axis === "model") return (variation.model || "").trim();
    return "";
  }
  if (String(axis || "").startsWith("custom:")) {
    return (row.customValue || "").trim();
  }
  if (row.value === "other") return (row.customValue || "").trim();
  return (row.value || "").trim();
}

function variantLabel(variation, product) {
  const fields = variantAxisFields(product);
  if (fields.length) {
    const parts = fields
      .map((field) => axisValue(variation, field.code))
      .filter(Boolean);
    return parts.join(" · ") || "—";
  }
  const axis = resolveAxis(product);
  return axisValue(variation, axis.code) || "—";
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => {
    if (!productId) return;
    return productsApi
      .get(productId)
      .then(setProduct)
      .catch((loadError) => setError(loadError.message));
  };

  useEffect(() => {
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
  const created = variations.filter(
    (item) => (item.reviewStatus || "filling") !== "pending",
  );
  const pending = variations.filter((item) => item.reviewStatus === "pending");

  const openCreate = () => {
    setVariantFlow(productId, "create");
    navigate({
      pathname: "/stage12",
      search: productId ? `?id=${productId}` : "",
    });
  };

  const openEdit = (variation) => {
    setVariantFlow(productId, "edit");
    setVariantBaseline(variation.id, variation.signature || "");
    const next = new URLSearchParams();
    if (productId) next.set("id", productId);
    next.set("variationId", variation.id);
    navigate({ pathname: "/stage7", search: `?${next.toString()}` });
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

  return (
    <>
      <div className="container">
        <h1 className="title">Варианты параметра продукта</h1>
        {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )}
        {error && <p className="form-error">{error}</p>}

        <h2 className="section-title subtitle">Общая информация о продукте</h2>

        <h3 className="subtitleYt">Презентация линейки продукции</h3>

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

        {/* ===== Основные данные ===== */}
        <div className="rows">
          <div className="row">
            <span className="row__label">Категория продукта:</span>
            <span className="row__value row__value--breadcrumb">
              {category || "—"}
            </span>
          </div>

          <div className="row">
            <span className="row__label">Наименование продукта:</span>
            <span className="row__value">
              {logo && (
                <img src={logo.url} alt="Логотип" className="row__mini-logo" />
              )}
              {productName || "—"}
            </span>
          </div>

          <div className="row">
            <span className="row__label">Линейка продукта:</span>
            <span className="row__value">{productLine || "—"}</span>
          </div>
        </div>

        {/* ===== Данные о бренде (отдельно, с отступом 50px) ===== */}
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
            <span className="row__value">{brandName || "—"}</span>
          </div>

          <div className="row">
            <span className="row__label">Логотип</span>
            <span className="row__value">
              {logo ? (
                <img src={logo.url} alt="Логотип" className="row__logo" />
              ) : (
                "—"
              )}
            </span>
          </div>
        </div>

        <div className="divider" />

        <h2 className="section-title">Варианты параметров продукта</h2>

        <div className="variants-board">
          <div className="variants-group">
            <h3 className="variants-group__title">Созданные</h3>
            {created.length === 0 ? (
              <p className="variants-group__empty">
                Пока нет созданных вариантов
              </p>
            ) : (
              <div className="variants-group__list">
                {created.map((variation) => (
                  <VariantCard
                    key={variation.id}
                    label={variantLabel(variation, product)}
                    photoUrl={variantPhoto(files, variation.id)}
                    onEdit={() => openEdit(variation)}
                    onDelete={() => removeVariant(variation)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="variants-group">
            <h3 className="variants-group__title">На проверке</h3>
            {pending.length === 0 ? (
              <p className="variants-group__empty">Нет вариантов на проверке</p>
            ) : (
              <div className="variants-group__list">
                {pending.map((variation) => (
                  <VariantCard
                    key={variation.id}
                    label={variantLabel(variation, product)}
                    photoUrl={variantPhoto(files, variation.id)}
                    bordered
                    onDelete={() => removeVariant(variation)}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="variants-create"
            onClick={openCreate}
          >
            <span className="variants-create__inner">
              <span className="variants-create__icon" aria-hidden="true">
                +
              </span>
              <span className="variants-create__text">
                Создать вариант параметра продукта
              </span>
            </span>
          </button>
        </div>
      </div>

      <BottomBar showStep={false} prevPath="/stage3" />
    </>
  );
}

export default Stage22;
