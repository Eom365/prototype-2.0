import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import VariantFlowHeader from "../components/VariantFlowHeader";
import { productsApi } from "../api";
import {
  CUSTOM_VARIANT_FILL_STAGE_COUNT,
  productWizardOffset,
  variantFillStageHeading,
  variantFillStep,
} from "../stageProgress";
import "./Stage11.css";

function Stage31() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const productId = params.get("id");
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const offset = productWizardOffset(productId);

  const handleNext = () => {
    setShowModal(true);
  };

  return (
    <>
      <div className="container">
        <VariantFlowHeader productId={productId} />
        <h1 className="title">
          {variantFillStageHeading(31, "Предварительный просмотр", null, productId)}
        </h1>
        <h2 className="subtitle">
          *Открывается заполненная карточка товара для просмотра*
        </h2>
      </div>

      <BottomBar
        current={variantFillStep(31) + offset}
        total={CUSTOM_VARIANT_FILL_STAGE_COUNT + offset}
        prevPath="/stage30"
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
                setBusy(true);
                try {
                  const variationId = params.get("variationId");
                  if (productId && variationId) {
                    await productsApi.submitReview(productId, variationId);
                  }
                  navigate({
                    pathname: "/stage22",
                    search: productId ? `?id=${productId}` : "",
                  });
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
