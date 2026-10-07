// Этап 1 документы

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import { productsApi } from "../api";
import {
  VARIANT_FILL_STAGE_COUNT,
  fillProgressStep,
  fillProgressTotal,
  isProductWizard,
  variantFillStageHeading,
} from "../stageProgress";
import { skipsVariantParamStage } from "../variantFlow";
import "./Stage7.css";

const documentFields = [
  ["warranty", "Гарантийный талон"],
  ["brand", "Бренд", "Свидетельство на товарный знак"],
  ["certificate", "Сертификат соответствия"],
  ["declaration", "Декларация о соответствии"],
  ["stateRegistration", "Свидетельство о государственной регистрации"],
  ["registration", "Регистрационное удостоверение"],
  ["manual", "Руководство по эксплуатации"],
  ["other", "Иной документ"],
];

function valueText(values, code) {
  const field = (values || []).find((item) => item.code === code);
  if (!field?.value) return "";
  return field.value === "other" ? field.customValue || "" : field.value;
}

function resolveDocumentGroup(product) {
  const kindCode = (product?.kindCode || "").toLowerCase();
  const categoryCode = (product?.categoryCode || "").toLowerCase();
  const path = (product?.categoryPath || "").toLowerCase();
  if (kindCode === "other") return "other";
  if (
    categoryCode === "handpieces" ||
    path.includes("наконечник")
  ) {
    return "handpieces";
  }
  if (
    categoryCode === "aerosols" ||
    path.includes("аэрозол") ||
    path.includes("баллон")
  ) {
    return "aerosols";
  }
  return "other";
}

function getRequiredFields(product, hasBrand) {
  const group = resolveDocumentGroup(product);
  const required = new Set(["warranty", "manual"]);
  if (group === "handpieces") required.add("registration");
  if (group === "aerosols") {
    required.add("certificate");
    required.add("declaration");
  }
  if (hasBrand) required.add("brand");
  return required;
}

function getVisibleDocumentFields(product, requiredFields, brandAlreadyAttached) {
  const group = resolveDocumentGroup(product);
  return documentFields.filter(([name]) => {
    if (name === "brand" && brandAlreadyAttached) return false;
    if (group === "other") return true;
    return requiredFields.has(name);
  });
}

function Stage7() {
  const [params] = useSearchParams();
  const productId = params.get("id");
  const variationId = params.get("variationId");
  const [files, setFiles] = useState({});
  const [product, setProduct] = useState(null);
  const [requiredFields, setRequiredFields] = useState(
    new Set(["warranty", "manual"]),
  );
  const [error, setError] = useState("");
  const fileInputsRef = useRef({});

  const sameVariation = (fileVariationId) => {
    if (!variationId) return !fileVariationId;
    return String(fileVariationId || "").toLowerCase() === String(variationId).toLowerCase();
  };

  const load = async () => {
    const product = await productsApi.get(productId);
    setProduct(product);
    const variations = [...(product.variations || [])].sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0),
    );
    const variation = variationId
      ? variations.find(
          (item) => String(item.id).toLowerCase() === String(variationId).toLowerCase(),
        )
      : null;
    const firstVariation = variations[0] || null;
    const isLaterVariation = Boolean(
      variationId &&
        firstVariation &&
        String(firstVariation.id).toLowerCase() !== String(variationId).toLowerCase(),
    );

    const next = {};
    for (const file of product.files || []) {
      if (file.role === "document" && file.documentType && sameVariation(file.variationId)) {
        next[file.documentType] = file;
      }
    }

    if (variationId && !next.brand) {
      const brandFromStage3 = (product.files || []).find(
        (file) =>
          file.role === "document" &&
          file.documentType === "brand" &&
          !file.variationId,
      );
      const brandFromFirst =
        !brandFromStage3 && isLaterVariation
          ? (product.files || []).find(
              (file) =>
                file.role === "document" &&
                file.documentType === "brand" &&
                String(file.variationId || "").toLowerCase() ===
                  String(firstVariation.id).toLowerCase(),
            )
          : null;
      if (brandFromStage3 || brandFromFirst) {
        next.brand = brandFromStage3 || brandFromFirst;
      }
    }

    if (!variationId && !next.brand) {
      const brandFromStage3 = (product.files || []).find(
        (file) =>
          file.role === "document" &&
          file.documentType === "brand" &&
          !file.variationId,
      );
      if (brandFromStage3) next.brand = brandFromStage3;
    }

    const brandAlreadyOnProduct = (product.files || []).some(
      (file) =>
        file.role === "document" &&
        file.documentType === "brand" &&
        !file.variationId,
    );
    const hasBrand = Boolean(
      valueText(variation?.values, "brand") ||
        valueText(product.values, "brand") ||
        product.brandName?.trim(),
    );
    setRequiredFields(
      getRequiredFields(product, hasBrand && !brandAlreadyOnProduct),
    );
    setFiles(next);
  };

  useEffect(() => {
    if (!productId) return;
    load().catch((loadError) => setError(loadError.message));
  }, [productId, variationId]);

  const handleFileChange = async (name, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !productId) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("role", "document");
    formData.append("documentType", name);
    if (variationId) formData.append("variationId", variationId);
    setError("");
    try {
      await productsApi.upload(productId, formData);
      await load();
    } catch (uploadError) {
      setError(uploadError.message);
    }
  };

  const handleFileRemove = async (name) => {
    const file = files[name];
    if (!file) return;
    const borrowedBrand =
      name === "brand" &&
      (
        !file.variationId ||
        (variationId &&
          String(file.variationId || "").toLowerCase() !==
            String(variationId).toLowerCase())
      );
    if (borrowedBrand) {
      setFiles((prev) => {
        const next = { ...prev };
        delete next.brand;
        return next;
      });
      return;
    }
    setError("");
    try {
      await productsApi.deleteFile(file.id);
      await load();
    } catch (removeError) {
      setError(removeError.message);
    }
  };

  const brandAlreadyAttached = (product?.files || []).some(
    (file) =>
      file.role === "document" &&
      file.documentType === "brand" &&
      !file.variationId,
  );
  const visibleFields = getVisibleDocumentFields(
    product,
    requiredFields,
    brandAlreadyAttached,
  );

  const uploadedFiles = visibleFields
    .map(([name, label]) => ({ name, label, file: files[name] }))
    .filter((item) => item.file);

  return (
    <>
      <div className="container stage7-page">
        <div className="divOne">
          <h1 className="hOne">
            Создание варианта параметра (модели) линейки продукта
          </h1>
          <p>***Наименование***</p>
        </div>
        <h1 className="title">
          {variantFillStageHeading(7, "Документы на продукт", product, productId)}
        </h1>
        <h2 className="subtitle">Добавьте документы</h2>
        {/* {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )} */}
        {error && <p className="form-error">{error}</p>}

        <div className="form">
          {visibleFields.map(([name, label, placeholder]) => (
            <div className="field" key={name}>
              <label className="label">{label}</label>
              <input
                type="file"
                ref={(element) => {
                  fileInputsRef.current[name] = element;
                }}
                onChange={(event) => handleFileChange(name, event)}
                style={{ display: "none" }}
              />
              <div
                className={`field-control${name === "warranty" ? " field-control--warranty" : ""}`}
              >
                {requiredFields.has(name) && (
                  <span className="required-mark">✱</span>
                )}
                <div className="file-input">
                  <input
                    type="text"
                    className="file-input__text"
                    value={files[name] ? files[name].name : ""}
                    placeholder={placeholder || label}
                    readOnly
                  />
                  {files[name] && (
                    <button
                      type="button"
                      className="file-input__clear"
                      onClick={() => handleFileRemove(name)}
                      title="Удалить файл"
                    >
                      ✕
                    </button>
                  )}
                  <button
                    type="button"
                    className="file-input__clip"
                    onClick={() => fileInputsRef.current[name]?.click()}
                    title="Прикрепить файл"
                  >
                    📎
                  </button>
                </div>
                {name === "warranty" && (
                  <button type="button" className="template-btn">
                    Шаблон
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {uploadedFiles.length > 0 && (
          <div className="uploaded-docs">
            <h3 className="uploaded-docs__title">Загруженные документы</h3>
            <div className="uploaded-docs__list">
              {uploadedFiles.map(({ name, label, file }) => (
                <div className="file-card-row" key={name}>
                  <div className="file-card">
                    <span className="file-card__icon">📄</span>
                    <span className="file-card__name">{label}</span>
                    <button
                      type="button"
                      className="file-card__remove"
                      onClick={() => handleFileRemove(name)}
                      title="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                  <a
                    className="file-card__download"
                    href={file.url}
                    download={file.name}
                  >
                    Скачать
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomBar
        current={fillProgressStep(7, product, productId)}
        total={fillProgressTotal(product, productId) || VARIANT_FILL_STAGE_COUNT}
        prevPath={
          (typeof sessionStorage !== "undefined" &&
            sessionStorage.getItem(`variantFlow:${productId}`) === "edit")
            ? "/stage22"
            : skipsVariantParamStage(product)
              ? isProductWizard(productId)
                ? "/stage3"
                : "/stage22"
              : "/stage12"
        }
        nextPath="/stage14"
      />
    </>
  );
}

export default Stage7;
