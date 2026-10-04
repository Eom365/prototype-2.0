import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import { productsApi } from "../api";
import "./Stage11.css";

function Stage31() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleNext = () => {
    setShowModal(true);
  };

  return (
    <>
      <div className="container">
        <h1 className="title">Этап 10 - Предварительный просмотр</h1>
        <h2 className="subtitle">
          *Открывается заполненная карточка товара для просмотра*
        </h2>
      </div>

      <BottomBar
        current={11}
        total={11}
        prevPath="/stage30"
        nextPath="/stage22"
        onNext={handleNext}
      />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">
              Карточка товара отправлена на проверку
            </h2>

            <button
              type="button"
              className="modal__btn"
              disabled={busy}
              onClick={async () => {
                const productId = params.get("id");
                setBusy(true);
                try {
                  if (productId) {
                    await productsApi.submitProductReview(productId);
                  }
                  navigate("/");
                } catch (error) {
                  window.alert(
                    error.message || "Не удалось отправить на проверку",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Отправка..." : "Понятно"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Stage31;
