import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import { productsApi } from "../api";
import { setProductWizard } from "../stageProgress";
import "./Stage1.css";

const BRAND_DESCRIPTION = `Бренд - это название товарного знака, под которым продается товар.`;
// const BRAND_DESCRIPTION = `Бренд - это название товарного знака, под которым продается товар.
// Наименование бренда может заполнить только правообладатель товарного знака. Для подтверждения потребуется загрузить "Свидетельство на товарный знак" на Этапе 7 "Документы на продукт".
// Если вы продаете оригинальный товар, но не являетесь правообладателем - не заполняйте это поле.`;

const emptyFields = {
  authorLastName: "",
  authorFirstName: "",
  authorMiddleName: "",
  tradeName: "",
  brandName: "",
  manufacturerName: "",
  manufacturerCountry: "",
  productIdentifier: "",
  internalArticle: "",
};

function Stage1() {
  const [params] = useSearchParams();
  const productId = params.get("id");
  const [fields, setFields] = useState(emptyFields);
  const [savedBrandName, setSavedBrandName] = useState("");
  const [savedAuthor, setSavedAuthor] = useState({
    authorLastName: "",
    authorFirstName: "",
    authorMiddleName: "",
  });
  const [matches, setMatches] = useState([]);
  const [sellerModalOpen, setSellerModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setProductWizard(productId, true);
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    productsApi
      .get(productId)
      .then((product) => {
        setSavedBrandName(product.brandName || "");
        setSavedAuthor({
          authorLastName: product.authorLastName || "",
          authorFirstName: product.authorFirstName || "",
          authorMiddleName: product.authorMiddleName || "",
        });
        setFields({
          authorLastName: "",
          authorFirstName: "",
          authorMiddleName: "",
          tradeName: product.tradeName || "",
          brandName: "",
          manufacturerName: product.manufacturerName || "",
          manufacturerCountry: product.manufacturerCountry || "",
          productIdentifier: product.productIdentifier || "",
          internalArticle: product.internalArticle || "",
        });
        setLoaded(true);
      })
      .catch((loadError) => setError(loadError.message));
  }, [productId]);

  useEffect(() => {
    if (!productId) return undefined;
    const timer = setTimeout(() => {
      const query = new URLSearchParams();
      query.set("excludeId", productId);
      if (fields.tradeName) query.set("tradeName", fields.tradeName);
      if (fields.brandName) query.set("brandName", fields.brandName);
      if (fields.manufacturerName)
        query.set("manufacturerName", fields.manufacturerName);
      if (fields.manufacturerCountry)
        query.set("manufacturerCountry", fields.manufacturerCountry);
      if (fields.productIdentifier)
        query.set("productIdentifier", fields.productIdentifier);
      if (fields.internalArticle)
        query.set("internalArticle", fields.internalArticle);
      productsApi
        .matches(query.toString())
        .then(setMatches)
        .catch(() => setMatches([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [fields, productId]);

  const handleChange = (name, value) => {
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const save = () => {
    if (!productId)
      throw new Error("Сначала создайте карточку на главной странице");
    if (!loaded) throw new Error("Карточка ещё загружается, подождите секунду");
    return productsApi.saveIdentity(productId, {
      ...fields,
      ...savedAuthor,
      brandName: savedBrandName,
    });
  };

  return (
    <>
      <div className="container stage1-page">
        <h1 className="title">Этап 1 - Проверка идентичности продукта</h1>
        <h2 className="subtitle standart">
          Введите информацию о товаре для поиска совпадений среди существующих
          карточек товаров
        </h2>

        {!productId && (
          <p className="form-error">
            Откройте создание карточки с главной страницы.
          </p>
        )}
        {error && <p className="form-error">{error}</p>}

        <div className="form">
          <div className="field">
            <label className="label">Наименование продукта</label>
            <p className="pInfo">При заполнении ориентируйтесь на следующие документы:<br /> 1.Руководство по эксплуатации<br />2.Сертификат соответствия или декларация о соответствии <br />3.Регистрационное удостоверение</p>
            <p className="pBold">
              Пример правильного заполнения: Ноутбук HUAWEI MateBook D 15;
              Смартфон Apple iPhone 15 Pro
            </p>
            <div className="field-control">
              <span className="required-mark">✱</span>
              <input
                type="text"
                value={fields.tradeName}
                onChange={(event) =>
                  handleChange("tradeName", event.target.value)
                }
                className="input"
                placeholder="Введите значение..."
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Наименование бренда</label>
            <p className="field-description standart" >{BRAND_DESCRIPTION}</p>
            <p className="pInfo">При заполнении ориентируйтесь на следующие документы:<br /> 1.Свидетельство на товарный знак</p>
            <p className="pBold">Пример правильного заполнения: "HUAWEI"</p>
            <input
              type="text"
              value={fields.brandName}
              onChange={(event) =>
                handleChange("brandName", event.target.value)
              }
              className="input"
              placeholder="Введите значение..."
            />
          </div>

          <div className="field">
            <label className="label">Производитель товара</label>
            <p className="pInfo">При заполнении ориентируйтесь на следующие документы:<br /> 1.Руководство по эксплуатации<br />2.Сертификат соответствия или декларация о соответствии <br />3.Регистрационное удостоверение</p>
            <p className="pBold">Пример правильного заполнения: "Huawei Device Co., Ltd."</p>
            <div className="field-control">
              <span className="required-mark">✱</span>
              <input
                type="text"
                value={fields.manufacturerName}
                onChange={(event) =>
                  handleChange("manufacturerName", event.target.value)
                }
                className="input"
                placeholder="Введите значение..."
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Страна производителя</label>
            <p className="pBold">Пример правильного заполнения: "Китай"</p>
            <div className="field-control">
              <span className="required-mark">✱</span>
              <input
                type="text"
                value={fields.manufacturerCountry}
                onChange={(event) =>
                  handleChange("manufacturerCountry", event.target.value)
                }
                className="input"
                placeholder="Введите значение..."
              />
            </div>
          </div>
        </div>

        {matches.length > 0 && (
          <div className="matches">
            <div className="matches-divider" />
            <h3>Результат проверки</h3>
            {matches.map((match) => (
              <div className="match-card" key={match.id}>
                <div className="match-card__info">
                  <strong>{match.title}</strong>
                  <span>
                    {match.status === "ready" ? "Готово" : "Черновик"}
                  </span>
                  <p>Совпало: {match.reasons.join(", ")}</p>
                </div>
                <button
                  type="button"
                  className="match-card__seller-btn"
                  onClick={() => setSellerModalOpen(true)}
                >
                  Стать продавцом этого товара
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomBar current={1} total={3} nextPath="/stage2" onSave={save} />

      {sellerModalOpen && (
        <div
          className="seller-modal"
          onClick={() => setSellerModalOpen(false)}
        >
          <div
            className="seller-modal__card"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="seller-modal__text">В разработке</p>
            <button
              type="button"
              className="seller-modal__ok"
              onClick={() => setSellerModalOpen(false)}
              aria-label="Закрыть"
            >
              ✓
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Stage1;
