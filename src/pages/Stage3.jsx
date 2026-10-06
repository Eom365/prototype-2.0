// Этап 3 - Презентация продукции
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import PhotoGallery from "../components/PhotoGallery";
import { productsApi } from "../api";
import { fillProgressTotal, isProductWizard, setProductWizard } from "../stageProgress";
import "./Stage3.css";

function Stage3() {
  const [params] = useSearchParams();
  const productId = params.get("id");
  const [showNoSub, setShowNoSub] = useState(false);
  const [product, setProduct] = useState(null);

  useEffect(() => {
    if (!productId) return;
    if (!isProductWizard(productId)) setProductWizard(productId, true);
    productsApi
      .get(productId)
      .then(setProduct)
      .catch(() => {});
  }, [productId]);

  const total = fillProgressTotal(product, productId) || 3;

  return (
    <>
      <div className="container">
        <h1 className="title">Этап 3 - Презентация продукции</h1>

        <h2 className="subtitle hyt">Презентационное видео продукта</h2>
        <div className="video-row">
          <button
            type="button"
            className="add-photo-btn"
            onClick={() => setShowNoSub(true)}
          >
            <span className="add-photo-btn__icon">＋</span>
            <span className="add-photo-btn__text">Добавить видео</span>
          </button>

          {showNoSub && (
            <span className="no-sub-text">
              Оплатите подписку и добавьте видео
            </span>
          )}
        </div>

        <h2 className="subtitle hyt">Презентационные фотографии продукта</h2>
        <p className="section-description standart">
          Загрузите изображения, которые показывают ассортимент продукции: общий
          вид и новинки продукции в линейке. Эти фото не привязаны к конкретной
          модели или цвету — они создают общее представление о линейке.
        </p>
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
            src="/images/image1.png"
            alt="Презентационное изображение повышающих наконечников"
          />
          <img
            src="/images/image2.png"
            alt="Презентационное изображение смартфонов"
          />
        </div>

        {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )}
        {productId && (
          <PhotoGallery productId={productId} role="presentation" />
        )}
      </div>

      <BottomBar
        current={3}
        total={total}
        prevPath="/stage2"
        nextPath="/stage12"
      />
    </>
  );
}

export default Stage3;
