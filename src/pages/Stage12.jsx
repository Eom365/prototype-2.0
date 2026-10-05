import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { productsApi } from '../api'
import { resolveVariantFlow, variantAxisFields } from '../variantFlow'
import './Stage12.css'

function axisValueFromVariation(variation, axis) {
    const row = (variation.values || []).find((item) => item.code === axis)
    if (!row) {
        if (axis === 'model') return (variation.model || '').trim()
        return ''
    }
    if (String(axis || '').startsWith('custom:')) {
        return (row.customValue || '').trim()
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

function Stage12() {
    const navigate = useNavigate()
    const location = useLocation()
    const [params] = useSearchParams()
    const productId = params.get('id')
    const [product, setProduct] = useState(null)
    const [drafts, setDrafts] = useState({})
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (!productId) return
        productsApi.get(productId).then((loaded) => {
            setProduct(loaded)
            setDrafts({})
        }).catch(() => {})
    }, [productId])

    const flow = resolveVariantFlow(product)
    const fields = variantAxisFields(product)
    const search = productId ? `?id=${productId}` : (location.search || '')

    const go = (path) => navigate({ pathname: path, search: path === '/' ? '' : search })

    const setDraft = (code, value) => {
        setDrafts((prev) => ({ ...prev, [code]: value }))
    }

    const handleCancel = () => go('/stage22')

    const handleConfirm = async () => {
        if (!productId) {
            window.alert('Сначала создайте карточку на главной странице')
            return
        }
        if (busy) return

        const filled = fields
            .map((field) => ({
                ...field,
                value: (drafts[field.code] || '').trim(),
            }))
            .filter((field) => field.value)

        if (flow.mode === 'known' && filled.length !== fields.length) {
            window.alert('Заполните значение для каждой характеристики варианта')
            return
        }

        if (fields.length) {
            const signature = (variation) =>
                fields
                    .map((field) => axisValueFromVariation(variation, field.code).toLowerCase())
                    .join('|')
            const nextSignature = filled.map((field) => field.value.toLowerCase()).join('|')
            const duplicate = (product?.variations || []).some(
                (variation) => signature(variation) === nextSignature,
            )
            if (duplicate) {
                window.alert('Вариант с такими значениями уже есть')
                return
            }
        }

        setBusy(true)
        try {
            sessionStorage.setItem(`variantFlow:${productId}`, 'create')
            await productsApi.saveWantsVariants(productId, { wantsVariants: true })

            let variationId = null

            if (flow.mode === 'custom') {
                const created = await productsApi.addVariation(productId, { values: [] })
                if (!created?.id) {
                    window.alert('Не удалось создать новый вариант')
                    return
                }
                variationId = created.id
            } else if (flow.mode === 'known') {
                if (!flow.stabilized && !(product?.variantAxes || []).length) {
                    await productsApi.saveVariantAxes(productId, { codes: fields.map((field) => field.code) })
                }
                const created = await productsApi.addVariation(productId, {
                    model: filled.find((field) => field.code === 'model')?.value,
                    values: filled.map((field) =>
                        String(field.code).startsWith('custom:')
                            ? {
                                code: field.code,
                                value: field.label,
                                customValue: field.value,
                            }
                            : { code: field.code, value: field.value },
                    ),
                })
                variationId = created?.id || null
            }

            if (!variationId) {
                window.alert('Не удалось создать новый вариант')
                return
            }

            const next = new URLSearchParams()
            next.set('id', productId)
            next.set('variationId', variationId)
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
                        {fields.map((field) => (
                            <div className="stage12-values" key={field.code}>
                                <span className="stage12-values__label">{field.label}</span>
                                <input
                                    type="text"
                                    className="stage12-values__input"
                                    placeholder="Введите значение"
                                    value={drafts[field.code] || ''}
                                    onChange={(event) => setDraft(field.code, event.target.value)}
                                />
                                <div className="stage12-values__chips">
                                    {valuesFromProduct(product, field.code).map((item) => (
                                        <span className="stage12-chip stage12-chip--saved" key={`${field.code}-${item}`}>
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
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
