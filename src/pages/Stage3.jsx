import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import PhotoGallery from "../components/PhotoGallery";
import "./Stage3.css";

function Stage3() {
  const [params] = useSearchParams();
  const productId = params.get("id");
  const [showNoSub, setShowNoSub] = useState(false);

  return (
    <>
      <div className="container">
        <h1 className="title">Этап 5 - Презентация продукции</h1>
        
        <p className="section-description standart">
          {" "}
          Загрузите изображения, которые показывают ассортимент продукции: общий
          вид и новинки продукции в линейке. Эти фото не привязаны к конкретной модели или цвету — они создают общее представление о линейке.
        </p>
        <h2 className="subtitle">Презентационные фотографии продукта</h2>
        <p>Требования к фотографиям: </p>
        <p className="pBold standartOne">Фон: продукт на фотографии должен быть на белом фоне.<br /> Ракурс: продукт должен занимать 2/3 изображения.<br />Формат: JPG, PNG. <br /> Размер фотографий: <br /> минимальный - 1000 X 1000 px <br />рекомендуемый -  1600 X 1600 px <br /> максимальный - 2560 X 1440 px</p>
        <p className="pBold">Пример правильного заполнения:</p>

        {/* Вставка изображений */}
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
        {/* <h2 className="subtitle">Презентационные фотографии продукта</h2> */}
        {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )}
        {productId && (
          <PhotoGallery productId={productId} role="presentation" />
        )}

        <h2 className="subtitle subtitle--video">
          Презентационное видео продукта
        </h2>
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
      </div>

      <BottomBar current={5} total={5} prevPath="/stage4" />
    </>
  );
}

export default Stage3;
