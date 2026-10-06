import { useEffect, useState } from "react";
import BottomBar from "../components/BottomBar";
import {
  VARIANT_FILL_STAGE_COUNT,
  fillProgressStep,
  fillProgressTotal,
  variantFillStageHeading,
} from "../stageProgress";
import PhotoGallery from "../components/PhotoGallery";
import VariationPreview from "../components/VariationPreview";
import { productsApi } from "../api";
import { useCardIds } from "../cardScope";
import "./Stage3.css";

function Stage14() {
  const { productId, variationId } = useCardIds();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    if (!productId) return;
    productsApi
      .get(productId)
      .then(setProduct)
      .catch(() => { });
  }, [productId]);

  return (
    <>
      <div className="container">
        <h1 className="title">
          {variantFillStageHeading(
            14,
            "Фотографии варианта параметра продукта",
            product,
            productId,
          )}
        </h1>
        {variationId && <VariationPreview stage={14} />}
        <h2 className="subtitle">
          Загрузите изображения, которые соответствуют внешнему виду варианта
          параметра продукта.
        </h2>
        <p>Требования к фотографиям: </p>
        <p className="pBold standartOne">
          Фон: продукт на фотографии должен быть на белом фоне.
          <br /> Ракурс: продукт должен занимать 2/3 изображения.
          <br />
          Формат: JPG, PNG. <br /> Размер фотографий: <br /> минимальный - 1000
          X 1000 px <br />
          рекомендуемый - 1600 X 1600 px <br /> максимальный - 2560 X 1440 px
        </p>
        <p className="pBold">Пример правильного заполнения:</p>

        <div className="presentation-images">
          <img
            src="/images/product-single-example1.png"
            alt="Пример: одно изделие — смартфон с двух ракурсов"
          />
          <img
            src="/images/product-single-example2.png"
            alt="Пример: одно изделие — стоматологический наконечник"
          />
        </div>

        {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )}
        {productId && !variationId && (
          <div className="stage14-gallery">
            <PhotoGallery productId={productId} role="product" />
          </div>
        )}

        {productId && variationId && (
          <>
            <h2 className="subtitle" style={{ marginTop: 24, textAlign: "left" }}>
              Фотографии текущего варианта
            </h2>
            <div className="stage14-gallery">
              <PhotoGallery
                key={variationId}
                productId={productId}
                role="product"
                variationId={variationId}
              />
            </div>
          </>
        )}
      </div>

      <BottomBar
        current={fillProgressStep(14, product, productId)}
        total={fillProgressTotal(product, productId) || VARIANT_FILL_STAGE_COUNT}
        prevPath="/stage7"
        nextPath="/stage23"
      />
    </>
  );
}

export default Stage14;