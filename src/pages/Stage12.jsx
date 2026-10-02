import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { productsApi } from '../api'
import './Stage12.css'

function resolveVariantFlow(product) {
    const kindCode = (product?.kindCode || '').toLowerCase()
    const categoryCode = (product?.categoryCode || '').toLowerCase()
    const path = (product?.categoryPath || '').toLowerCase()

    if (kindCode === 'other') {
        return { mode: 'custom' }
    }
    if (categoryCode === 'handpieces' || path.includes('наконечник')) {
        return { mode: 'known', label: 'Модель', axis: 'model' }
    }
    if (categoryCode === 'aerosols' || path.includes('аэрозол')) {
        return { mode: 'known', label: 'Объем', axis: 'volume' }
    }
    return { mode: 'custom' }
}

function axisValueFromVariation(variation, axis) {
    const row = (variation.values || []).find((item) => item.code === axis)
    if (!row) {
        if (axis === 'model') return (variation.model || '').trim()
        return ''
    }
    if (row.value === 'other') return (row.customValue || '').trim()
    return (row.value || '').trim()
}

function valuesFromProduct(product, axis) {
    if (!product || !axis) return []
    const seen = new Set()
    const list = []
    for (const variation of product.variations || []) {
        const text = axisValueFromVariation(variation, axis)
        if (!text || seen.has(text)) continue
        seen.add(text)
        list.push(text)
    }
    return list
}

function findVariationId(product, axis, value) {
    const target = (value || '').trim().toLowerCase()
    if (!target) return null
    for (const variation of product?.variations || []) {
        const text = axisValueFromVariation(variation, axis).toLowerCase()
        if (text === target) return variation.id
    }
    return null
}

function Stage12() {
    const navigate = useNavigate()
    const location = useLocation()
    const [params] = useSearchParams()
    const productId = params.get('id')
    const [product, setProduct] = useState(null)
    const [draft, setDraft] = useState('')
    const [values, setValues] = useState([])
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (!productId) return
        productsApi.get(productId).then((loaded) => {
            setProduct(loaded)
            const flow = resolveVariantFlow(loaded)
            if (flow.mode === 'known') {
                setValues(valuesFromProduct(loaded, flow.axis))
            }
        }).catch(() => {})
    }, [productId])

    const flow = resolveVariantFlow(product)
    const search = productId ? `?id=${productId}` : (location.search || '')

    const go = (path) => navigate({ pathname: path, search: path === '/' ? '' : search })

    const addValue = () => {
        const text = draft.trim()
        if (!text) return
        setValues((prev) => (prev.includes(text) ? prev : [...prev, text]))
        setDraft('')
    }

    const removeValue = (item) => {
        setValues((prev) => prev.filter((value) => value !== item))
    }

    const handleCancel = () => go('/stage22')

    const handleConfirm = async () => {
        if (!productId) {
            window.alert('Сначала создайте карточку на главной странице')
            return
        }
        if (busy) return

        const pending = draft.trim()
        const nextValues = [...values]
        if (pending && !nextValues.includes(pending)) nextValues.push(pending)

        if (flow.mode === 'known' && !nextValues.length) {
            window.alert(`Добавьте хотя бы одно значение для поля «${flow.label}»`)
            return
        }

        setBusy(true)
        try {
            if (pending) {
                setValues(nextValues)
                setDraft('')
            }

            sessionStorage.setItem(`variantFlow:${productId}`, 'create')
            await productsApi.saveWantsVariants(productId, { wantsVariants: true })

            let variationId = null
            let latest = product

            if (flow.mode === 'known') {
                await productsApi.saveVariantAxes(productId, { codes: [flow.axis] })
                latest = await productsApi.get(productId)

                for (const value of nextValues) {
                    const existingId = findVariationId(latest, flow.axis, value)
                    if (existingId) {
                        if (!variationId) variationId = existingId
                        continue
                    }
                    const created = await productsApi.addVariation(productId, {
                        model: flow.axis === 'model' ? value : undefined,
                        values: [{ code: flow.axis, value }],
                    })
                    if (created?.id) {
                        if (!variationId) variationId = created.id
                        latest = {
                            ...latest,
                            variations: [...(latest.variations || []), created],
                        }
                    }
                }
            }

            if (!variationId && latest) {
                variationId = (latest.variations || [])[0]?.id || null
            }

            const next = new URLSearchParams()
            next.set('id', productId)
            if (variationId) next.set('variationId', variationId)
            navigate({ pathname: '/stage7', search: `?${next.toString()}` })
        } catch (error) {
            window.alert(error.message || 'Не удалось сохранить')
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            <div className="container">
                <h1 className="title">Вариант параметра продукта</h1>

                <p className="description">
                    Вариант параметра продукта — это характеристики, по которым покупатель может выбрать один из нескольких вариантов внутри одной карточки продукта.
                </p>

                <p className="pBold">Пример вариантов параметра продукта:<br /></p>
                <img
                    src="/images/example.png"
                    alt="Вариант параметра продукта - пример"
                    className="imgOne"
                />

                {flow.mode === 'known' && (
                    <div className="stage12-values-block">
                        <h2 className="stage12-values-title">
                            Введите значение варианта параметра продукта
                        </h2>
                        <div className="stage12-values">
                            <span className="stage12-values__label">{flow.label}</span>
                            <input
                                type="text"
                                className="stage12-values__input"
                                placeholder="Введите значение"
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault()
                                        addValue()
                                    }
                                }}
                            />
                            <div className="stage12-values__chips">
                                {values.map((item) => (
                                    <span className="stage12-chip" key={item}>
                                        {item}
                                        <button
                                            type="button"
                                            className="stage12-chip__remove"
                                            onClick={() => removeValue(item)}
                                            aria-label="Удалить"
                                        >
                                            ✕
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="action-bar">
                <button
                    type="button"
                    className="action-btn action-btn--no"
                    onClick={handleCancel}
                    title="Нет"
                    disabled={busy}
                >
                    <span className="action-btn__circle">✕</span>
                </button>

                <button
                    type="button"
                    className="action-btn action-btn--yes"
                    onClick={handleConfirm}
                    title="Да"
                    disabled={busy}
                >
                    <span className="action-btn__circle">✓</span>
                </button>
            </div>
        </>
    )
}

export default Stage12
