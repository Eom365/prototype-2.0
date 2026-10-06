import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BottomBar from '../components/BottomBar'
import ExcelImportModal from '../components/ExcelImportModal'
import { productsApi } from '../api'
import { resolveVariantFlow, variantAxisFields, customAxisUnitFromProduct, skipsVariantParamStage } from '../variantFlow'
import {
    fillProgressStep,
    fillProgressTotal,
    isProductWizard,
    variantFillStageHeading,
} from '../stageProgress'
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
    const [params] = useSearchParams()
    const productId = params.get('id')
    const [product, setProduct] = useState(null)
    const [drafts, setDrafts] = useState({})
    const [busy, setBusy] = useState(false)
    const inWizard = isProductWizard(productId)
    const skipStarted = useRef(false)

    useEffect(() => {
        if (!productId) return
        productsApi.get(productId).then((loaded) => {
            setProduct(loaded)
            setDrafts({})
        }).catch(() => {})
    }, [productId])

    useEffect(() => {
        if (!productId || !product || skipStarted.current) return
        if (!skipsVariantParamStage(product)) return
        skipStarted.current = true
        let cancelled = false
        const skip = async () => {
            setBusy(true)
            try {
                sessionStorage.setItem(`variantFlow:${productId}`, 'create')
                await productsApi.saveWantsVariants(productId, { wantsVariants: true })
                const created = await productsApi.addVariation(productId, { values: [] })
                if (cancelled) return
                if (!created?.id) throw new Error('Не удалось создать новый вариант')
                const next = new URLSearchParams()
                next.set('id', productId)
                next.set('variationId', created.id)
                navigate({ pathname: '/stage7', search: `?${next.toString()}` }, { replace: true })
            } catch (error) {
                if (!cancelled) {
                    skipStarted.current = false
                    window.alert(error.message || 'Не удалось сохранить')
                }
            } finally {
                if (!cancelled) setBusy(false)
            }
        }
        skip()
        return () => {
            cancelled = true
        }
    }, [productId, product, navigate])

    const flow = resolveVariantFlow(product)
    const fields = variantAxisFields(product)

    const setDraft = (code, value) => {
        setDrafts((prev) => ({ ...prev, [code]: value }))
    }

    const save = async () => {
        if (!productId) {
            throw new Error('Сначала создайте карточку на главной странице')
        }
        if (busy) throw new Error('Сохранение уже выполняется')

        const filled = fields
            .map((field) => ({
                ...field,
                value: (drafts[field.code] || '').trim(),
            }))
            .filter((field) => field.value)

        if (flow.mode === 'known' && fields.length > 0 && filled.length !== fields.length) {
            throw new Error('Заполните значение для каждой характеристики варианта')
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
                throw new Error('Вариант с такими значениями уже есть')
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
                    throw new Error('Не удалось создать новый вариант')
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
                                unit: customAxisUnitFromProduct(product, field.code) || null,
                            }
                            : { code: field.code, value: field.value },
                    ),
                })
                variationId = created?.id || null
            }

            if (!variationId) {
                throw new Error('Не удалось создать новый вариант')
            }

            const next = new URLSearchParams()
            next.set('id', productId)
            next.set('variationId', variationId)
            navigate({ pathname: '/stage7', search: `?${next.toString()}` })
        } finally {
            setBusy(false)
        }
    }

    const title = variantFillStageHeading(12, 'Вариант параметра продукта', product, productId)

    return (
        <>
            <div className="container">
                <h1 className="title">{title}</h1>

                <p className="description">
                    Вариант параметра продукта — это характеристики, по которым покупатель может выбрать один из нескольких вариантов внутри одной карточки продукта.
                </p>
                <p className="standart">Для быстрого заполнения загрузите информацию о варианте параметра продукта через файл Excel</p>
                <div className="rry">
                <button className="ones">Заполнить вручную</button>
                <ExcelImportModal />
                </div>
                <p className="pBold">Пример вариантов параметра продукта:<br /></p>
                <img
                    src="/images/example.png"
                    alt="Вариант параметра продукта - пример"
                    className="imgOne"
                />

                {flow.mode === 'known' && fields.length > 0 && (
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

            <BottomBar
                current={fillProgressStep(12, product, productId)}
                total={fillProgressTotal(product, productId)}
                prevPath={inWizard ? '/stage3' : '/stage22'}
                onSave={save}
                onNext={() => {}}
            />
        </>
    )
}

export default Stage12
