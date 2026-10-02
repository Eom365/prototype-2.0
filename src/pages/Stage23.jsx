import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BottomBar from '../components/BottomBar'
import CustomCharacteristicsBlock from '../components/CustomCharacteristicsBlock'
import DimensionsGroup from '../components/DimensionsGroup'
import { catalogApi, productsApi } from '../api'
import { customRowsFromValues, normalizeCustomRows, serializeCustomRows } from '../customCharacteristics'
import { emptyDescriptionForm, parseDescriptionForm, serializeDescriptionForm } from '../descriptionForm'
import { DIMENSION_CODES, prefillSpecFromProduct } from '../productSpecs'
import ImageHint from '../components/ImageHint'
import Stage5Description from './Stage5Description'
import './Stage5.css'

const DIMENSIONS_HINT_IMAGE = '/images/dimensions.png'

const FIELD_PLACEHOLDERS = {
    article: 'Семь цифр: 1234567',
}

const FIELD_LABELS = {
    article: 'Артикул площадки',
}

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

function Stage23() {
    const [params] = useSearchParams()
    const productId = params.get('id')
    const [catalog, setCatalog] = useState(null)
    const [kindCode, setKindCode] = useState('')
    const [kindName, setKindName] = useState('')
    const [descriptionForm, setDescriptionForm] = useState(emptyDescriptionForm)
    const [specs, setSpecs] = useState({})
    const [customRows, setCustomRows] = useState(() => normalizeCustomRows([]))
    const [productLine, setProductLine] = useState('')
    const [categorySnapshot, setCategorySnapshot] = useState(null)
    const [logo, setLogo] = useState(null)
    const [error, setError] = useState('')
    const [loaded, setLoaded] = useState(false)
    const logoInputRef = useRef(null)
    const [descriptionSaved, setDescriptionSaved] = useState(false)

    useEffect(() => {
        catalogApi.get().then(setCatalog).catch((loadError) => setError(loadError.message))
    }, [])

    useEffect(() => {
        if (!productId || !catalog) return
        productsApi.get(productId).then((product) => {
            setKindCode(product.kindCode || '')
            setKindName(product.kindName || '')
            setProductLine(product.productLine || '')
            setCategorySnapshot({
                purpose: product.purpose || '',
                kindCode: product.kindCode || '',
                productName: product.productName || '',
                categoryPath: product.categoryPath || '',
            })
            setDescriptionForm(parseDescriptionForm(product))
            setLogo((product.files || []).find((file) => file.role === 'logo' && !file.variationId) || null)

            const kind = findKind(catalog, product.kindCode)
            const next = {}
            for (const field of kind?.characteristics || []) {
                const saved = (product.values || []).find((value) => value.code === field.code)
                const defaultUnit = field.unitGroup ? defaultUnits[field.unitGroup] : ''
                next[field.code] = prefillSpecFromProduct(field.code, saved, product, defaultUnit)
            }
            setSpecs(next)
            setCustomRows(normalizeCustomRows(customRowsFromValues(product.values, {}, catalog.unitGroups)))
            setLoaded(true)
        }).catch((loadError) => setError(loadError.message))
    }, [productId, catalog])

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
        if (!file || !productId) return
        const formData = new FormData()
        formData.append('file', file)
        formData.append('role', 'logo')
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
        if (!loaded) throw new Error('Карточка ещё загружается, подождите секунду')
        await productsApi.saveDescription(productId, serializeDescriptionForm(descriptionForm))
        if (categorySnapshot) {
            await productsApi.saveCategory(productId, {
                ...categorySnapshot,
                productLine,
            })
        }
        const values = [
            ...Object.entries(specs).map(([code, value]) => ({
                code,
                value: value.value,
                customValue: value.customValue,
                unit: value.unit || null,
            })),
            ...serializeCustomRows(customRows),
        ]
        await productsApi.saveCharacteristics(productId, { values })
    }

    return (
        <>
            <div className="container">
                <h1 className="title">Этап 5 — Описание и характеристики продукта</h1>

                {/* {!productId && (
                    <p className="form-error">Откройте создание карточки с главной страницы.</p>
                )}
                {error && <p className="form-error">{error}</p>} */}

                {/* ===== ОПИСАНИЕ ===== */}
                <div className="descriptionN">
                    <h2 className="subtitleOne">Введите описание товара:</h2>

                    <Stage5Description
                        form={descriptionForm}
                        onChange={(section, value) =>
                            setDescriptionForm((prev) => ({ ...prev, [section]: value }))
                        }
                    />

                    <div className="descriptionN__footer">
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

                        {descriptionSaved && (
                            <span className="descriptionN__check" title="Сохранено">
                                ✓
                            </span>
                        )}
                    </div>
                </div>

                <div className="descriptionM">
                    {/* ===== ХАРАКТЕРИСТИКИ ===== */}
                    <h2 className="subtitleOne subtitle--spaced">Заполните характеристики продукта:</h2>
                    {!kind && (
                        <p className="paragraph">
                            Сначала выберите вид продукта на этапе 2. От него зависит набор характеристик.
                        </p>
                    )}

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
                                <h3 className="subtitle subtitle--spaced group-title">
                                    {group.name}
                                    {group.name === 'Габариты' && (
                                        <ImageHint
                                            src={DIMENSIONS_HINT_IMAGE}
                                            alt="Длина, ширина и высота"
                                            title="Как измерять габариты"
                                            size="large"
                                        />
                                    )}
                                </h3>

                                {group.name === 'Габариты' && (
                                    <DimensionsGroup
                                        fields={group.fields}
                                        specs={specs}
                                        unitOptions={catalog?.unitGroups?.dimension || []}
                                        onChange={updateSpec}
                                    />
                                )}

                                {group.fields
                                    .filter((field) => !(field.code === 'lightSource' && specs.light?.value === 'no'))
                                    .filter((field) => group.name !== 'Габариты' || !DIMENSION_CODES.includes(field.code))
                                    .map((field) => (
                                        <div key={field.code}>
                                            {group.name === 'Основные' && field.code === 'model' && (
                                                <>
                                                    <p className="pBold">Пример правильного заполнения:</p>
                                                    <img alt="Линейка и бренд" className="oneimg" src="/images/one.png" />

                                                    {(() => {
                                                        const brandField = kind?.characteristics?.find((f) => f.code === 'brand')
                                                        if (!brandField) return null
                                                        return (
                                                            <CharacteristicRow
                                                                field={brandField}
                                                                value={specs['brand']}
                                                                unitGroups={catalog?.unitGroups}
                                                                onChange={(patch) => updateSpec('brand', patch)}
                                                            />
                                                        )
                                                    })()}

                                                    <p className="standartP standart">
                                                        Линейка — наименование группы моделей. Объединяет разные модели в одну группу.
                                                        <br />
                                                        Важно: многие товары не имеют линейки. Оставьте поле пустым, если
                                                        продукт только в одном исполнении (без других моделей).
                                                    </p>

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

                                                    {/* ===== ОПИСАНИЕ ДЛЯ МОДЕЛИ (перед полем Модель) ===== */}
                                                    <p className="standartP">
                                                        Модель - версия продукта.
                                                    </p>
                                                </>
                                            )}

                                            {group.name === 'Производитель' && field.code === 'brand' && (
                                                <p className="field-description standart">
                                                    Бренд — это название товарного знака, под которым продается товар.
                                                    {/* Кто может заполнять: только правообладатель товарного знака.
                                                    Для подтверждения потребуется загрузить «Свидетельство на товарный знак»
                                                    на Этапе 7 «Документы на продукт».
                                                    Если вы продаете оригинальный товар, но не являетесь правообладателем —
                                                    не заполняйте это поле. */}
                                                    <br />Пример правильного заполнения: «ОМ 365»
                                                </p>
                                            )}

                                            <CharacteristicRow
                                                field={field}
                                                value={specs[field.code]}
                                                unitGroups={catalog?.unitGroups}
                                                onChange={(patch) => updateSpec(field.code, patch)}
                                            />

                                            {group.name === 'Производитель' && field.code === 'brand' && (
                                                <>
                                                    <p className="field-description standart">
                                                        Логотип — графическое изображение товарного знака.
                                                        Кто может заполнять: только правообладатель товарного знака.
                                                        Если вы продаете оригинальный товар, но не являетесь правообладателем —
                                                        не загружайте логотип.
                                                        <br />Пример правильного заполнения:
                                                        <img
                                                            src="/images/brand.png"
                                                            alt="Пример бренда"
                                                            className="inline-img"
                                                        />
                                                    </p>

                                                    <div className="field-row">
                                                        <span className="info-icon" title="Подсказка">ⓘ</span>
                                                        <span className="required-mark-slot" aria-hidden="true" />
                                                        <span className="field-name">Логотип</span>

                                                        {logo ? (
                                                            <div className="field-input field-input--file field-input--has-file">
                                                                <img src={logo.url} alt="Логотип" className="file-preview" />
                                                                <span className="file-text">{logo.name}</span>
                                                                <button
                                                                    type="button"
                                                                    className="file-remove"
                                                                    onClick={handleLogoRemove}
                                                                    title="Удалить"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="field-input field-input--file"
                                                                onClick={() => logoInputRef.current?.click()}
                                                            >
                                                                <span className="file-icon">📎</span>
                                                                <span className="file-text">Загрузить фотографию</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
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
            </div>

            <BottomBar current={5} total={11} prevPath="/stage4" nextPath="/stage6" onSave={save} />
        </>
    )
}

function CharacteristicRow({ field, value, unitGroups, onChange }) {
    const current = value || { value: '', customValue: '', unit: '' }
    const units = field.unitGroup ? unitGroups?.[field.unitGroup] || [] : []
    const placeholder = FIELD_PLACEHOLDERS[field.code] || 'Значение'

    return (
        <div className={`field-row ${field.inputType === 'choice' ? 'field-row--options' : ''}`}>
            <span className="required-mark">✱</span>
            <span className="required-mark-slot">
                {field.required && field.code !== 'brand' && (
                    <span className="info-icon" title="Подсказка">ⓘ</span>
                )}
            </span>
            <span className="field-name">{FIELD_LABELS[field.code] || field.name}</span>

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
                    placeholder={placeholder}
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

export default Stage23