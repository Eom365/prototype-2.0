import { useEffect, useState } from 'react'
import BottomBar from '../components/BottomBar'
import { VARIANT_FILL_STAGE_COUNT, variantFillStageHeading, variantFillStep } from '../stageProgress'
import VariationPreview from '../components/VariationPreview'
import { productsApi } from '../api'
import { sameId, useCardIds } from '../cardScope'
import {
    brandLineModelMerged,
    buildNameParts,
    composeStoredName,
    defaultFeaturesFromParts,
    hasMergedNameFeatures,
    isMergedFeatureActive,
    mergedFeatureLabel,
    normalizeNameFeatures,
    toggleNameFeature,
} from '../productName'
import './Stage6.css'

function hasExplicitNameSave(variation) {
    return variation.nameIncludesLogo ||
        variation.nameIncludesType ||
        variation.nameIncludesBrand ||
        variation.nameIncludesLine ||
        variation.nameIncludesModel
}

function Stage16() {
    const { productId, variationId } = useCardIds()
    const [productName, setProductName] = useState('')
    const [logo, setLogo] = useState(null)
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState('')
    const [features, setFeatures] = useState({
        logo: false,
        type: false,
        brand: false,
        line: false,
        model: false,
    })
    const [parts, setParts] = useState({
        type: '',
        brand: '',
        line: '',
        model: '',
    })

    useEffect(() => {
        if (!productId || !variationId) return
        productsApi.get(productId).then((product) => {
            const variation = (product.variations || []).find((item) => sameId(item.id, variationId))
            if (!variation) throw new Error('Вариация не найдена')

            const logoFile = (product.files || []).find((file) => file.role === 'logo' && sameId(file.variationId, variationId))
                || (product.files || []).find((file) => file.role === 'logo' && !file.variationId)
                || null
            const nextParts = buildNameParts(product, variation)
            const autoFeatures = defaultFeaturesFromParts(nextParts, Boolean(logoFile))
            const useSavedPreferences = Boolean(variation.fullName?.trim()) && hasExplicitNameSave(variation)
            const nextFeatures = normalizeNameFeatures(
                useSavedPreferences
                    ? {
                        logo: variation.nameIncludesLogo,
                        type: variation.nameIncludesType,
                        brand: variation.nameIncludesBrand,
                        line: variation.nameIncludesLine,
                        model: variation.nameIncludesModel,
                    }
                    : autoFeatures,
                nextParts,
            )

            setLogo(logoFile)
            setParts(nextParts)
            setFeatures(nextFeatures)
            setProductName(composeStoredName(nextParts, nextFeatures))
            setLoaded(true)
        }).catch((loadError) => setError(loadError.message))
    }, [productId, variationId])

    const composeName = (nextFeatures) => composeStoredName(parts, nextFeatures)

    const toggleFeature = (name) => {
        setFeatures((prev) => {
            const next = toggleNameFeature(prev, parts, name)
            if (name !== 'logo') setProductName(composeName(next))
            return next
        })
    }

    const save = () => {
        if (!productId) throw new Error('Сначала создайте карточку на главной странице')
        if (!variationId) throw new Error('Сначала создайте вариант на этапе 13')
        if (!loaded) throw new Error('Карточка ещё загружается, подождите секунду')
        const savedFeatures = normalizeNameFeatures(features, parts)
        return productsApi.saveVariationName(productId, variationId, {
            fullName: productName,
            nameIncludesLogo: savedFeatures.logo,
            nameIncludesType: savedFeatures.type,
            nameIncludesBrand: savedFeatures.brand,
            nameIncludesLine: savedFeatures.line,
            nameIncludesModel: savedFeatures.model,
        })
    }

    const mergedNameFeatures = hasMergedNameFeatures(parts)
    const mergedLabel = mergedFeatureLabel(parts)

    return (
        <>
            <div className="container">
                <h1 className="title">{variantFillStageHeading(16, 'Полное наименование продукта')}</h1>
                <VariationPreview stage={16} />
                {!productId && <p className="form-error">Откройте создание карточки с главной страницы.</p>}
                {productId && !variationId && <p className="form-error">Сначала создайте вариант на этапе 13.</p>}
                {error && <p className="form-error">{error}</p>}

                <div className="field">
                    <label className="label">Наименование продукта</label>
                    <div className="name-preview">
                        {features.logo && logo && (
                            <img src={logo.url} alt="Логотип" className="name-preview__logo" />
                        )}
                        <input
                            type="text"
                            className="input input--wide"
                            value={productName}
                            onChange={(event) => setProductName(event.target.value)}
                            placeholder="Логотип + тип товара + бренд + линейка + модель"
                        />
                    </div>
                </div>

                <div className="field">
                    <label className="label">
                        Характеристики, которые отображаются в наименовании продукта
                    </label>

                    <div className="feature-list">
                        <button
                            type="button"
                            className={`feature-btn ${features.logo ? 'feature-btn--active' : ''}`}
                            onClick={() => toggleFeature('logo')}
                            disabled={!logo}
                        >
                            Логотип
                        </button>
                        <button
                            type="button"
                            className={`feature-btn ${features.type ? 'feature-btn--active' : ''}`}
                            onClick={() => toggleFeature('type')}
                            disabled={!parts.type}
                        >
                            Тип товара
                        </button>
                        {mergedNameFeatures ? (
                            <button
                                type="button"
                                className={`feature-btn ${isMergedFeatureActive(features, parts) ? 'feature-btn--active' : ''}`}
                                onClick={() => toggleFeature('brand')}
                            >
                                {mergedLabel}
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className={`feature-btn ${features.brand ? 'feature-btn--active' : ''}`}
                                    onClick={() => toggleFeature('brand')}
                                    disabled={!parts.brand}
                                >
                                    Бренд
                                </button>
                                <button
                                    type="button"
                                    className={`feature-btn ${features.line ? 'feature-btn--active' : ''}`}
                                    onClick={() => toggleFeature('line')}
                                    disabled={!parts.line}
                                >
                                    Линейка
                                </button>
                            </>
                        )}
                        {!brandLineModelMerged(parts) && (
                            <button
                                type="button"
                                className={`feature-btn ${features.model ? 'feature-btn--active' : ''}`}
                                onClick={() => toggleFeature('model')}
                                disabled={!parts.model}
                            >
                                Модель
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <BottomBar current={variantFillStep(16)} total={VARIANT_FILL_STAGE_COUNT} prevPath="/stage15" nextPath="/stage18" onSave={save} />
        </>
    )
}

export default Stage16
