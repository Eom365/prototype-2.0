import { useEffect, useRef, useState } from 'react'
import BottomBar from '../components/BottomBar'
import { VARIANT_FILL_STAGE_COUNT, variantFillStageHeading, variantFillStep } from '../stageProgress'
import CustomCharacteristicsBlock from '../components/CustomCharacteristicsBlock'
import DimensionsGroup from '../components/DimensionsGroup'
import VariationPreview from '../components/VariationPreview'
import { catalogApi, productsApi } from '../api'
import { useCardIds, variationSpecsFrom } from '../cardScope'
import { customRowsFromValues, normalizeCustomRows, serializeCustomRows } from '../customCharacteristics'
import { emptyDescriptionForm, parseDescriptionForm, serializeDescriptionForm } from '../descriptionForm'
import { DIMENSION_CODES } from '../productSpecs'
import Stage5Description from './Stage5Description'
import './Stage5.css'

const defaultUnits = {
    weight: 'gram',
    tolerance: 'gram',
    dimension: 'millimeters',
}

function findKind(catalog, kindCode) {
    if (!catalog || !kindCode) return null
    for (const category of catalog.categories) {
        const kind = category.kinds.find((item) => item.code === kindCode)
        if (kind) return kind
    }
    return null
}

function Stage15() {
    const { productId, variationId } = useCardIds()
    const [catalog, setCatalog] = useState(null)
    const [kindCode, setKindCode] = useState('')
    const [descriptionForm, setDescriptionForm] = useState(emptyDescriptionForm)
    const [specs, setSpecs] = useState({})
    const [customRows, setCustomRows] = useState(() => normalizeCustomRows([]))
    const [productLine, setProductLine] = useState('')
    const [logo, setLogo] = useState(null)
    const [error, setError] = useState('')
    const [loaded, setLoaded] = useState(false)
    const logoInputRef = useRef(null)

    useEffect(() => {
        catalogApi.get().then(setCatalog).catch((loadError) => setError(loadError.message))
    }, [])

    useEffect(() => {
        if (!productId || !variationId || !catalog) return
        productsApi.get(productId).then((product) => {
            const variation = (product.variations || []).find((item) => item.id === variationId)
            if (!variation) throw new Error('Вариация не найдена')

            setKindCode(product.kindCode || '')
            setProductLine(product.productLine || '')
            setDescriptionForm(parseDescriptionForm({
                description: variation.description,
                complectation: variation.complectation,
                applicationArea: variation.applicationArea,
                storageConditions: variation.storageConditions,
                precautions: variation.precautions,
            }))

            const kind = findKind(catalog, product.kindCode)
            setSpecs(variationSpecsFrom(product, variation, kind?.characteristics || [], defaultUnits))
            setCustomRows(normalizeCustomRows(
                customRowsFromValues(variation.values, { variationId }, catalog.unitGroups)
            ))
            setLogo(
                (product.files || []).find((file) => file.role === 'logo' && file.variationId === variationId)
                || (product.files || []).find((file) => file.role === 'logo' && !file.variationId)
                || null,
            )
            setLoaded(true)
        }).catch((loadError) => setError(loadError.message))
    }, [productId, variationId, catalog])

    const kind = findKind(catalog, kindCode)
    const groups = []
    for (const field of kind?.characteristics || []) {
        let group = groups.find((item) => item.name === field.group)
        if (!group) {
            group = { name: field.group, fields: [] }
            groups.push(group)
        }
        group.fields.push(field)
    }

    const updateSpec = (code, patch) => {
        setSpecs((prev) => {
            const next = {
                ...prev,
                [code]: { ...(prev[code] || { value: '', customValue: '', unit: '' }), ...patch },
            }
            if (code === 'light' && patch.value === 'no') {
                next.lightSource = { ...(prev.lightSource || { value: '', customValue: '', unit: '' }), value: '', customValue: '' }
            }
            return next
        })
    }

    const handleLogoChange = async (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file || !productId || !variationId) return
        const formData = new FormData()
        formData.append('file', file)
        formData.append('role', 'logo')
        formData.append('variationId', variationId)
        setError('')
        try {
            const saved = await productsApi.upload(productId, formData)
            setLogo(saved)
        } catch (uploadError) {
            setError(uploadError.message)
        }
    }

    const handleLogoRemove = async () => {
        if (!logo) return
        setError('')
        try {
            await productsApi.deleteFile(logo.id)
            setLogo(null)
        } catch (removeError) {
            setError(removeError.message)
        }
    }

    const save = async () => {
        if (!productId) throw new Error('Сначала создайте карточку на главной странице')
        if (!variationId) throw new Error('Сначала создайте вариант на этапе 13')
        if (!loaded) throw new Error('Карточка ещё загружается, подождите секунду')
        const product = await productsApi.get(productId)
        await productsApi.saveCategory(productId, {
            purpose: product.purpose || '',
            kindCode: product.kindCode || '',
            productName: product.productName || '',
            categoryPath: product.categoryPath || '',
            productLine: productLine.trim(),
        })
        await productsApi.saveVariationDescription(productId, variationId, serializeDescriptionForm(descriptionForm))
        const values = [
            ...Object.entries(specs).map(([code, value]) => ({
                code,
                value: value.value,
                customValue: value.customValue,
                unit: value.unit || null,
            })),
            ...serializeCustomRows(customRows),
        ]
        await productsApi.saveVariationCharacteristics(productId, variationId, { values })
    }

    return (
        <>
            <div className="container">
                <div className="descriptionN">
                <h1 className="title">{variantFillStageHeading(15, 'Описание и характеристики продукта')}</h1>
                <VariationPreview stage={15} />
                <h2 className="subtitleOne">Введите описание товара:</h2>
                {!productId && <p className="form-error">Откройте создание карточки с главной страницы.</p>}
                {productId && !variationId && <p className="form-error">Сначала создайте вариант на этапе 13.</p>}
                {error && <p className="form-error">{error}</p>}

                <Stage5Description
                    form={descriptionForm}
                    onChange={(section, value) => setDescriptionForm((prev) => ({ ...prev, [section]: value }))}
                />
                <button
                    type="button"
                    className="descriptionN__save"
                    onClick={async () => {
                        if (!productId) return
                        await productsApi.saveDescription(
                            productId,
                            serializeDescriptionForm(descriptionForm)
                        )
                        setDescriptionSaved(true)
                        setTimeout(() => setDescriptionSaved(false), 2000)
                    }}
                >
                    Сохранить описание
                </button>
                </div>

                <h2 className="subtitleOne subtitle--spaced">Заполните характеристики продукта:</h2>
                {!kind && <p className="paragraph">Сначала выберите вид продукта на этапе 2. От него зависит набор характеристик.</p>}

                <div className="form">
                    <input
                        type="file"
                        accept="image/*"
                        ref={logoInputRef}
                        onChange={handleLogoChange}
                        style={{ display: 'none' }}
                    />

                    {groups.map((group) => (
                        <div key={group.name}>
                            <h3 className="subtitle subtitle--spaced">{group.name}</h3>
                            {group.name === 'Габариты' && (
                                <DimensionsGroup
                                    fields={group.fields}
                                    specs={specs}
                                    unitOptions={catalog?.unitGroups?.dimension || []}
                                    onChange={updateSpec}
                                />
                            )}
                            {group.name === 'Производитель' && (
                                <>
                                <div className="field-row">
                                    <span className="info-icon" title="Подсказка">ⓘ</span>
                                    <span className="required-mark-slot" aria-hidden="true" />
                                    <span className="field-name">Логотип</span>
                                    {logo ? (
                                        <div className="field-input field-input--file field-input--has-file">
                                            <img src={logo.url} alt="Логотип" className="file-preview" />
                                            <span className="file-text">{logo.name}</span>
                                            <button type="button" className="file-remove" onClick={handleLogoRemove} title="Удалить">
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <button type="button" className="field-input field-input--file" onClick={() => logoInputRef.current?.click()}>
                                            <span className="file-icon">📎</span>
                                            <span className="file-text">Загрузить фотографию</span>
                                        </button>
                                    )}
                                </div>
                                <div className="field-row product-line-row">
                                    <span className="info-icon" title="Подсказка">ⓘ</span>
                                    <span className="required-mark-slot" aria-hidden="true" />
                                    <span className="field-name">Линейка продукции</span>
                                    <div className="product-line-control">
                                        <input
                                            type="text"
                                            className="field-input"
                                            placeholder="Линейка продукции"
                                            value={productLine}
                                            onChange={(event) => setProductLine(event.target.value)}
                                        />
                                    </div>
                                </div>
                                </>
                            )}
                            {group.fields
                                .filter((field) => !(field.code === 'lightSource' && specs.light?.value === 'no'))
                                .filter((field) => group.name !== 'Габариты' || !DIMENSION_CODES.includes(field.code))
                                .map((field) => (
                                <CharacteristicRow
                                    key={field.code}
                                    field={field}
                                    value={specs[field.code]}
                                    unitGroups={catalog?.unitGroups}
                                    onChange={(patch) => updateSpec(field.code, patch)}
                                />
                            ))}
                        </div>
                    ))}

                    {kind && (
                        <CustomCharacteristicsBlock
                            rows={customRows}
                            unitGroups={catalog?.unitGroups}
                            onChange={setCustomRows}
                        />
                    )}
                </div>
            </div>

            <BottomBar current={variantFillStep(15)} total={VARIANT_FILL_STAGE_COUNT} prevPath="/stage14" nextPath="/stage18" onSave={save} />
        </>
    )
}

function CharacteristicRow({ field, value, unitGroups, onChange }) {
    const current = value || { value: '', customValue: '', unit: '' }
    const units = field.unitGroup ? unitGroups?.[field.unitGroup] || [] : []

    return (
        <div className={`field-row ${field.inputType === 'choice' ? 'field-row--options' : ''}`}>
            <span className="required-mark">✱</span>
            <span className="required-mark-slot">
                {field.required && field.code !== 'brand' && (
                    <span className="info-icon" title="Подсказка">ⓘ</span>
                )}
            </span>
            <span className="field-name">{field.name}</span>

            {field.inputType === 'choice' ? (
                <div className="option-group">
                    {field.options.map((option) => (
                        <button
                            type="button"
                            key={option.value}
                            className={`option-btn ${current.value === option.value ? 'option-btn--active' : ''}`}
                            onClick={() => onChange({ value: option.value, customValue: '' })}
                        >
                            {option.label}
                        </button>
                    ))}
                    {field.allowCustom && (
                        <button
                            type="button"
                            className={`option-btn ${current.value === 'other' ? 'option-btn--active' : ''}`}
                            onClick={() => onChange({ value: 'other' })}
                        >
                            Иное
                        </button>
                    )}
                    {field.allowCustom && current.value === 'other' && (
                        <input
                            type="text"
                            className="field-input option-custom-input"
                            placeholder="Введите своё значение"
                            value={current.customValue}
                            onChange={(event) => onChange({ customValue: event.target.value })}
                        />
                    )}
                </div>
            ) : (
                <input
                    type="text"
                    className="field-input"
                    placeholder="Значение"
                    value={current.value}
                    onChange={(event) => onChange({ value: event.target.value })}
                />
            )}

            {units.length > 0 && (
                <select
                    className="field-select"
                    value={current.unit || units[0].value}
                    onChange={(event) => onChange({ unit: event.target.value })}
                >
                    {units.map((unit) => (
                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                </select>
            )}
        </div>
    )
}

export default Stage15
