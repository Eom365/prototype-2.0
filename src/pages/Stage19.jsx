import { useEffect, useState } from "react";
import BottomBar from "../components/BottomBar";
import { VARIANT_FILL_STAGE_COUNT, productWizardOffset, variantFillStageHeading, variantFillStep } from "../stageProgress";
import VariationPreview from "../components/VariationPreview";
import { productsApi } from "../api";
import { discountsFrom, emptyDiscounts, useCardIds } from "../cardScope";
import "./Stage19.css";

function Stage19() {
  const { productId, variationId } = useCardIds();
  const [currency, setCurrency] = useState("RUB");
  const [price, setPrice] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const currencySymbols = {
    RUB: "₽",
    CNY: "¥",
  };

  const [discounts, setDiscounts] = useState(() => emptyDiscounts());

  useEffect(() => {
    if (!productId || !variationId) return;
    productsApi
      .get(productId)
      .then((product) => {
        const variation = (product.variations || []).find(
          (item) => item.id === variationId,
        );
        if (!variation) throw new Error("Вариация не найдена");
        setCurrency(variation.currency || "RUB");
        setPrice(variation.price || "");
        setDiscounts(discountsFrom(product, variationId));
        setLoaded(true);
      })
      .catch((loadError) => setError(loadError.message));
  }, [productId, variationId]);

  const save = () => {
    if (!productId)
      throw new Error("Сначала создайте карточку на главной странице");
    if (!variationId) throw new Error("Сначала создайте вариант на этапе 13");
    if (!loaded) throw new Error("Карточка ещё загружается, подождите секунду");
    return productsApi.savePrice(productId, {
      variationId,
      currency,
      price,
      discounts: discounts.map((item) => ({
        enabled: item.enabled,
        from: item.from,
        to: item.to,
        value: item.value,
      })),
    });
  };

  const handleDiscountChange = (index, field, value) => {
    setDiscounts((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const toggleDiscount = (index) => {
    setDiscounts((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  };

  return (
    <>
      <div className="container stage19-page">
        <h1 className="title">
          {variantFillStageHeading(19, 'Добавьте стоимость товара и систему лояльности', null, productId)}
        </h1>
        <VariationPreview stage={19} />
        {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )}
        {productId && !variationId && (
          <p className="form-error">Сначала создайте вариант на этапе 13.</p>
        )}
        {error && <p className="form-error">{error}</p>}

        <div className="section">
          <h2 className="subtitle">Стоимость товара</h2>

          <div className="price-row">
            <label className="price-label">Выберите валюту:</label>

            <div className="currency-group">
              <button
                type="button"
                className={`currency-btn ${currency === "RUB" ? "currency-btn--active" : ""}`}
                onClick={() => setCurrency("RUB")}
              >
                ₽ RUB
              </button>
              <button
                type="button"
                className={`currency-btn ${currency === "CNY" ? "currency-btn--active" : ""}`}
                onClick={() => setCurrency("CNY")}
              >
                ¥ CNY
              </button>
            </div>
          </div>

          <div className="price-row">
            <label className="price-label">Введите стоимость товара:</label>
            <div className="price-input-wrap">
              <span className="price-symbol">{currencySymbols[currency]}</span>
              <input
                type="text"
                className="price-input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder=""
              />
            </div>
          </div>
        </div>

        <div className="section">
          <h2 className="subtitle">
            <span className="info-icon" title="Подсказка">
              ⓘ
            </span>
            Система лояльности
          </h2>

          <p className="loyalty-subtitle">
            1.Предоставить скидку от количества продукта
          </p>

          {discounts.map((discount, index) => (
            <div
              className={`loyalty-row${index === 0 ? " loyalty-row--first" : ""}`}
              key={index}
            >
              <button
                type="button"
                className={`toggle ${discount.enabled ? "toggle--on" : ""}`}
                onClick={() => toggleDiscount(index)}
                title={discount.enabled ? "Выключить" : "Включить"}
              >
                <span className="toggle__knob" />
              </button>

              <div className="loyalty-row__content">
                <span className="loyalty-text">При покупке от</span>
                <input
                  type="text"
                  className="loyalty-input loyalty-input--small"
                  value={discount.from}
                  onChange={(e) =>
                    handleDiscountChange(index, "from", e.target.value)
                  }
                  disabled={!discount.enabled}
                />
                <span className="loyalty-text">до</span>
                <input
                  type="text"
                  className="loyalty-input loyalty-input--small"
                  value={discount.to}
                  onChange={(e) =>
                    handleDiscountChange(index, "to", e.target.value)
                  }
                  disabled={!discount.enabled}
                />
                <span className="loyalty-text">
                  штук, стоимость за единицу продукта составит
                </span>
                <span className="loyalty-currency">
                  {currencySymbols[currency]}
                </span>
                <input
                  type="text"
                  className="loyalty-input loyalty-input--price"
                  value={discount.value}
                  onChange={(e) =>
                    handleDiscountChange(index, "value", e.target.value)
                  }
                  disabled={!discount.enabled}
                />
                <span className="info-icon" title="Подсказка">
                  ⓘ
                </span>
                {index === 0 && <span className="required-mark">✱</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomBar
        current={variantFillStep(19) + productWizardOffset(productId)}
        total={VARIANT_FILL_STAGE_COUNT + productWizardOffset(productId)}
        prevPath="/stage18"
        nextPath="/stage20"
        onSave={save}
      />
    </>
  );
}

export default Stage19;
