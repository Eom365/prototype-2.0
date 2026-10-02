import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BottomBar from '../components/BottomBar'
import { productsApi } from '../api'
import './Stage2_3.css'

// Подсказки для иконок «?»
const TIPS = {
    name: 'Наименование продукта формируется автоматически из заполненных характеристик: логотип, категория, бренд и линейка.',
    brand: 'Бренд — это название товарного знака, под которым продается товар. Кто может заполнять: только правообладатель товарного знака. Для подтверждения потребуется загрузить «Свидетельство на товарный знак». Если вы продаете оригинальный товар, но не являетесь правообладателем — не заполняйте это поле.',
    brandDoc: 'Загрузите свидетельство на товарный знак (PDF, JPG, PNG).',
    brandLogo: 'Логотип — графическое изображение товарного знака. Кто может заполнять: только правообладатель товарного знака. Если вы продаете оригинальный товар, но не являетесь правообладателем не загружайте логотип. Размеры для загрузки фотографии: 200px на 200 px',
    line: 'Линейка — наименование группы моделей. Объединяет разные модели в одну группу. Важно: многие товары не имеют линейки.Оставьте поле пустым, если продукт только в одном исполнении(без других моделей).',
}

function Tip({ text, image, imageAlt = '' }) {
    const [open, setOpen] = useState(false)
    return (
        <span className="tip">
            <button
                type="button"
                className="tip__icon"
                aria-label="Подсказка"
                onClick={() => setOpen((v) => !v)}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
            >
                ?
            </button>
            {open && (
                <span className="tip__bubble">
                    <span className="tip__text">{text}</span>
                    {image && (
                        <img
                            className="tip__image"
                            src={image}
                            alt={imageAlt || 'Пояснение'}
                        />
                    )}
                </span>
            )}
        </span>
    )
}

// Файловое поле в стиле Этапа 7: readOnly текст + крестик + скрепка
function FileInput({ value, onChange, placeholder, accept }) {
    const inputRef = useRef(null)

    const handlePick = () => inputRef.current?.click()

    const handleChange = (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        onChange(file)
    }

    const handleClear = (event) => {
        event.stopPropagation()
        onChange(null)
    }

    return (
        <div className="file-input">
            <input
                type="text"
                className="file-input__text"
                value={value ? value.name : ''}
                placeholder={placeholder}
                readOnly
                onClick={handlePick}
            />
            {value && (
                <button
                    type="button"
                    className="file-input__clear"
                    onClick={handleClear}
                    title="Удалить файл"
                >
                    ✕
                </button>
            )}
            <button
                type="button"
                className="file-input__clip"
                onClick={handlePick}
                title="Прикрепить файл"
            >
                📎
            </button>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                hidden
                onChange={handleChange}
            />
        </div>
    )
}

// Старое поле — с «+» и кнопкой (для логотипа)
function FileField({ label, value, onChange, accept, withIcon }) {
    const inputRef = useRef(null)

    const handlePick = () => inputRef.current?.click()

    const handleChange = (event) => {
        const file = event.target.files?.[0]
        if (!file) return
        onChange(file)
    }

    return (
        <div className="file-field">
            {withIcon && (
                <div className="file-field__icon" aria-hidden="true">
                    <span className="file-field__icon-plus">+</span>
                </div>
            )}
            <button
                type="button"
                className="file-field__button"
                onClick={handlePick}
            >
                {value ? value.name : label}
            </button>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                hidden
                onChange={handleChange}
            />
        </div>
    )
}

function Stage2_3() {
    const [params] = useSearchParams()
    const productId = params.get('id')

    const [productName, setProductName] = useState('')
    const [brandName, setBrandName] = useState('')
    const [lineName, setLineName] = useState('')
    const [brandDoc, setBrandDoc] = useState(null)
    const [brandLogo, setBrandLogo] = useState(null)

    const [error, setError] = useState('')
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        if (!productId) return
        productsApi.get(productId).then((product) => {
            setProductName(product.productName || '')
            setBrandName(product.brandName || '')
            setLineName(product.lineName || '')
            setLoaded(true)
        }).catch((loadError) => setError(loadError.message))
    }, [productId])

    useEffect(() => {
        if (!loaded) return
        const parts = [productName, brandName, lineName].filter(Boolean)
        // eslint-disable-next-line no-unused-vars
        const _preview = parts.join(' + ')
    }, [productName, brandName, lineName, loaded])

    const save = () => {
        if (!productId) throw new Error('Сначала создайте карточку на главной странице')
        if (!loaded) throw new Error('Карточка ещё загружается, подождите секунду')

        const formData = new FormData()
        formData.append('brandName', brandName)
        formData.append('lineName', lineName)
        if (brandDoc) formData.append('brandDoc', brandDoc)
        if (brandLogo) formData.append('brandLogo', brandLogo)

        // ─── ЗАГЛУШКА ─────────────────────────────
        console.log('[stub] saveBrand', { productId, brandName, lineName, brandDoc, brandLogo })
        return Promise.resolve({ ok: true })
        // ─── Когда бэкенд появится — раскомментируйте:
        // return productsApi.saveBrand(productId, formData)
    }

    const composedName = [productName, brandName, lineName].filter(Boolean).join(' + ')

    return (
        <>
            <div className="container stage3-page">
                <h1 className="title stage3-title">Этап 3 - Бренд и линейка продукта</h1>
                {!productId && (
                    <p className="form-error">Откройте создание карточки с главной страницы.</p>
                )}
                {error && <p className="form-error">{error}</p>}

                {/* <p className="stage3-description">
                    Наименование продукта — формируется из заполненных характеристик товара,
                    которые могут изменяться при добавлении вариантов параметров товара
                </p>

                <div className="stage3-row">
                    <Tip text={TIPS.name} />
                    <input
                        type="text"
                        className="stage3-input stage3-input--readonly"
                        value={composedName}
                        readOnly
                        placeholder="Логотип + Категория + Бренд + Линейка"
                    />
                </div> */}

                {/* ==== Бренд ==== */}
                <h2 className="stage3-subtitle">Бренд</h2>

                <div className="stage3-row">
                    <Tip text={TIPS.brand} />
                    <label className="stage3-label">Название бренда</label>
                    <input
                        type="text"
                        className="stage3-input"
                        placeholder="Значение"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                    />
                </div>

                <div className="stage3-row stage3-row--doc">
                    {/* <Tip text={TIPS.brandDoc} /> */}
                    <span className="stage3-inline-label">Добавьте документы на бренд:</span>
                    <div className="stage3-doc-wrap">
                        <FileInput
                            value={brandDoc}
                            onChange={setBrandDoc}
                            placeholder="Свидетельство на товарный знак"
                            accept=".pdf,.jpg,.jpeg,.png"
                        />
                    </div>
                </div>

                <div className="stage3-row">
                    <Tip
                        text={TIPS.brandLogo}
                        imageCaption="Пример правильного заполнения:"
                        image="/images/brand.png"
                        imageAlt="Пример правильного логотипа бренда"
                    />
                    <span className="stage3-inline-label">Логотип бренда</span>
                    <FileField
                        label="Загрузить фотографию"
                        value={brandLogo}
                        onChange={setBrandLogo}
                        accept="image/*"
                        withIcon
                    />
                </div>

                {/* <h2 className="stage3-subtitle stage3-subtitle--line">Линейка</h2> */}

                <div className="stage3-row">
                    <Tip
                        text={TIPS.line}
                        image="/images/one.png"
                        imageAlt="Пример линейки"
                    />
                    <label className="stage3-label">Линейка</label>
                    <input
                        type="text"
                        className="stage3-input"
                        placeholder="Значение"
                        value={lineName}
                        onChange={(e) => setLineName(e.target.value)}
                    />
                </div>
            </div>

            <BottomBar
                current={3}
                total={11}
                prevPath="/stage2"
                nextPath="/stage3"
                onSave={save}
            />
        </>
    )
}

export default Stage2_3