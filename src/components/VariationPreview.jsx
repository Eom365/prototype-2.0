import { useCallback, useEffect, useState } from 'react'
import { catalogApi, productsApi } from '../api'
import { composeAddress, discountsFrom, isSameCharacteristicValue, packagingFrom, pointsFrom, sameId, useCardIds } from '../cardScope'
import { CUSTOM_CODE_PREFIX, displayCustomCharacteristic } from '../customCharacteristics'
import { VARIANT_AXIS_BY_KIND } from '../variantAxes'
import './VariationPreview.css'

const documentLabels = {
    warranty: 'Гарантийный талон',
    brand: 'Бренд',
    certificate: 'Сертификат соответствия',
    declaration: 'Декларация о соответствии',
    stateRegistration: 'Свидетельство о государственной регистрации',
    registration: 'Регистрационное удостоверение',
    manual: 'Руководство по эксплуатации',
    other: 'Иной документ',
}

const packTypeLabels = {
    box: 'Коробка',
    case: 'Футляр',
    blister: 'Блистер',
}

const packMaterialLabels = {
    cardboard: 'Картон',
    plastic: 'Пластик',
    hdpe: 'Полиэтилен высокой плотности',
    nylon: 'Нейлон',
    pet: 'Полиэтилентерефталат',
    pvc: 'Поливинилхлорид',
    other: 'Иное',
}

function displayValue(field, saved, unitGroups) {
    if (!saved) return ''
    const raw = saved.value === 'other' ? (saved.customValue || '') : (saved.value || '')
    if (!raw.trim()) return ''
    const option = (field.options || []).find((item) => item.value === raw)
    const text = option ? option.label : raw
    if (!saved.unit || !field.unitGroup) return text
    const unit = (unitGroups?.[field.unitGroup] || []).find((item) => item.value === saved.unit)
    return unit ? `${text} ${unit.label}` : text
}

function valueHasContent(saved) {
    if (!saved) return false
    const raw = saved.value === 'other' ? (saved.customValue || '') : (saved.value || '')
    return Boolean(String(raw).trim())
}

function currencySymbol(currency) {
    return currency === 'CNY' ? '¥' : '₽'
}

function formatPrice(value) {
    const raw = String(value || '').trim()
    if (!raw) return ''
    const digits = raw.replace(/\s/g, '')
    if (!/^\d+([.,]\d+)?$/.test(digits)) return raw
    const [whole, fraction] = digits.split(/[.,]/)
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return fraction ? `${grouped},${fraction}` : grouped
}

function findKind(catalog, kindCode) {
    if (!catalog || !kindCode) return null
    for (const category of catalog.categories || []) {
        const kind = category.kinds.find((item) => item.code === kindCode)
        if (kind) return kind
    }
    return null
}

function baseName(product) {
    return product.fullName || product.tradeName || product.productName || 'Наименование'
}

function matchPhotoRole(file, role) {
    return file.role === role || (role === 'product' && file.role === 'presentation')
}

function variationPhotos(product, variationId, role = 'product') {
    return (product.files || [])
        .filter((file) => sameId(file.variationId, variationId) && matchPhotoRole(file, role))
        .sort((a, b) => a.sortOrder - b.sortOrder)
}

function basePhotos(product, role = 'product') {
    return (product.files || [])
        .filter((file) => !file.variationId && matchPhotoRole(file, role))
        .sort((a, b) => a.sortOrder - b.sortOrder)
}

function packMaterialText(source) {
    const material = source.packMaterial
    if (!material) return ''
    if (material === 'other') return (source.packMaterialCustom || '').trim() || packMaterialLabels.other
    return packMaterialLabels[material] || material
}

function packSizeUnitLabel(unit) {
    if (unit === 'mm') return 'Миллиметры'
    if (unit === 'sm') return 'Сантиметры'
    return ''
}

function packDimensionsText(source, { includeUnit = true } = {}) {
    const length = String(source.packLength || '').trim()
    const width = String(source.packWidth || '').trim()
    const height = String(source.packHeight || '').trim()
    if (!length && !width && !height) return ''
    const sizes = `${length || '…'} × ${width || '…'} × ${height || '…'}`
    if (!includeUnit) return sizes
    const unit = source.packSizeUnit === 'mm' ? 'мм' : 'см'
    return `${sizes} ${unit}`
}

function packagingRows(source) {
    const rows = []
    const typeLabel = packTypeLabels[source.packType]
    if (typeLabel) rows.push({ label: 'Вид упаковки', value: typeLabel })

    const material = packMaterialText(source)
    if (material) rows.push({ label: 'Материал', value: material })

    const unitLabel = packSizeUnitLabel(source.packSizeUnit)
    if (unitLabel) rows.push({ label: 'Единицы измерения', value: unitLabel })

    const dimensions = packDimensionsText(source, { includeUnit: false })
    if (dimensions) rows.push({ label: 'Размеры', value: dimensions })

    return rows
}

function packagingPhotos(product, variationId) {
    const own = variationPhotos(product, variationId, 'package')
    if (own.length) return own
    return basePhotos(product, 'package')
}

function PackagingDetails({ rows }) {
    if (!rows.length) return null
    return (
        <ul className="variation-preview__pack-params">
            {rows.map((row) => (
                <li className="variation-preview__pack-param" key={row.label}>
                    <span className="variation-preview__pack-param-label">{row.label}:</span>
                    <span className="variation-preview__pack-param-value">{row.value}</span>
                </li>
            ))}
        </ul>
    )
}

function PackagingPreview({ baseInfo, source, photos }) {
    const rows = packagingRows(source)
    return (
        <div className="variation-preview__split variation-preview__split--packaging">
            <div className="variation-preview__pack-block">
                {baseInfo}
                {rows.length > 0 ? (
                    <PackagingDetails rows={rows} />
                ) : (
                    <p className="variation-preview__empty">Упаковка не заполнена</p>
                )}
            </div>
            <PhotoStrip photos={photos} compact />
        </div>
    )
}

function axisFeatures(product, catalog) {
    const kind = findKind(catalog, product.kindCode)
    const axisCodes = product.variantAxes?.length
        ? product.variantAxes
        : (VARIANT_AXIS_BY_KIND[product.kindCode] || ['model'])
    const rows = []
    for (const code of axisCodes) {
        const field = (kind?.characteristics || []).find((item) => item.code === code)
        if (field) {
            rows.push({ key: field.code, label: field.name, field })
            continue
        }
        rows.push({
            key: code,
            label: code === 'model' ? 'Модель' : code === 'volume' ? 'Объем' : code,
            field: { code, name: code, options: [] },
        })
    }
    return rows
}

function variationAxisValue(variation, code) {
    const saved = (variation.values || []).find((item) => item.code === code)
    if (valueHasContent(saved)) return saved
    if (code === 'model' && String(variation.model || '').trim()) {
        return { value: variation.model, customValue: '', unit: null }
    }
    if (code === 'article' && String(variation.article || '').trim()) {
        return { value: variation.article, customValue: '', unit: null }
    }
    return null
}

function baseValue(product, code) {
    return (product.values || []).find((item) => item.code === code && !item.variationId)
}

function ownVariationValue(variation, product, code) {
    const saved = (variation.values || []).find((item) => item.code === code)
    if (!valueHasContent(saved)) return null
    const base = baseValue(product, code)
    if (base && isSameCharacteristicValue(saved, base)) return null
    return saved
}

function variantChips(features, variation, product, unitGroups) {
    void product
    return features.map((item) => {
        const value = variationAxisValue(variation, item.key)
        if (!value) return ''
        if (String(item.key || '').startsWith(CUSTOM_CODE_PREFIX)) {
            return displayCustomCharacteristic(value, unitGroups)
        }
        return displayValue(item.field, value, unitGroups)
    }).filter(Boolean)
}

function variantSubtitle(features, variation, product, unitGroups) {
    return variantChips(features, variation, product, unitGroups).join(', ')
}

function appendCustomSpecRows(rows, values, unitGroups) {
    for (const item of values || []) {
        if (!item.code?.startsWith(CUSTOM_CODE_PREFIX)) continue
        const text = displayCustomCharacteristic(item, unitGroups)
        if (!text) continue
        rows.push({
            label: item.value || 'Иное',
            value: text,
            code: item.code,
        })
    }
}

function baseVariantChips(features, product, unitGroups) {
    return features.map((item) => {
        const value = baseValue(product, item.key)
        if (!valueHasContent(value)) return ''
        if (String(item.key || '').startsWith(CUSTOM_CODE_PREFIX)) {
            return displayCustomCharacteristic(value, unitGroups)
        }
        return displayValue(item.field, value, unitGroups)
    }).filter(Boolean)
}

function baseProductSpecRows(product, catalog, kindCode) {
    const kind = findKind(catalog, kindCode)
    const rows = []
    for (const field of kind?.characteristics || []) {
        const value = baseValue(product, field.code)
        if (!valueHasContent(value)) continue
        const text = displayValue(field, value, catalog.unitGroups)
        if (!text) continue
        rows.push({ label: field.name, value: text, code: field.code })
    }

    appendCustomSpecRows(
        rows,
        (product.values || []).filter((item) => !item.variationId && item.code?.startsWith(CUSTOM_CODE_PREFIX)),
        catalog.unitGroups
    )

    return rows
}

function baseDocuments(product) {
    return (product.files || [])
        .filter((file) => file.role === 'document' && file.documentType && !file.variationId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((file) => documentLabels[file.documentType] || file.name)
}

function baseLogo(product) {
    return (product.files || []).find((file) => file.role === 'logo' && !file.variationId) || null
}

function allSpecRows(variation, product, catalog, kindCode) {
    const kind = findKind(catalog, kindCode)
    const rows = []
    for (const field of kind?.characteristics || []) {
        const variationValue = ownVariationValue(variation, product, field.code)
        if (!variationValue) continue
        const text = displayValue(field, variationValue, catalog.unitGroups)
        if (!text) continue
        rows.push({ label: field.name, value: text, code: field.code })
    }

    appendCustomSpecRows(
        rows,
        (variation.values || []).filter((item) => item.code?.startsWith(CUSTOM_CODE_PREFIX)),
        catalog.unitGroups
    )

    return rows
}

function variationLogo(product, variationId) {
    return (product.files || []).find((file) => file.role === 'logo' && sameId(file.variationId, variationId))
        || (product.files || []).find((file) => file.role === 'logo' && !file.variationId)
        || null
}

function variationDocuments(product, variationId) {
    return (product.files || [])
        .filter((file) => file.role === 'document' && file.documentType && sameId(file.variationId, variationId))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((file) => documentLabels[file.documentType] || file.name)
}

function loyaltyLines(product, variation) {
    const discounts = discountsFrom(product, variation.id)
    return discounts
        .filter((item) => item.enabled && (item.from || item.to || item.value))
        .map((item) => {
            const symbol = currencySymbol(variation.currency || product.currency || 'RUB')
            return `Стоимость продукта при покупке от ${item.from || '…'} до ${item.to || '…'} штук ${symbol} ${item.value || '…'}`
        })
}

function activePoints(product, variationId) {
    return pointsFrom(product, variationId)
        .filter((item) => item.active)
        .map((item) => {
            const address = item.address || composeAddress({
                name: item.name || '',
                index: item.postalCode || '',
                region: item.region || '',
                city: item.city || '',
                street: item.street || '',
                house: item.house || '',
                office: item.office || '',
            })
            const quantity = item.quantity ? `${item.quantity} штук` : ''
            return quantity ? `${address} — ${quantity}` : address
        })
        .filter(Boolean)
}

function SpecsGrid({ rows }) {
    if (!rows.length) return null
    const mid = Math.ceil(rows.length / 2)
    const columns = [rows.slice(0, mid), rows.slice(mid)]

    return (
        <div className="variation-preview__specs-grid">
            {columns.map((column, columnIndex) => (
                <div className="variation-preview__specs-col" key={columnIndex}>
                    {column.map((row) => (
                        <div className="variation-preview__spec-row" key={row.code}>
                            <span className="variation-preview__spec-label">{row.label}</span>
                            <span className="variation-preview__spec-value">{row.value}</span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}

function PhotoStrip({ photos, compact = false }) {
    const [index, setIndex] = useState(0)
    const count = photos?.length || 0
    const safe = count ? index % count : 0
    const photo = count ? photos[safe] : null
    const shift = (step) => setIndex((current) => (current + step + count) % count)

    return (
        <div className={`variation-preview__photo${compact ? ' variation-preview__photo--compact' : ''}`}>
            {count > 1 && (
                <button type="button" className="variation-preview__nav variation-preview__nav--prev" onClick={() => shift(-1)}>
                    ‹
                </button>
            )}
            <div className="variation-preview__photo-box">
                {photo ? (
                    <>
                        <img src={photo.url} alt={photo.name || 'Фото товара'} className="variation-preview__photo-img" />
                        <span className="variation-preview__star" title="Главное фото">★</span>
                    </>
                ) : (
                    <span className="variation-preview__photo-empty">＋</span>
                )}
            </div>
            {count > 1 && (
                <button type="button" className="variation-preview__nav variation-preview__nav--next" onClick={() => shift(1)}>
                    ›
                </button>
            )}
            {count > 0 && (
                <span className="variation-preview__counter">{safe + 1}/{count}</span>
            )}
        </div>
    )
}

function BaseProductInfo14({ product, features, unitGroups }) {
    const chips = baseVariantChips(features, product, unitGroups)
    const title = product.fullName || baseName(product)
    return (
        <div className="variation-preview__info">
            <div className="variation-preview__title">{title}</div>
            {chips.length > 0 && (
                <div className="variation-preview__subtitle">{chips.join(', ')}</div>
            )}
        </div>
    )
}

function BaseInfo14({ product, variation, features, unitGroups }) {
    const chips = variantChips(features, variation, product, unitGroups)
    const title = variation.fullName || baseName(product)
    return (
        <div className="variation-preview__info">
            <div className="variation-preview__title">{title}</div>
            {chips.length > 0 ? (
                <div className="variation-preview__subtitle">{chips.join(', ')}</div>
            ) : (
                !variation.fullName && (
                    <p className="variation-preview__empty">Вариант не заполнен</p>
                )
            )}
        </div>
    )
}

function CardContent({
    stage,
    product,
    variation,
    catalog,
    features,
    unitGroups,
}) {
    if (stage === 14) {
        return <BaseInfo14 product={product} variation={variation} features={features} unitGroups={unitGroups} />
    }

    if (stage === 15) {
        const rows = allSpecRows(variation, product, catalog, product.kindCode)
        return (
            <div className="variation-preview__extra variation-preview__extra--specs">
                {rows.length > 0 ? (
                    <SpecsGrid rows={rows} />
                ) : (
                    <p className="variation-preview__empty">Характеристики не заполнены</p>
                )}
            </div>
        )
    }

    if (stage === 16) {
        const logo = variationLogo(product, variation.id)
        const name = variation.fullName || baseName(product)
        return (
            <div className="variation-preview__extra variation-preview__extra--name">
                {logo && <img src={logo.url} alt="Логотип" className="variation-preview__logo" />}
                <div className="variation-preview__title">{name}</div>
            </div>
        )
    }

    const baseInfo = (
        <BaseInfo14 product={product} variation={variation} features={features} unitGroups={unitGroups} />
    )

    if (stage === 17) {
        const docs = variationDocuments(product, variation.id)
        return (
            <div className="variation-preview__split">
                {baseInfo}
                <ul className="variation-preview__list">
                    {docs.length ? docs.map((doc) => (
                        <li className="variation-preview__list-item" key={doc}>{doc}</li>
                    )) : (
                        <li className="variation-preview__list-item variation-preview__list-item--empty">Документы не добавлены</li>
                    )}
                </ul>
            </div>
        )
    }

    if (stage === 18) {
        return (
            <PackagingPreview
                baseInfo={baseInfo}
                source={packagingFrom(product, variation.id)}
                photos={packagingPhotos(product, variation.id)}
            />
        )
    }

    if (stage === 19) {
        const price = variation.price || product.price || ''
        const currency = variation.currency || product.currency || 'RUB'
        const loyalty = loyaltyLines(product, variation)
        return (
            <div className="variation-preview__split">
                {baseInfo}
                <div className="variation-preview__price-block">
                    {price ? (
                        <div className="variation-preview__price">
                            {currencySymbol(currency)}{formatPrice(price)}
                        </div>
                    ) : (
                        <div className="variation-preview__price variation-preview__price--empty">Цена не указана</div>
                    )}
                    {loyalty.map((line, index) => (
                        <div className="variation-preview__loyalty" key={index}>{line}</div>
                    ))}
                </div>
            </div>
        )
    }

    if (stage === 20) {
        const points = activePoints(product, variation.id)
        return (
            <div className="variation-preview__split">
                {baseInfo}
                <ul className="variation-preview__list">
                    {points.length ? points.map((point, index) => (
                        <li className="variation-preview__list-item" key={index}>{point}</li>
                    )) : (
                        <li className="variation-preview__list-item variation-preview__list-item--empty">Активные склады не выбраны</li>
                    )}
                </ul>
            </div>
        )
    }

    return null
}

function BaseCardContent({ stage, product, catalog, features, unitGroups }) {
    if (stage === 14) {
        return <BaseProductInfo14 product={product} features={features} unitGroups={unitGroups} />
    }

    if (stage === 15) {
        const rows = baseProductSpecRows(product, catalog, product.kindCode)
        return (
            <div className="variation-preview__extra variation-preview__extra--specs">
                {rows.length > 0 ? (
                    <SpecsGrid rows={rows} />
                ) : (
                    <p className="variation-preview__empty">Характеристики не заполнены</p>
                )}
            </div>
        )
    }

    if (stage === 16) {
        const logo = baseLogo(product)
        const name = product.fullName || baseName(product)
        return (
            <div className="variation-preview__extra variation-preview__extra--name">
                {logo && <img src={logo.url} alt="Логотип" className="variation-preview__logo" />}
                <div className="variation-preview__title">{name}</div>
            </div>
        )
    }

    const baseInfo = (
        <BaseProductInfo14 product={product} features={features} unitGroups={unitGroups} />
    )

    if (stage === 17) {
        const docs = baseDocuments(product)
        return (
            <div className="variation-preview__split">
                {baseInfo}
                <ul className="variation-preview__list">
                    {docs.length ? docs.map((doc) => (
                        <li className="variation-preview__list-item" key={doc}>{doc}</li>
                    )) : (
                        <li className="variation-preview__list-item variation-preview__list-item--empty">Документы не добавлены</li>
                    )}
                </ul>
            </div>
        )
    }

    if (stage === 18) {
        return (
            <PackagingPreview
                baseInfo={baseInfo}
                source={packagingFrom(product)}
                photos={basePhotos(product, 'package')}
            />
        )
    }

    if (stage === 19) {
        const loyalty = loyaltyLines(product, { id: null, currency: product.currency, price: product.price })
        return (
            <div className="variation-preview__split">
                {baseInfo}
                <div className="variation-preview__price-block">
                    {product.price ? (
                        <div className="variation-preview__price">
                            {currencySymbol(product.currency || 'RUB')}{formatPrice(product.price)}
                        </div>
                    ) : (
                        <div className="variation-preview__price variation-preview__price--empty">Цена не указана</div>
                    )}
                    {loyalty.map((line, index) => (
                        <div className="variation-preview__loyalty" key={index}>{line}</div>
                    ))}
                </div>
            </div>
        )
    }

    if (stage === 20) {
        const points = activePoints(product, null)
        return (
            <div className="variation-preview__split">
                {baseInfo}
                <ul className="variation-preview__list">
                    {points.length ? points.map((point, index) => (
                        <li className="variation-preview__list-item" key={index}>{point}</li>
                    )) : (
                        <li className="variation-preview__list-item variation-preview__list-item--empty">Активные склады не выбраны</li>
                    )}
                </ul>
            </div>
        )
    }

    return null
}

function VariationPreview({ stage }) {
    const { productId, variationId: activeVariationId } = useCardIds()
    const [product, setProduct] = useState(null)
    const [catalog, setCatalog] = useState(null)

    const loadProduct = useCallback(() => {
        if (!productId) return Promise.resolve()
        return productsApi.get(productId)
            .then(setProduct)
            .catch(() => setProduct(null))
    }, [productId])

    useEffect(() => {
        if (!productId) return
        Promise.all([loadProduct(), catalogApi.get()])
            .then(([, nextCatalog]) => setCatalog(nextCatalog))
            .catch(() => setCatalog(null))
    }, [productId, loadProduct])

    useEffect(() => {
        const handler = (event) => {
            if (event.detail?.productId === productId) loadProduct()
        }
        window.addEventListener('product-updated', handler)
        return () => window.removeEventListener('product-updated', handler)
    }, [productId, loadProduct])

    if (!productId || !product || !catalog) return null

    const variations = product.variations || []
    const previewVariations = variations.filter((variation) => !sameId(variation.id, activeVariationId))
    if (!previewVariations.length) return null

    const features = axisFeatures(product, catalog)
    const unitGroups = catalog.unitGroups || {}

    return (
        <div className={`variation-preview${stage === 16 ? ' variation-preview--stage-16' : ''}`}>
            <p className="variation-preview__caption">Ранее заполненные варианты</p>
            {previewVariations.map((variation) => (
                <article
                    className="variation-preview__card"
                    key={variation.id}
                >
                    {stage !== 16 && <PhotoStrip photos={variationPhotos(product, variation.id, 'product')} />}
                    <CardContent
                        stage={stage}
                        product={product}
                        variation={variation}
                        catalog={catalog}
                        features={features}
                        unitGroups={unitGroups}
                    />
                </article>
            ))}
        </div>
    )
}

export default VariationPreview
