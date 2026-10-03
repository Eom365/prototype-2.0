// Этап 4 - наименование линейки продукта
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import { productsApi } from "../api";
import "./Stage2_3.css";

function Stage4() {
  const [params] = useSearchParams();
  const productId = params.get("id");
  const [fullName, setFullName] = useState("");
  const [logo, setLogo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!productId) return;
    productsApi
      .get(productId)
      .then((product) => {
        const logoFile =
          (product.files || []).find(
            (file) => file.role === "logo" && !file.variationId,
          ) || null;
        const composed = [
          (product.productName || "").trim(),
          (product.brandName || "").trim(),
          (product.productLine || "").trim(),
        ]
          .filter(Boolean)
          .join(" ");
        setLogo(logoFile);
        setFullName(composed);
      })
      .catch((loadError) => setError(loadError.message));
  }, [productId]);

  return (
    <>
      <div className="container stage3-page stage4-page">
        <h1 className="title stage3-title">
          Этап 4 - Наименование линейки продукта
        </h1>
        {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )}
        {error && <p className="form-error">{error}</p>}

        <p className="stage4-lead">
          Наименование линейки продукта сформировалось из Логотипа + Категории +
          Бренда + Линейки.
        </p>

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
            value={fullName}
            readOnly
            placeholder="Логотип Категория Бренд Линейка"
          />
        </div>
      </div>

      <BottomBar
        current={4}
        total={5}
        prevPath="/stage2_3"
        nextPath="/stage3"
      />
    </>
  );
}

export default Stage4;
