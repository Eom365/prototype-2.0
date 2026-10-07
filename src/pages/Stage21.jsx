import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { productsApi } from '../api'
import BottomBar from '../components/BottomBar'
import { productWizardOffset, variantFillStageHeading, variantFillStep, variantFillTotal } from '../stageProgress'
import './Stage21.css'

function Stage21() {
    const navigate = useNavigate()
    const location = useLocation()
    const [params] = useSearchParams()
    const productId = params.get('id')
    const [showModal, setShowModal] = useState(false)
    const [busy, setBusy] = useState(false)
    const offset = productWizardOffset(productId)

    const clearFlow = (id, variationId) => {
        if (id) sessionStorage.removeItem(`variantFlow:${id}`)
        if (variationId) sessionStorage.removeItem(`variantBaseline:${variationId}`)
    }

    const goStage22 = () => {
        navigate({ pathname: '/stage22', search: location.search })
    }

    const handleNext = async () => {
        if (busy) return
        setBusy(true)
        const params = new URLSearchParams(location.search)
        const id = params.get('id')
        const variationId = params.get('variationId')
        try {
            if (id && variationId) {
                const product = await productsApi.get(id)
                const variation = (product.variations || []).find(
                    (item) => String(item.id).toLowerCase() === String(variationId).toLowerCase(),
                )
                const flow = sessionStorage.getItem(`variantFlow:${id}`) || 'create'
                const baseline = sessionStorage.getItem(`variantBaseline:${variationId}`)
                const unchanged = flow === 'edit'
                    && baseline != null
                    && variation
                    && (variation.signature || '') === baseline

                if (unchanged) {
                    clearFlow(id, variationId)
                    goStage22()
                    return
                }
            }
            setShowModal(true)
        } catch (error) {
            window.alert(error.message || 'Не удалось проверить изменения')
        } finally {
            setBusy(false)
        }
    }

    const finish = async () => {
        if (busy) return
        setBusy(true)
        const params = new URLSearchParams(location.search)
        const id = params.get('id')
        const variationId = params.get('variationId')
        try {
            if (id && variationId) {
                await productsApi.submitReview(id, variationId)
            }
            clearFlow(id, variationId)
            goStage22()
        } catch (error) {
            window.alert(error.message || 'Не удалось сохранить карточку')
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            <div className="container">
                <div className="divOne">
                    <h1 className="hOne">
                        Создание варианта параметра (модели) линейки продукта
                    </h1>
                    <p>***Наименование***</p>
                </div>
                <h1 className="title">{variantFillStageHeading(21, 'Предварительный просмотр', null, productId)}</h1>
                <h2 className="subtitle">*Открывается заполненная карточка товара для просмотра*</h2>
            </div>

            <BottomBar
                current={variantFillStep(21, null, productId) + offset}
                total={variantFillTotal(null, productId) + offset}
                prevPath="/stage20"
                onNext={handleNext}
            />

            {showModal && (
                <div className="modal-overlay" onClick={() => !busy && setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal__title">
                            Карточка товара отправлена на проверку
                        </h2>

                        <button
                            type="button"
                            className="modal__btn"
                            onClick={finish}
                            disabled={busy}
                        >
                            {busy ? 'Сохранение...' : 'Понятно'}
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}

export default Stage21
