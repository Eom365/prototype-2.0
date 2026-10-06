// Этап 7 - упаковка продукта
import { useEffect, useState } from "react";
import BottomBar from "../components/BottomBar";
import {
  CUSTOM_VARIANT_FILL_STAGE_COUNT,
  productWizardOffset,
  variantFillStageHeading,
  variantFillStep,
} from "../stageProgress";
import PackTypeHint from "../components/PackTypeHint";
import PhotoGallery from "../components/PhotoGallery";
import VariationPreview from "../components/VariationPreview";
import { productsApi } from "../api";
import { packagingFrom, sameId, useCardIds } from "../cardScope";
import "./Stage18.css";
import "./Stage28.css";

function Stage28() {
  const { productId, variationId } = useCardIds();
  const [packType, setPackType] = useState("");
  const [material, setMaterial] = useState("");
  const [materialCustom, setMaterialCustom] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [sizeUnit, setSizeUnit] = useState("sm");
  const [sizes, setSizes] = useState({
    length: "",
    width: "",
    height: "",
  });
  useEffect(() => {
    if (!productId || !variationId) return;
    productsApi
      .get(productId)
      .then((product) => {
        const variation = (product.variations || []).find((item) =>
          sameId(item.id, variationId),
        );
        if (!variation) throw new Error("Вариация не найдена");
        const packaging = packagingFrom(product, variationId);
        setPackType(packaging.packType);
        setMaterial(packaging.packMaterial);
        setMaterialCustom(packaging.packMaterialCustom);
        setSizeUnit(packaging.packSizeUnit || "sm");
        setSizes({
          length: packaging.packLength,
          width: packaging.packWidth,
          height: packaging.packHeight,
        });
        setLoaded(true);
      })
      .catch((loadError) => setError(loadError.message));
  }, [productId, variationId]);

  const handleSizeChange = (name, value) => {
    setSizes((prev) => ({ ...prev, [name]: value }));
  };

  const save = () => {
    if (!productId)
      throw new Error("Сначала создайте карточку на главной странице");
    if (!variationId) throw new Error("Сначала создайте вариант на этапе 13");
    if (!loaded) throw new Error("Карточка ещё загружается, подождите секунду");
    return productsApi.saveVariationPackaging(productId, variationId, {
      packType,
      packMaterial: material,
      packMaterialCustom: materialCustom,
      packSizeUnit: sizeUnit,
      packLength: sizes.length,
      packWidth: sizes.width,
      packHeight: sizes.height,
    });
  };

  const selectPackType = (value) => {
    setPackType(value);
    setMaterial("");
  };

  return (
    <>
      <div className="container">
        <h1 className="title">
          {variantFillStageHeading(28, "Добавьте упаковку продукта.", null, productId)}
        </h1>
        <VariationPreview stage={18} />

        {/* Фотографии */}
        <div className="section">
          <h2 className="subtitle">Добавьте фотографии упаковки:</h2>

          {productId && variationId && (
            <PhotoGallery
              productId={productId}
              role="package"
              variationId={variationId}
            />
          )}
        </div>

        {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )}
        {productId && !variationId && (
          <p className="form-error">Сначала создайте вариант на этапе 13.</p>
        )}
        {error && <p className="form-error">{error}</p>}

        {/* Вид упаковки */}
        <div className="section">
          <h2 className="subtitle">Укажите вид упаковки:</h2>

          <div className="radio-row">
            <label className="radio-label">
              <input
                type="radio"
                name="packType"
                value="box"
                checked={packType === "box"}
                onChange={() => selectPackType("box")}
              />
              <span>Коробка</span>
            </label>
            <PackTypeHint packType="box" />
          </div>

          <div className="radio-row">
            <label className="radio-label">
              <input
                type="radio"
                name="packType"
                value="case"
                checked={packType === "case"}
                onChange={() => selectPackType("case")}
              />
              <span>Футляр</span>
            </label>
            <PackTypeHint packType="case" />
          </div>

          <div className="radio-row">
            <label className="radio-label">
              <input
                type="radio"
                name="packType"
                value="blister"
                checked={packType === "blister"}
                onChange={() => selectPackType("blister")}
              />
              <span>Блистер</span>
            </label>
            <PackTypeHint packType="blister" />
          </div>
        </div>

        {/* Материал упаковки */}
        <div className="section">
          <h2 className="subtitle">Укажите материал упаковки:</h2>

          {!packType && (
            <p className="material-hint">Сначала выберите вид упаковки выше</p>
          )}

          {/* ===== Коробка ===== */}
          {packType === "box" && (
            <div className="material-buttons">
              <button
                type="button"
                className={`material-btn ${material === "cardboard" ? "material-btn--active" : ""}`}
                onClick={() => setMaterial("cardboard")}
              >
                Картон
              </button>
              <button
                type="button"
                className={`material-btn ${material === "plastic" ? "material-btn--active" : ""}`}
                onClick={() => setMaterial("plastic")}
              >
                Пластик
              </button>
              <button
                type="button"
                className={`material-btn ${material === "other" ? "material-btn--active" : ""}`}
                onClick={() => setMaterial("other")}
              >
                Иное
              </button>

              {material === "other" && (
                <input
                  type="text"
                  className="material-input"
                  placeholder="Введите своё значение"
                  value={materialCustom}
                  onChange={(e) => setMaterialCustom(e.target.value)}
                />
              )}
            </div>
          )}

          {/* ===== Футляр ===== */}
          {packType === "case" && (
            <div className="material-buttons">
              <button
                type="button"
                className={`material-btn ${material === "hdpe" ? "material-btn--active" : ""}`}
                onClick={() => setMaterial("hdpe")}
              >
                Полиэтилен высокой плотности
              </button>
              <button
                type="button"
                className={`material-btn ${material === "plastic" ? "material-btn--active" : ""}`}
                onClick={() => setMaterial("plastic")}
              >
                Пластик
              </button>
              <button
                type="button"
                className={`material-btn ${material === "nylon" ? "material-btn--active" : ""}`}
                onClick={() => setMaterial("nylon")}
              >
                Нейлон
              </button>
              <button
                type="button"
                className={`material-btn ${material === "other" ? "material-btn--active" : ""}`}
                onClick={() => setMaterial("other")}
              >
                Иное
              </button>

              {material === "other" && (
                <input
                  type="text"
                  className="material-input"
                  placeholder="Введите своё значение"
                  value={materialCustom}
                  onChange={(e) => setMaterialCustom(e.target.value)}
                />
              )}
            </div>
          )}

          {/* ===== Блистер ===== */}
          {packType === "blister" && (
            <div className="material-buttons">
              <button
                type="button"
                className={`material-btn ${material === "hdpe" ? "material-btn--active" : ""}`}
                onClick={() => setMaterial("hdpe")}
              >
                Полиэтилен высокой плотности
              </button>
              <button
                type="button"
                className={`material-btn ${material === "pet" ? "material-btn--active" : ""}`}
                onClick={() => setMaterial("pet")}
              >
                Полиэтилентерефталат
              </button>
              <button
                type="button"
                className={`material-btn ${material === "pvc" ? "material-btn--active" : ""}`}
                onClick={() => setMaterial("pvc")}
              >
                Поливинилхлорид
              </button>
              <button
                type="button"
                className={`material-btn ${material === "other" ? "material-btn--active" : ""}`}
                onClick={() => setMaterial("other")}
              >
                Иное
              </button>

              {material === "other" && (
                <input
                  type="text"
                  className="material-input"
                  placeholder="Введите своё значение"
                  value={materialCustom}
                  onChange={(e) => setMaterialCustom(e.target.value)}
                />
              )}
            </div>
          )}
        </div>

        {/* Размеры */}
        <div className="section">
          <h2 className="subtitle">
            Укажите внешние размеры упаковки (длина x ширина x высота):
          </h2>

          <div className="dimension-row">
            <label className="dimension-label">Длина</label>
            <input
              type="text"
              className="dimension-input"
              value={sizes.length}
              onChange={(e) => handleSizeChange("length", e.target.value)}
            />
            <select
              className="dimension-select"
              value={sizeUnit}
              onChange={(e) => setSizeUnit(e.target.value)}
            >
              <option value="sm">сантиметров</option>
              <option value="mm">миллиметров</option>
            </select>
          </div>

          <div className="dimension-row">
            <label className="dimension-label">Ширина</label>
            <input
              type="text"
              className="dimension-input"
              value={sizes.width}
              onChange={(e) => handleSizeChange("width", e.target.value)}
            />
            <select
              className="dimension-select"
              value={sizeUnit}
              onChange={(e) => setSizeUnit(e.target.value)}
            >
              <option value="sm">сантиметров</option>
              <option value="mm">миллиметров</option>
            </select>
          </div>

          <div className="dimension-row">
            <label className="dimension-label">Высота</label>
            <input
              type="text"
              className="dimension-input"
              value={sizes.height}
              onChange={(e) => handleSizeChange("height", e.target.value)}
            />
            <select
              className="dimension-select"
              value={sizeUnit}
              onChange={(e) => setSizeUnit(e.target.value)}
            >
              <option value="sm">сантиметров</option>
              <option value="mm">миллиметров</option>
            </select>
          </div>
        </div>
      </div>

      <BottomBar
        current={variantFillStep(28) + productWizardOffset(productId)}
        total={CUSTOM_VARIANT_FILL_STAGE_COUNT + productWizardOffset(productId)}
        prevPath="/stage27"
        nextPath="/stage29"
        onSave={save}
      />
    </>
  );
}

export default Stage28;
