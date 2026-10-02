import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import BottomBar from '../components/BottomBar'
import { catalogApi, productsApi } from '../api'
import { composeAddress, pointsFrom, sameId } from '../cardScope'
import { variantAxisCodesForKind } from '../variantAxes'
import './Stage13.css'

const lockedCodes = new Set(['article', 'brand', 'manufacturer', 'country'])

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

function axisKey(fields, values) {
    return fields.map((item) => {
        const value = values[item.key] || {}
        const text = value.value === 'other' ? (value.customValue || '') : (value.value || '')
        return `${item.key}=${String(text).trim().toLowerCase()}`
    }).join('|')
}

function variationSectionDone(variation, product, section) {
    if (!variation) return false
    const files = product?.files || []
    const variationId = variation.id
    switch (section) {
        case 'name':
            return true
        case 'specs':
            return Boolean(
                variation.description?.trim()
                || variation.complectation?.trim()
                || variation.applicationArea?.trim(),
            )
        case 'docs':
            return files.some((file) => sameId(file.variationId, variationId) && file.role === 'document')
        case 'pack':
            return Boolean(variation.packType?.trim())
        case 'price':
            return Boolean(variation.price?.trim())
        case 'delivery':
            return pointsFrom(product, variationId).some(
                (point) => point.active && String(point.quantity || '').trim(),
            )
        default:
            return false
    }
}

const variantSectionKeys = ['name', 'specs', 'docs', 'pack', 'price', 'delivery']

function variantSectionClass(done) {
    return `variant-card__section ${done ? 'variant-card__section--done' : 'variant-card__section--pending'}`
}

function PhotoStrip({ photos }) {
    const [index, setIndex] = useState(0)
    const count = photos?.length || 0
    const safe = count ? index % count : 0
    const photo = count ? photos[safe] : null
    const shift = (step) => setIndex((current) => (current + step + count) % count)

    return (
        <div className="product-card__col product-card__col--photo">
            {count > 1 && (
                <button type="button" className="product-card__nav product-card__nav--prev" onClick={() => shift(-1)}>
                    ‹
                </button>
            )}
            <div className="product-card__photo">
                {photo ? (
                    <img src={photo.url} alt={photo.name} className="product-card__photo-img" />
                ) : (
                    <span className="product-card__photo-btn">＋</span>
                )}
            </div>
            {count > 1 && (
                <button type="button" className="product-card__nav product-card__nav--next" onClick={() => shift(1)}>
                    ›
                </button>
            )}
            {count > 0 && (
                <span className="product-card__counter product-card__counter--right">
                    {safe + 1}/{count}
                </span>
            )}
        </div>
    )
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

function pluralPieces(count) {
    const digits = String(count || '').replace(/\s/g, '')
    if (!/^\d+$/.test(digits)) return 'штук'
    const n = Number(digits)
    const mod10 = n % 10
    const mod100 = n % 100
    if (mod10 === 1 && mod100 !== 11) return 'штука'
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'штуки'
    return 'штук'
}

function warehouseAddress(point) {
    return point.address || composeAddress({
        name: point.name || '',
        index: point.postalCode || '',
        region: point.region || '',
        city: point.city || '',
        street: point.street || '',
        house: point.house || '',
        office: point.office || '',
    })
}

function cardWarehouses(product, variationId = null) {
    return pointsFrom(product, variationId)
        .filter((item) => item.active)
        .map((item) => ({
            id: item.id,
            address: warehouseAddress(item),
            quantity: item.quantity || '',
        }))
        .filter((item) => item.address)
}

function readCard(product) {
    const photos = (product.files || [])
        .filter((file) => !file.variationId && file.role === 'product')
        .sort((a, b) => a.sortOrder - b.sortOrder)
    const article = (product.values || []).find((value) => value.code === 'article' && !value.variationId)
    return {
        name: product.fullName || product.tradeName || product.productName || 'Без названия',
        category: product.categoryName || product.kindName || '',
        line: product.productLine || '',
        article: product.internalArticle || (article?.value === 'other' ? article.customValue : article?.value) || '',
        price: product.price || '',
        currency: product.currency || 'RUB',
        photos,
        warehouses: cardWarehouses(product),
    }
}

function valueText(value) {
    if (!value) return ''
    return value.value === 'other' ? (value.customValue || '') : (value.value || '')
}

function variationArticle(variation) {
    const field = (variation?.values || []).find((item) => item.code === 'article')
    return valueText(field) || variation?.article || ''
}

function Stage13() {
    const navigate = useNavigate()
    const location = useLocation()
    const [params] = useSearchParams()
    const productId = params.get('id')

    const go = (path, variationId) => {
        const next = new URLSearchParams(location.search)
        if (variationId) next.set('variationId', variationId)
        navigate({ pathname: path, search: next.toString() })
    }

    const [selected, setSelected] = useState({})
    const [features, setFeatures] = useState([])
    const [savedByCode, setSavedByCode] = useState({})
    const [drafts, setDrafts] = useState({})
    const [unitGroups, setUnitGroups] = useState({})
    const [card, setCard] = useState(null)
    const [bundle, setBundle] = useState(null)
    const [savedRaw, setSavedRaw] = useState({})
    const [editingId, setEditingId] = useState(null)
    const [editingTarget, setEditingTarget] = useState(null)
    const [error, setError] = useState('')
    const fillCardRef = useRef(null)

    const toggleFeature = (name) => {
        setSelected((prev) => ({ ...prev, [name]: !prev[name] }))
    }

    const setDraft = (code, patch) => {
        setDrafts((prev) => ({
            ...prev,
            [code]: { value: '', customValue: '', ...(prev[code] || {}), ...patch },
        }))
    }

    useEffect(() => {
        if (!productId) return
        Promise.all([productsApi.get(productId), catalogApi.get()])
            .then(([product, catalog]) => {
                const kind = (catalog.categories || [])
                    .flatMap((category) => category.kinds)
                    .find((item) => item.code === product.kindCode)
                const allowedAxes = variantAxisCodesForKind(product.kindCode)
                const rows = []
                const saved = {}
                for (const field of kind?.characteristics || []) {
                    if (lockedCodes.has(field.code)) continue
                    if (allowedAxes && !allowedAxes.has(field.code)) continue
                    const value = (product.values || []).find((item) => item.code === field.code && !item.variationId)
                    const text = displayValue(field, value, catalog.unitGroups)
                    if (allowedAxes) {
                        rows.push({ key: field.code, label: field.name, field })
                        if (text) saved[field.code] = text
                        continue
                    }
                    if (!text) continue
                    rows.push({ key: field.code, label: field.name, field })
                    saved[field.code] = text
                }
                const raw = {}
                for (const value of product.values || []) {
                    if (!value.variationId) raw[value.code] = value
                }
                setFeatures(rows)
                setSavedByCode(saved)
                setSavedRaw(raw)
                setUnitGroups(catalog.unitGroups || {})
                setBundle(product)
                setCard(readCard(product))
                setSelected(Object.fromEntries(
                    (product.variantAxes || [])
                        .filter((code) => !lockedCodes.has(code) && rows.some((row) => row.key === code))
                        .map((code) => [code, true])
                ))
                if ((product.variations || []).length > 0 || params.get('variationId')) setShowFormCard(true)
            })
            .catch((loadError) => {
                setFeatures([])
                setError(loadError.message)
            })
    }, [productId])

    const [showFormCard, setShowFormCard] = useState(false)

    const axisCodes = () => Object.keys(selected).filter((code) => selected[code])

    const saveAxes = () => {
        if (!productId) throw new Error('Сначала создайте карточку на главной странице')
        return productsApi.saveVariantAxes(productId, { codes: axisCodes() })
    }

    const selectedFields = features.filter((item) => selected[item.key])
    const baseChips = selectedFields.map((item) => savedByCode[item.key]).filter(Boolean)

    const handleCreateVariant = async () => {
        if (!productId) {
            setError('Сначала создайте карточку на главной странице')
            return
        }
        if (selectedFields.length === 0) {
            setError('Выберите характеристики')
            return
        }
        const values = []
        for (const item of selectedFields) {
            const draft = drafts[item.key]
            if (!draft?.value) continue
            values.push({
                code: item.key,
                value: draft.value,
                customValue: draft.value === 'other' ? (draft.customValue || '') : '',
            })
        }
        const modelDraft = values.find((item) => item.code === 'model')
        const candidate = {}
        for (const item of selectedFields) {
            const draft = drafts[item.key]
            candidate[item.key] = draft?.value ? draft : (savedRaw[item.key] || { value: '' })
        }
        const candidateKey = axisKey(selectedFields, candidate)
        const baseKey = axisKey(selectedFields, savedRaw)
        const sameAsExisting = candidateKey === baseKey || (bundle?.variations || []).some((variation) => {
            const map = {}
            for (const value of variation.values || []) map[value.code] = value
            return axisKey(selectedFields, map) === candidateKey
        })
        if (sameAsExisting) {
            setError('Вариант с такими значениями характеристик уже есть')
            return
        }

        setError('')
        try {
            await saveAxes()
            const created = await productsApi.addVariation(productId, {
                model: modelDraft
                    ? (modelDraft.value === 'other' ? modelDraft.customValue : modelDraft.value)
                    : null,
                values,
            })
            await reloadProduct()
            setDrafts({})
            const next = new URLSearchParams(location.search)
            next.set('variationId', created.id)
            navigate({ pathname: '/stage13', search: next.toString() }, { replace: true })
            setEditingId(created.id)
            setEditingTarget(created.id)
            setShowFormCard(true)
            setTimeout(() => fillCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
        } catch (createError) {
            setError(createError.message || 'Не удалось создать вариант')
        }
    }

    const variations = bundle?.variations || []
    const editingBase = editingTarget === 'base'
    const requestedId = editingTarget && editingTarget !== 'base' ? editingTarget : params.get('variationId')
    const requested = variations.find((item) => item.id === requestedId) || null
    const currentVariation = editingBase ? null : (
        requested && (editingTarget === requested.id || requested.reviewStatus !== 'approved') ? requested : null
    )
    const savedCards = variations.filter((item) => item.id !== currentVariation?.id)
    const variantChips = currentVariation
        ? features.filter((item) => selected[item.key]).map((item) => {
            const value = (currentVariation.values || []).find((entry) => entry.code === item.key)
            return displayValue(item.field, value, unitGroups)
        }).filter(Boolean)
        : []
    const valueChips = (item) => {
        const seen = new Set()
        const chips = []
        const add = (text, removable) => {
            const key = String(text || '').trim().toLowerCase()
            if (!key || seen.has(key)) return
            seen.add(key)
            chips.push({ text, removable })
        }
        add(savedByCode[item.key] || '', false)
        for (const variation of variations) {
            const value = (variation.values || []).find((entry) => entry.code === item.key)
            add(displayValue(item.field, value, unitGroups), true)
        }
        return chips
    }
    const sectionsOpen = Boolean(currentVariation)
        && !editingBase
        && (currentVariation.reviewStatus !== 'approved' || editingTarget === currentVariation.id)
    const variantSections = Object.fromEntries(
        variantSectionKeys.map((key) => [key, variationSectionDone(currentVariation, bundle, key)]),
    )
    const allVariantSectionsDone = variantSectionKeys.every((key) => variantSections[key])
    const filled = currentVariation?.reviewStatus === 'pending'
        || currentVariation?.reviewStatus === 'approved'
        || allVariantSectionsDone

    const reloadProduct = async () => {
        const product = await productsApi.get(productId)
        setBundle(product)
        setCard(readCard(product))
    }

    const confirmVariant = async () => {
        if (!productId || !currentVariation) return
        const unchanged = currentVariation.reviewStatus === 'approved'
            && currentVariation.signature
            && currentVariation.signature === currentVariation.approvedSignature
        setError('')
        try {
            if (!unchanged) await productsApi.submitReview(productId, currentVariation.id)
            setEditingId(null)
            await reloadProduct()
        } catch (confirmError) {
            setError(confirmError.message)
        }
    }

    const deleteVariant = async (variation) => {
        const target = variation || currentVariation
        if (!productId || !target) return
        if (!window.confirm('Удалить этот вариант?')) return
        setError('')
        try {
            await productsApi.deleteVariation(productId, target.id)
            if (editingTarget === target.id) setEditingTarget(null)
            setEditingId(null)
            await reloadProduct()
        } catch (deleteError) {
            setError(deleteError.message)
        }
    }

    const removeCharacteristicValue = async (code, text) => {
        if (!window.confirm('Если удалить эту характеристику, то удалятся все карточки которые были созданы с этой характеристикой')) return
        const field = features.find((item) => item.key === code)?.field
        const victims = variations.filter((variation) => {
            const value = (variation.values || []).find((item) => item.code === code)
            return displayValue(field, value, unitGroups).trim().toLowerCase() === text.trim().toLowerCase()
        })
        setError('')
        try {
            for (const variation of victims) {
                await productsApi.deleteVariation(productId, variation.id)
            }
            if (victims.some((item) => item.id === editingTarget)) setEditingTarget(null)
            setEditingId(null)
            await reloadProduct()
        } catch (removeError) {
            setError(removeError.message)
        }
    }

    const cancelVariant = async () => {
        if (!currentVariation) return
        if (currentVariation.reviewStatus === 'approved') {
            setEditingId(null)
            return
        }
        if (!window.confirm('Удалить этот вариант?')) return
        setError('')
        try {
            await productsApi.deleteVariation(productId, currentVariation.id)
            setEditingId(null)
            setShowFormCard(false)
            await reloadProduct()
        } catch (cancelError) {
            setError(cancelError.message)
        }
    }

    const editBase = () => {
        setEditingTarget('base')
        setEditingId(null)
        setTimeout(() => fillCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
    }

    const editVariant = (variation) => {
        const target = variation || currentVariation
        if (!target) return
        const next = new URLSearchParams(location.search)
        next.set('variationId', target.id)
        navigate({ pathname: '/stage13', search: next.toString() }, { replace: true })
        setEditingTarget(target.id)
        setEditingId(target.id)
        setShowFormCard(true)
        setTimeout(() => fillCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
    }

    const goBase = (path) => {
        const next = new URLSearchParams(location.search)
        next.delete('variationId')
        navigate({ pathname: path, search: next.toString() })
    }

    return (
        <>
            <div className="container">
                <h1 className="title">
                    Создание варианта параметра продукта
                    <span className="info-icon" title="Подсказка">?</span>
                </h1>
                <p className="section-description standart">
                    Вариант параметра продукта позволяет объединить продукты одной линейки, у которых меняются определенные характеристики (модель, объём памяти, цвет).
                </p>
                <p className="pBold">Пример правильного заполнения:<br /></p>
                <img
                    src="/images/productParameterOption.png"
                    alt="Пример: одно изделие — стоматологический наконечник"
                    className="imgTwo"
                />
                <p className="variants-title two">
                    Выберите варианты параметра продукта:
                </p>
                {error && <p className="form-error">{error}</p>}

                {features.length === 0 && (
                    <p className="description">
                        Заполненных характеристик пока нет. Они появятся здесь после этапа 5.
                    </p>
                )}

                <div className="feature-list">
                    {features.map((f) => (
                        <label className="feature-item" key={f.key}>
                            <span
                                className={`checkbox ${selected[f.key] ? 'checkbox--checked' : ''}`}
                            >
                                {selected[f.key] && (
                                    <svg
                                        className="checkbox__tick"
                                        width="22"
                                        height="22"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M5 12.5L10 17.5L19 7"
                                            stroke="white"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </span>

                            <input
                                type="checkbox"
                                checked={selected[f.key]}
                                onChange={() => toggleFeature(f.key)}
                                className="feature-item__input"
                            />

                            <span className="feature-item__label">{f.label}</span>
                            <span className="info-icon" title="Подсказка">?</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="variants-section">
                <h2 className="variants-title two">
                    Введите значение варианта параметра продукта
                    <span className="info-icon" title="Подсказка">?</span>
                </h2>

                {selectedFields.length === 0 ? (
                    <p className="variants-description">Выберите характеристики</p>
                ) : (
                    <div className="variants-table">
                        {selectedFields.map((item) => {
                            const draft = drafts[item.key] || { value: '', customValue: '' }
                            const field = item.field
                            return (
                                <div className="variant-row" key={item.key}>
                                    <span className="variant-row__name">{item.label}</span>

                                    {field.inputType === 'choice' && draft.value === 'other' ? (
                                        <input
                                            type="text"
                                            className="variant-row__input"
                                            placeholder="Введите своё значение"
                                            value={draft.customValue}
                                            onChange={(event) => setDraft(item.key, { customValue: event.target.value })}
                                        />
                                    ) : field.inputType === 'choice' ? (
                                        <select
                                            className="variant-row__select"
                                            value={draft.value}
                                            onChange={(event) => setDraft(item.key, { value: event.target.value, customValue: '' })}
                                        >
                                            <option value=""></option>
                                            {(field.options || []).map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                            {field.allowCustom && <option value="other">Иное</option>}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            className="variant-row__input"
                                            placeholder="Введите значение"
                                            value={draft.value}
                                            onChange={(event) => setDraft(item.key, { value: event.target.value })}
                                        />
                                    )}

                                    <div className="variant-chips">
                                        {valueChips(item).map((chip) => (
                                            <div className="variant-chip" key={chip.text}>
                                                <span>{chip.text}</span>
                                                {chip.removable ? (
                                                    <button
                                                        type="button"
                                                        className="variant-chip__remove"
                                                        title="Удалить"
                                                        onClick={() => removeCharacteristicValue(item.key, chip.text)}
                                                    >
                                                        ✕
                                                    </button>
                                                ) : (
                                                    <span className="variant-chip__info" title="Ранее сохранённое">?</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {error && <p className="form-error">{error}</p>}
                <div className="variants-actions">
                    <button
                        type="button"
                        className="action-primary"
                        onClick={handleCreateVariant}
                    >
                        Создать вариант параметра продукта
                        <span className="info-icon info-icon--white" title="Подсказка">?</span>
                    </button>

                    <div className="variants-actions__row">
                        <button type="button" className="action-secondary">
                            Скачать шаблон Excel
                            <span className="info-icon" title="Подсказка">?</span>
                        </button>
                        <button type="button" className="action-secondary">
                            Загрузить шаблон Excel
                            <span className="info-icon" title="Подсказка">?</span>
                        </button>
                    </div>
                </div>

                {/* ===== ОДНА готовая карточка ===== */}
                <div className="variants-preview">
                    <h2 className="variants-preview__title two">
                        Варианты параметра продукта
                        <span className="info-icon" title="Подсказка">?</span>
                    </h2>

                    {card && !editingBase && (
                        <div className="product-card">
                            <div className="product-card__chips">
                                {baseChips.map((chip) => (
                                    <span className="product-card__chip" key={chip}>
                                        {chip}
                                    </span>
                                ))}
                            </div>

                            <div className="product-card__body">
                                <div className="product-card__col product-card__col--status">
                                    <div className="product-card__status-row">
                                        <span className="product-card__status-label">Активна</span>

                                        <button
                                            type="button"
                                            className="toggle toggle--on"
                                            title="Выключить"
                                        >
                                            <span className="toggle__knob" />
                                        </button>

                                        <button type="button" className="product-card__edit" title="Редактировать" onClick={editBase}>
                                            ✎
                                        </button>

                                        <button type="button" className="product-card__delete" title="Удалить">
                                            ✕
                                        </button>
                                    </div>

                                    <button type="button" className="product-card__preview-link">
                                        Посмотреть карточку товара ›
                                    </button>
                                </div>

                                <PhotoStrip photos={card.photos} />

                                <div className="product-card__col product-card__col--info">
                                    <h3 className="product-card__name">{card.name}</h3>
                                    {card.category && <p className="product-card__desc">{card.category}</p>}
                                    {card.line && <p className="product-card__line">{card.line}</p>}
                                    {card.article && (
                                        <div className="product-card__article-row">
                                            <span className="product-card__article">{card.article}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="product-card__col product-card__col--address">
                                    {card.warehouses?.length ? (
                                        card.warehouses.map((warehouse) => (
                                            <div className="product-card__warehouse" key={warehouse.id || warehouse.address}>
                                                <p className="product-card__address">
                                                    <span className="product-card__bullet">●</span>
                                                    {warehouse.address}
                                                </p>
                                                {warehouse.quantity && (
                                                    <p className="product-card__quantity">
                                                        Количество - {warehouse.quantity} {pluralPieces(warehouse.quantity)}.
                                                    </p>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="product-card__address">Склад не указан</p>
                                    )}
                                </div>

                                <div className="product-card__col product-card__col--price">
                                    {card.price && (
                                        <>
                                            <span className="product-card__price-symbol">{currencySymbol(card.currency)}</span>
                                            <span className="product-card__price-value">{formatPrice(card.price)}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {editingBase && (
                        <div id="variant-fill-card" ref={fillCardRef} className="variant-card variant-card--completed">
                            <div className="variant-card__header">
                                <span className="variant-card__status">Заполнена</span>
                                {baseChips.map((chip) => (
                                    <span className="variant-card__chip" key={chip}>{chip}</span>
                                ))}
                            </div>
                            <div className="variant-card__body">
                                <div className="variant-card__photo">
                                    <button type="button" className="variant-card__photo-btn" title="Фотографии" onClick={() => goBase('/stage4')}>＋</button>
                                </div>
                                <div className="variant-card__sections">
                                    <div className="variant-card__col">
                                        <button type="button" className="variant-card__section variant-card__section--pending" onClick={() => goBase('/stage6')}>
                                            Наименование и категория <span className="variant-card__arrow">›</span>
                                        </button>
                                        <button type="button" className="variant-card__section variant-card__section--pending" onClick={() => goBase('/stage5')}>
                                            Характеристики <span className="variant-card__arrow">›</span>
                                        </button>
                                        <button type="button" className="variant-card__section variant-card__section--pending" onClick={() => goBase('/stage7')}>
                                            Документы <span className="variant-card__arrow">›</span>
                                        </button>
                                        <button type="button" className="variant-card__section variant-card__section--pending" onClick={() => goBase('/stage8')}>
                                            Упаковка <span className="variant-card__arrow">›</span>
                                        </button>
                                    </div>
                                    <div className="variant-card__col">
                                        <button type="button" className="variant-card__section variant-card__section--pending" onClick={() => goBase('/stage9')}>
                                            Стоимость / Лояльность <span className="variant-card__arrow">›</span>
                                        </button>
                                        <button type="button" className="variant-card__section variant-card__section--pending" onClick={() => goBase('/stage10')}>
                                            Доставка <span className="variant-card__arrow">›</span>
                                            {card?.warehouses?.length > 0 && (
                                                <span className="variant-card__address">
                                                    {card.warehouses.map((warehouse) => warehouse.address).join('; ')}
                                                </span>
                                            )}
                                        </button>
                                        <button type="button" className="variant-card__section variant-card__section--preview">
                                            Посмотреть, как карточка товара будет выглядеть на сайте
                                            <span className="variant-card__arrow">›</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="variant-card__decide">
                                <button type="button" className="decide decide--no" onClick={() => setEditingTarget(null)} title="Закрыть">✕</button>
                                <button type="button" className="decide decide--yes" onClick={() => setEditingTarget(null)} title="Закрыть">✓</button>
                            </div>
                        </div>
                    )}
                </div>

                {savedCards.map((variation) => {
                    const chips = features.filter((item) => selected[item.key]).map((item) => {
                        const value = (variation.values || []).find((entry) => entry.code === item.key)
                        return displayValue(item.field, value, unitGroups)
                    }).filter(Boolean)
                    const warehouses = cardWarehouses(bundle, variation.id)
                    const article = variationArticle(variation)
                    return (
                        <div className="product-card" key={variation.id}>
                            <div className="product-card__chips">
                                {chips.map((chip) => (
                                    <span className="product-card__chip" key={chip}>{chip}</span>
                                ))}
                            </div>
                            <div className="product-card__body">
                                <div className="product-card__col product-card__col--status">
                                    <div className="product-card__status-row">
                                        <span className="product-card__status-label">Активна</span>
                                        <button type="button" className="toggle toggle--on" title="Выключить">
                                            <span className="toggle__knob" />
                                        </button>
                                        <button type="button" className="product-card__edit" title="Редактировать" onClick={() => editVariant(variation)}>
                                            ✎
                                        </button>
                                        <button type="button" className="product-card__delete" title="Удалить" onClick={() => deleteVariant(variation)}>
                                            ✕
                                        </button>
                                    </div>
                                    <button type="button" className="product-card__preview-link">
                                        Посмотреть карточку товара ›
                                    </button>
                                </div>
                                <PhotoStrip photos={(bundle.files || []).filter((file) => sameId(file.variationId, variation.id) && (file.role === 'presentation' || file.role === 'product'))} />
                                <div className="product-card__col product-card__col--info">
                                    <h3 className="product-card__name">{variation.fullName || card?.name}</h3>
                                    {card?.category && <p className="product-card__desc">{card.category}</p>}
                                    {card?.line && <p className="product-card__line">{card.line}</p>}
                                    {article && (
                                        <div className="product-card__article-row">
                                            <span className="product-card__article">{article}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="product-card__col product-card__col--address">
                                    {warehouses.length ? (
                                        warehouses.map((warehouse) => (
                                            <div className="product-card__warehouse" key={warehouse.id || warehouse.address}>
                                                <p className="product-card__address">
                                                    <span className="product-card__bullet">●</span>
                                                    {warehouse.address}
                                                </p>
                                                {warehouse.quantity && (
                                                    <p className="product-card__quantity">
                                                        Количество - {warehouse.quantity} {pluralPieces(warehouse.quantity)}.
                                                    </p>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="product-card__address">Склад не указан</p>
                                    )}
                                </div>
                                <div className="product-card__col product-card__col--price">
                                    {variation.price && (
                                        <>
                                            <span className="product-card__price-symbol">{currencySymbol(variation.currency)}</span>
                                            <span className="product-card__price-value">{formatPrice(variation.price)}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}

               
                {sectionsOpen && (
                    <p className="variants-title two">
                        Заполните вариант параметра продукта:
                    </p>
                )}

                {sectionsOpen && (
                    <div
                        id="variant-fill-card"
                        ref={fillCardRef}
                        className={`variant-card ${filled ? 'variant-card--completed' : ''}`}
                    >
                        <div className="variant-card__header">
                            <span className="variant-card__status">
                                {currentVariation.reviewStatus === 'pending'
                                    ? 'На проверке'
                                    : (filled ? 'Заполнена' : 'Ожидает заполнения')}
                            </span>

                            {variantChips.map((chip) => (
                                <span className="variant-card__chip" key={chip}>
                                    {chip}
                                </span>
                            ))}
                        </div>

                        <div className="variant-card__body">
                            <div className="variant-card__photo">
                                <button
                                    type="button"
                                    className="variant-card__photo-btn"
                                    title="Добавить фото"
                                    onClick={() => go('/stage14', currentVariation.id)}
                                >
                                    ＋
                                </button>
                            </div>

                            <div className="variant-card__sections">
                                <div className="variant-card__col">
                                    <button
                                        type="button"
                                        className={variantSectionClass(variantSections.name)}
                                        onClick={() => go('/stage14', currentVariation.id)}
                                    >
                                        Наименование и категория <span className="variant-card__arrow">›</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={variantSectionClass(variantSections.specs)}
                                        onClick={() => go('/stage15', currentVariation.id)}
                                    >
                                        Характеристики <span className="variant-card__arrow">›</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={variantSectionClass(variantSections.docs)}
                                        onClick={() => go('/stage17', currentVariation.id)}
                                    >
                                        Документы <span className="variant-card__arrow">›</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={variantSectionClass(variantSections.pack)}
                                        onClick={() => go('/stage18', currentVariation.id)}
                                    >
                                        Упаковка <span className="variant-card__arrow">›</span>
                                    </button>
                                </div>

                                <div className="variant-card__col">
                                    <button
                                        type="button"
                                        className={variantSectionClass(variantSections.price)}
                                        onClick={() => go('/stage19', currentVariation.id)}
                                    >
                                        Стоимость / Лояльность <span className="variant-card__arrow">›</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={variantSectionClass(variantSections.delivery)}
                                        onClick={() => go('/stage20', currentVariation.id)}
                                    >
                                        Доставка <span className="variant-card__arrow">›</span>
                                    </button>
                                    <button type="button" className="variant-card__section variant-card__section--preview">
                                        Посмотреть, как карточка товара будет выглядеть на сайте
                                        <span className="variant-card__arrow">›</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        {filled && currentVariation.reviewStatus !== 'pending' && (
                            <div className="variant-card__decide">
                                <button type="button" className="decide decide--no" onClick={cancelVariant} title="Отмена">
                                    ✕
                                </button>
                                <button type="button" className="decide decide--yes" onClick={confirmVariant} title="На проверку">
                                    ✓
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <BottomBar showStep={false} prevPath="/stage12" nextPath="/stage14" onSave={saveAxes} />
        </>
    )
}

export default Stage13