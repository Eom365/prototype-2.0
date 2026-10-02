import BottomBar from '../components/BottomBar'
import { VARIANT_FILL_STAGE_COUNT, variantFillStageHeading, variantFillStep } from '../stageProgress'
import PhotoGallery from '../components/PhotoGallery'
import VariationPreview from '../components/VariationPreview'
import { useCardIds } from '../cardScope'
import './Stage3.css'

function Stage14() {
    const { productId, variationId } = useCardIds()

    return (
        <>
            <div className="container">
                <h1 className="title">{variantFillStageHeading(14, 'Фотографии продукта')}</h1>
                <h2 className="subtitle">Добавьте фотографии продукта</h2>
                <p className="section-description">
                    Загрузите изображения, которые соответствуют внешнему виду варианта параметра продукта.
                </p>
                <p className="pBold standartOne">Фон: продукт на фотографии должен быть на белом фоне.<br /> Ракурс: продукт должен занимать 2/3 изображения.</p>
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

                {variationId && <VariationPreview stage={14} />}

                {!productId && <p className="form-error">Откройте создание карточки с главной страницы.</p>}
                {productId && !variationId && (
                    <PhotoGallery productId={productId} role="product" />
                )}
                {productId && variationId && (
                    <PhotoGallery
                        key={variationId}
                        productId={productId}
                        role="product"
                        variationId={variationId}
                    />
                )}
            </div>

            <BottomBar
                current={variantFillStep(14)}
                total={VARIANT_FILL_STAGE_COUNT}
                prevPath="/stage7"
                nextPath="/stage23"
            />
        </>
    )
}

export default Stage14
