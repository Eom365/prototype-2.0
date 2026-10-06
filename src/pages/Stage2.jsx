import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BottomBar from '../components/BottomBar'
import { catalogApi, productsApi } from '../api'
import {
    HANDPIECE_PARENTS,
    handpieceParentCodeForKind,
    handpieceProductName,
} from '../handpieceKinds'
import { productWizardTotal } from '../stageProgress'
import './Stage2.css'
import './Stage2_3.css'

function getPurposeRoot(purpose) {
    return purpose === 'Стоматология' ? 'Профессиональная стоматология' : 'Стоматология'
}

export const OTHER_KIND_CODE = 'other'
const OTHER_PURPOSE = 'Иное'

const BRAND_TIPS = {
  brand:
    "Бренд — это название товарного знака, под которым продается товар. Кто может заполнять: только правообладатель товарного знака. Для подтверждения потребуется загрузить «Свидетельство на товарный знак». Если вы продаете оригинальный товар, но не являетесь правообладателем — не заполняйте это поле.",
  brandLogo:
    "Логотип — графическое изображение товарного знака. Кто может заполнять: только правообладатель товарного знака. Если вы продаете оригинальный товар, но не являетесь правообладателем не загружайте логотип. Размеры для загрузки фотографии: 200px на 200 px",
  line: "Линейка — наименование группы моделей. Объединяет разные модели в одну группу. Важно: многие товары не имеют линейки.Оставьте поле пустым, если продукт только в одном исполнении(без других моделей).",
}

function Tip({
  text,
  image,
  imageAlt = "",
  imageSize = "default",
  bubbleSize = "default",
}) {
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
        <span className={`tip__bubble tip__bubble--${bubbleSize}`}>
          <span className="tip__text">{text}</span>
          {image && (
            <img
              className={`tip__image tip__image--${imageSize}`}
              src={image}
              alt={imageAlt || "Пояснение"}
            />
          )}
        </span>
      )}
    </span>
  )
}

function FileInput({ value, onChange, placeholder, accept }) {
  const inputRef = useRef(null)
  const handlePick = () => inputRef.current?.click()
  const handleChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ""
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
        value={value ? value.name : ""}
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

function FileField({ label, value, onChange, accept }) {
  const inputRef = useRef(null)
  const handlePick = () => inputRef.current?.click()
  const handleChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    onChange(file)
  }
  return (
    <div className="file-field">
      <button type="button" className="file-field__button" onClick={handlePick}>
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

function getProductName(kind, categoryCode) {
    if (kind.code === OTHER_KIND_CODE) return ''
    if (categoryCode === 'handpieces') {
        return handpieceProductName(kind.code, kind.name)
    }
    return kind.name
}

function catalogPathSegments(stack, rootLabel) {
    const parts = []
    for (const frame of stack) {
        if (frame.type === 'root') parts.push(rootLabel)
        else if (frame.type === 'category') parts.push(frame.data.name)
        else if (frame.type === 'parent') parts.push(frame.data.parent.name)
    }
    return parts
}

function splitCategoryPath(path) {
    return String(path || '')
        .split('>')
        .map((part) => part.trim())
        .filter(Boolean)
}

function buildDraftPath(prefix, tail, draft) {
    const trimmed = String(draft || '').trim()
    const parts = [...prefix, ...tail]
    if (trimmed) parts.push(trimmed)
    if (parts.length === 0) return ''
    if (tail.length > 0 && !trimmed) {
        return `${parts.join(' > ')} >`
    }
    return parts.join(' > ')
}

function navigationFromPath(catalog, purpose, path) {
    const rootLabel = getPurposeRoot(purpose || 'Стоматология')
    const segments = splitCategoryPath(path)
    if (segments.length === 0) {
        return { stack: [], customTail: [], path: '' }
    }

    const stack = []
    let index = 0

    if (segments[0] === rootLabel) {
        stack.push({ type: 'root' })
        index = 1
    } else {
        stack.push({ type: 'root' })
    }

    if (index >= segments.length) {
        return { stack, customTail: [], path: segments.join(' > ') }
    }

    const category = (catalog?.categories || []).find(
        (item) => item.name === segments[index],
    )
    if (!category) {
        return {
            stack,
            customTail: segments.slice(index),
            path: segments.join(' > '),
        }
    }

    stack.push({ type: 'category', data: category })
    index += 1

    if (index >= segments.length) {
        return { stack, customTail: [], path: segments.join(' > ') }
    }

    if (category.code === 'handpieces') {
        const parentEntry = Object.entries(HANDPIECE_PARENTS).find(
            ([, parent]) => parent.name === segments[index],
        )
        if (parentEntry) {
            const [parentCode, parent] = parentEntry
            const isLeaf = parent.kinds.length === 1
            if (!isLeaf) {
                stack.push({
                    type: 'parent',
                    data: { parentCode, parent, category },
                })
            }
            return { stack, customTail: [], path: segments.join(' > ') }
        }
    }

    const maybeKind = category.kinds.find((kind) => kind.name === segments[index])
    if (maybeKind) {
        return { stack, customTail: [], path: segments.join(' > ') }
    }

    return {
        stack,
        customTail: segments.slice(index),
        path: segments.join(' > '),
    }
}

function CategoryModal({
    catalog,
    purpose,
    initialPath = '',
    onSelect,
    onClose,
    onDraftPathChange,
}) {
    const rootLabel = getPurposeRoot(purpose || 'Стоматология')
    const initial = navigationFromPath(catalog, purpose, initialPath)
    const [stack, setStack] = useState(initial.stack)
    const [customDraft, setCustomDraft] = useState('')
    const [customTail, setCustomTail] = useState(initial.customTail)
    const [customFocused, setCustomFocused] = useState(false)

    useEffect(() => {
        const prefix = catalogPathSegments(initial.stack, rootLabel)
        const path = buildDraftPath(prefix, initial.customTail, '')
        if (path) onDraftPathChange?.(path)
    }, [])

    const publishDraft = (prefix, tail, draft) => {
        onDraftPathChange?.(buildDraftPath(prefix, tail, draft))
    }

    const pathPrefix = () => catalogPathSegments(stack, rootLabel)

    const syncPath = (nextStack = stack, nextTail = customTail, nextDraft = customDraft) => {
        publishDraft(catalogPathSegments(nextStack, rootLabel), nextTail, nextDraft)
    }

    useEffect(() => {
        syncPath()
    }, [stack, customTail, customDraft])

    const resetCustomFlow = (nextStack = stack) => {
        setCustomTail([])
        setCustomDraft('')
        setCustomFocused(false)
        syncPath(nextStack, [], '')
    }

    const confirmKind = (kind, category, parent) => {
        if (!kind || !category) return
        const parentSegment =
            parent && parent.name !== kind.name ? ` > ${parent.name}` : ''
        const fullPath = `${rootLabel} > ${category.name}${parentSegment} > ${kind.name}`
        onSelect({
            path: fullPath,
            kindCode: kind.code,
            categoryCode: category.code,
            handpieceParent: parent ? handpieceParentCodeForKind(kind.code) : '',
            productName: getProductName(kind, category.code),
        })
    }

    const getCurrent = () => {
        if (!catalog) return { title: 'Укажите категорию продукта', items: [] }

        if (customTail.length > 0) {
            return { title: customTail[customTail.length - 1] || '', items: [] }
        }

        if (stack.length === 0) {
            return {
                title: 'Укажите категорию продукта',
                items: [{
                    key: 'root',
                    label: rootLabel,
                    hasChildren: true,
                    onPick: () => {
                        const next = [{ type: 'root' }]
                        resetCustomFlow(next)
                        setStack(next)
                    },
                }],
            }
        }

        const current = stack[stack.length - 1]

        if (current.type === 'root') {
            return {
                title: rootLabel,
                items: catalog.categories.map((cat) => ({
                    key: cat.code,
                    label: cat.name,
                    hasChildren: true,
                    onPick: () => {
                        const next = [...stack, { type: 'category', data: cat }]
                        resetCustomFlow(next)
                        setStack(next)
                    },
                })),
            }
        }

        if (current.type === 'category') {
            const cat = current.data
            if (cat.code === 'handpieces') {
                return {
                    title: cat.name,
                    items: Object.entries(HANDPIECE_PARENTS).map(([code, parent]) => {
                        const isLeaf = parent.kinds.length === 1
                        if (isLeaf) {
                            const kind = cat.kinds.find((k) => k.code === parent.kinds[0])
                            return {
                                key: code,
                                label: parent.name,
                                hasChildren: false,
                                data: { kind, category: cat },
                                onPick: () => confirmKind(kind, cat, parent),
                            }
                        }
                        return {
                            key: code,
                            label: parent.name,
                            hasChildren: true,
                            onPick: () => {
                                const next = [
                                    ...stack,
                                    {
                                        type: 'parent',
                                        data: {
                                            parentCode: code,
                                            parent,
                                            category: cat,
                                        },
                                    },
                                ]
                                resetCustomFlow(next)
                                setStack(next)
                            },
                        }
                    }),
                }
            }
            return {
                title: cat.name,
                items: cat.kinds.map((kind) => ({
                    key: kind.code,
                    label: kind.name,
                    hasChildren: false,
                    data: { kind, category: cat },
                    onPick: () => confirmKind(kind, cat, null),
                })),
            }
        }

        if (current.type === 'parent') {
            const { parent, category } = current.data
            return {
                title: parent.name,
                items: parent.kinds
                    .map((code) => category.kinds.find((k) => k.code === code))
                    .filter(Boolean)
                    .map((kind) => ({
                        key: kind.code,
                        label: kind.name,
                        hasChildren: false,
                        data: { kind, category },
                        onPick: () => confirmKind(kind, category, parent),
                    })),
            }
        }

        return { title: '', items: [] }
    }

    const { title, items } = getCurrent()

    const goBack = () => {
        if (customTail.length > 0) {
            const next = customTail.slice(0, -1)
            setCustomTail(next)
            setCustomDraft('')
            return
        }
        if (stack.length <= 1) {
            setStack([])
            setCustomTail([])
            setCustomDraft('')
            setCustomFocused(false)
            onDraftPathChange?.('')
            return
        }
        const next = stack.slice(0, -1)
        setStack(next)
        setCustomTail([])
        setCustomDraft('')
    }

    const finishCustomPath = (segments) => {
        const path = segments.join(' > ')
        onSelect({
            path,
            kindCode: OTHER_KIND_CODE,
            categoryCode: '',
            handpieceParent: '',
            productName: '',
        })
    }

    const handleCustomConfirm = () => {
        const text = customDraft.trim()
        const prefix = pathPrefix()

        if (text) {
            const nextTail = [...customTail, text]
            setCustomTail(nextTail)
            setCustomDraft('')
            return
        }

        if (customTail.length === 0) return
        finishCustomPath([...prefix, ...customTail])
    }

    const handleCustomCancel = () => {
        setCustomDraft('')
        setCustomFocused(false)
    }

    const handleCustomDraftChange = (value) => {
        setCustomDraft(value)
    }

    const inCustomLevel = customTail.length > 0
    const showBack = stack.length > 0 || customTail.length > 0
    const showCustomActions = inCustomLevel || customDraft.trim().length > 0
    const showSuggestLabel = !customFocused && !customDraft.trim() && !inCustomLevel
    const showSubHint = inCustomLevel && !customDraft.trim()

    return (
        <div className="stage2-modal" onClick={onClose}>
            <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="modal-sheet__header">
                    {showBack && (
                        <button
                            type="button"
                            className="modal-sheet__back"
                            onClick={goBack}
                            aria-label="Назад"
                        >
                            ←
                        </button>
                    )}
                    <h2 className="modal-sheet__title">{title}</h2>
                </div>

                <div className="modal-sheet__list">
                    {!inCustomLevel && items.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            className="modal-sheet__item"
                            onClick={item.onPick}
                        >
                            <span>{item.label}</span>
                            {item.hasChildren && (
                                <span className="modal-sheet__arrow">›</span>
                            )}
                        </button>
                    ))}
                    {!inCustomLevel && items.length === 0 && !catalog && (
                        <p className="modal-sheet__empty">Загрузка каталога…</p>
                    )}
                </div>

                <div className="modal-sheet__suggest">
                    {showSuggestLabel && (
                        <p className="paragraph">Добавьте свою категорию</p>
                    )}
                    <input
                        type="text"
                        className="input"
                        placeholder="Введите наименование категории"
                        value={customDraft}
                        onChange={(e) => handleCustomDraftChange(e.target.value)}
                        onFocus={() => setCustomFocused(true)}
                        onBlur={() => setCustomFocused(false)}
                        onKeyDown={(e) => e.key === 'Enter' && showCustomActions && handleCustomConfirm()}
                    />
                    {showSubHint && (
                        <p className="modal-sheet__subhint">
                            Если категорий больше нет — нажмите{' '}
                            <span className="modal-sheet__subhint-check" aria-hidden>✓</span>
                        </p>
                    )}
                </div>

                {showCustomActions && (
                    <div className="modal-sheet__actions">
                        <button
                            type="button"
                            className="modal-sheet__action modal-sheet__action--cancel"
                            onClick={handleCustomCancel}
                            aria-label="Отменить"
                        >
                            <span className="modal-sheet__action-circle">✕</span>
                        </button>
                        <button
                            type="button"
                            className="modal-sheet__action modal-sheet__action--confirm"
                            onClick={handleCustomConfirm}
                            aria-label="Подтвердить"
                        >
                            <span className="modal-sheet__action-circle">✓</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

function Stage2() {
    const [params] = useSearchParams()
    const productId = params.get('id')
    const [catalog, setCatalog] = useState(null)
    const [purpose, setPurpose] = useState('')
    const [categoryCode, setCategoryCode] = useState('')
    const [kindCode, setKindCode] = useState('')
    const [handpieceParent, setHandpieceParent] = useState('')
    const [productName, setProductName] = useState('')
    const [categoryPath, setCategoryPath] = useState('')
    const [productLine, setProductLine] = useState('')
    const [brandName, setBrandName] = useState('')
    const [brandDoc, setBrandDoc] = useState(null)
    const [brandLogo, setBrandLogo] = useState(null)
    const [productSnapshot, setProductSnapshot] = useState(null)
    const [logoPreviewUrl, setLogoPreviewUrl] = useState('')
    const [error, setError] = useState('')
    const [loaded, setLoaded] = useState(false)
    const [modalOpen, setModalOpen] = useState(true)
    const [pathPreview, setPathPreview] = useState('')
    const [modalKey, setModalKey] = useState(0)
    const [modalStartPath, setModalStartPath] = useState('')

    useEffect(() => {
        catalogApi.get().then(setCatalog).catch((loadError) => setError(loadError.message))
    }, [])

    useEffect(() => {
        if (!productId) return
        productsApi.get(productId).then((product) => {
            const savedKind = product.kindCode || ''
            const savedPurpose = product.currentStage >= 2 ? (product.purpose || '') : ''
            const savedPath = product.categoryPath || ''
            const savedName = product.productName || ''
            const lastSegment = savedPath
                .split('>')
                .map((part) => part.trim())
                .filter(Boolean)
                .at(-1) || ''
            setProductSnapshot(product)
            setKindCode(savedKind)
            setPurpose(savedKind === OTHER_KIND_CODE ? OTHER_PURPOSE : savedPurpose)
            setProductName(
                savedKind === OTHER_KIND_CODE && savedName === lastSegment
                    ? ''
                    : savedName,
            )
            setCategoryPath(savedPath)
            setProductLine(product.productLine || '')
            setBrandName(product.brandName || '')
            const files = product.files || []
            setBrandDoc(
                files.find(
                    (file) =>
                        file.role === 'document' &&
                        file.documentType === 'brand' &&
                        !file.variationId,
                ) || null,
            )
            setBrandLogo(
                files.find((file) => file.role === 'logo' && !file.variationId) || null,
            )
            setLoaded(true)
        }).catch((loadError) => setError(loadError.message))
    }, [productId])

    useEffect(() => {
        if (!catalog || !kindCode || categoryCode || purpose !== 'Стоматология') return
        if (kindCode === OTHER_KIND_CODE) return
        for (const category of catalog.categories) {
            if (category.kinds.some((kind) => kind.code === kindCode)) {
                setCategoryCode(category.code)
                break
            }
        }
    }, [catalog, kindCode, categoryCode, purpose])

    useEffect(() => {
        if (!kindCode) return
        setHandpieceParent(handpieceParentCodeForKind(kindCode))
    }, [kindCode])

    useEffect(() => {
        if (brandLogo instanceof File) {
            const objectUrl = URL.createObjectURL(brandLogo)
            setLogoPreviewUrl(objectUrl)
            return () => URL.revokeObjectURL(objectUrl)
        }
        setLogoPreviewUrl(brandLogo?.url || '')
        return undefined
    }, [brandLogo])

    const openModalAt = (path = '') => {
        setModalStartPath(path)
        setPathPreview(path)
        setModalKey((prev) => prev + 1)
        setModalOpen(true)
    }

    const handleClearAll = () => {
        setCategoryCode('')
        setHandpieceParent('')
        setKindCode('')
        setProductName('')
        setCategoryPath('')
        setPathPreview('')
        setModalStartPath('')
        if (modalOpen) {
            setModalKey((prev) => prev + 1)
        }
    }

    const handleCategorySelect = (selection) => {
        setCategoryCode(selection.categoryCode || '')
        setKindCode(selection.kindCode || '')
        setHandpieceParent(selection.handpieceParent || '')
        setCategoryPath(selection.path || '')
        if (selection.kindCode === OTHER_KIND_CODE) {
            setPurpose(OTHER_PURPOSE)
            setProductName('')
        } else {
            setProductName(selection.productName || '')
        }
        setPathPreview('')
        setModalStartPath('')
        setModalOpen(false)
    }

    const handleModalClose = () => {
        setPathPreview('')
        setModalStartPath('')
        setModalOpen(false)
    }

    const handlePathSegmentClick = (index) => {
        const source = modalOpen && pathPreview ? pathPreview : categoryPath
        const segments = splitCategoryPath(source)
        if (!segments.length) return
        const nextPath = segments.slice(0, index + 1).join(' > ')
        setCategoryCode('')
        setHandpieceParent('')
        setKindCode('')
        setProductName('')
        setCategoryPath(nextPath)
        openModalAt(nextPath)
    }

    const handleBrandDocChange = async (next) => {
        if (!next && brandDoc?.id) {
            try {
                await productsApi.deleteFile(brandDoc.id)
            } catch (removeError) {
                setError(removeError.message)
                return
            }
        }
        setBrandDoc(next)
    }

    const handleBrandLogoChange = async (next) => {
        if (!next && brandLogo?.id) {
            try {
                await productsApi.deleteFile(brandLogo.id)
            } catch (removeError) {
                setError(removeError.message)
                return
            }
        }
        setBrandLogo(next)
    }

    const displayedPath = modalOpen && pathPreview ? pathPreview : categoryPath
    const pathSegments = splitCategoryPath(displayedPath)
    const composedFullName = [
        String(productName || '').trim(),
        String(brandName || '').trim(),
        String(productLine || '').trim(),
    ]
        .filter(Boolean)
        .join(' ')

    const save = async () => {
        if (!productId) throw new Error('Сначала создайте карточку на главной странице')
        if (!loaded || !productSnapshot) {
            throw new Error('Карточка ещё загружается, подождите секунду')
        }
        if (!kindCode || !String(categoryPath || '').trim()) {
            throw new Error('Выберите категорию продукта')
        }
        if (kindCode === OTHER_KIND_CODE && !String(productName || '').trim()) {
            throw new Error('Укажите тип продукта')
        }

        const trimmedProductName = String(productName || '').trim()
        const trimmedBrand = String(brandName || '').trim()
        const trimmedLine = String(productLine || '').trim()

        await productsApi.saveIdentity(productId, {
            authorLastName: productSnapshot.authorLastName || '',
            authorFirstName: productSnapshot.authorFirstName || '',
            authorMiddleName: productSnapshot.authorMiddleName || '',
            tradeName: productSnapshot.tradeName || '',
            brandName: trimmedBrand,
            manufacturerName: productSnapshot.manufacturerName || '',
            manufacturerCountry: productSnapshot.manufacturerCountry || '',
            productIdentifier: productSnapshot.productIdentifier || '',
            internalArticle: productSnapshot.internalArticle || '',
        })

        await productsApi.saveCategory(productId, {
            purpose,
            kindCode,
            productName: trimmedProductName,
            categoryPath,
            productLine: trimmedLine,
        })

        let savedDoc = brandDoc
        if (brandDoc instanceof File) {
            const formData = new FormData()
            formData.append('file', brandDoc)
            formData.append('role', 'document')
            formData.append('documentType', 'brand')
            savedDoc = await productsApi.upload(productId, formData)
            setBrandDoc(savedDoc)
        }

        let savedLogo = brandLogo
        if (brandLogo instanceof File) {
            const formData = new FormData()
            formData.append('file', brandLogo)
            formData.append('role', 'logo')
            savedLogo = await productsApi.upload(productId, formData)
            setBrandLogo(savedLogo)
        }

        const fullName = [trimmedProductName, trimmedBrand, trimmedLine]
            .filter(Boolean)
            .join(' ')
        await productsApi.saveName(productId, {
            fullName,
            nameIncludesLogo: Boolean(savedLogo),
            nameIncludesType: false,
            nameIncludesBrand: Boolean(trimmedBrand),
            nameIncludesLine: Boolean(trimmedLine),
            nameIncludesModel: false,
        })
    }

    const isManualCategory = kindCode === OTHER_KIND_CODE && Boolean(String(categoryPath || '').trim())
    const wizardTotal = kindCode
        ? productWizardTotal({
            kindCode,
            categoryCode,
            categoryPath,
            variantAxes: productSnapshot?.variantAxes || [],
        })
        : 3

    return (
        <>
            <div className="container stage2-page">
                <h1 className="title stage2-title">Этап 2 - Категория, бренд и наименование линейки продукта</h1>
                {!productId && <p className="form-error">Откройте создание карточки с главной страницы.</p>}
                {error && <p className="form-error">{error}</p>}

                <div className="stage2-workarea">
                    <div className="field field--category">
                        <h2 className="stage2-section-title">Категория продукта</h2>
                        <p className="paragraph">Категория продукта (строится из вашего выбора)</p>

                        <div className="category-picker">
                            <button
                                type="button"
                                className="category-picker__burger"
                                title="Меню"
                                onClick={() => openModalAt('')}
                            >
                                ☰
                            </button>

                            <div
                                className={`category-picker__path${pathSegments.length ? '' : ' category-picker__path--empty'}`}
                                onClick={() => {
                                    if (!pathSegments.length) openModalAt('')
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        if (!pathSegments.length) openModalAt('')
                                    }
                                }}
                            >
                                {pathSegments.length === 0 ? (
                                    <span className="category-picker__placeholder">Категория</span>
                                ) : (
                                    pathSegments.map((segment, index) => (
                                        <span className="category-picker__segment-wrap" key={`${segment}-${index}`}>
                                            {index > 0 && (
                                                <span className="category-picker__sep"> › </span>
                                            )}
                                            <button
                                                type="button"
                                                className="category-picker__segment"
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    handlePathSegmentClick(index)
                                                }}
                                            >
                                                {segment}
                                            </button>
                                        </span>
                                    ))
                                )}
                            </div>

                            <button
                                type="button"
                                className="category-picker__clear"
                                title="Очистить"
                                onClick={handleClearAll}
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {modalOpen && (
                        <CategoryModal
                            key={modalKey}
                            catalog={catalog}
                            purpose={purpose}
                            initialPath={modalStartPath}
                            onSelect={handleCategorySelect}
                            onClose={handleModalClose}
                            onDraftPathChange={setPathPreview}
                        />
                    )}

                    {isManualCategory && (
                        <div
                            className={`field--product-type${modalOpen ? ' field--product-type--after-modal' : ''}`}
                        >
                            <label className="field--product-type__label" htmlFor="product-type">
                                Тип продукта
                            </label>
                            <span className="field--product-type__star" aria-hidden="true">
                                ✱
                            </span>
                            <input
                                id="product-type"
                                type="text"
                                className="field--product-type__input"
                                value={productName}
                                onChange={(event) => setProductName(event.target.value)}
                                placeholder="Введите значение"
                            />
                        </div>
                    )}

                    <div className="matches-divider" />

                    <div className="stage2-brand-block stage3-page">
                        <h2 className="stage2-section-title">Бренд и линейка продукта</h2>

                        <h3 className="stage3-subtitle">Бренд</h3>

                        <div className="stage3-row">
                            <Tip text={BRAND_TIPS.brand} />
                            <label className="stage3-label">Название бренда</label>
                            <input
                                type="text"
                                className="stage3-input"
                                placeholder="Введите значение"
                                value={brandName}
                                onChange={(event) => setBrandName(event.target.value)}
                            />
                        </div>

                        <div className="stage3-row stage3-row--doc">
                            <span className="stage3-inline-label">
                                Добавьте документы на бренд:
                            </span>
                            <div className="stage3-doc-wrap">
                                <FileInput
                                    value={brandDoc}
                                    onChange={handleBrandDocChange}
                                    placeholder="Свидетельство на товарный знак"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                />
                            </div>
                        </div>

                        <div className="stage3-row">
                            <Tip
                                text={BRAND_TIPS.brandLogo}
                                image="/images/brand.png"
                                imageAlt="Пример правильного логотипа бренда"
                            />
                            <span className="stage3-inline-label">Логотип бренда</span>
                            <FileField
                                label="Загрузить фотографию"
                                value={brandLogo}
                                onChange={handleBrandLogoChange}
                                accept="image/*"
                            />
                        </div>

                        <div className="stage3-row oon">
                            <Tip
                                text={BRAND_TIPS.line}
                                image="/images/one.png"
                                imageAlt="Пример линейки"
                                imageSize="large"
                                bubbleSize="large"
                            />
                            <label className="stage3-label">Линейка</label>
                            <input
                                type="text"
                                className="stage3-input"
                                placeholder="Введите значение"
                                value={productLine}
                                onChange={(event) => setProductLine(event.target.value)}
                            />
                        </div>

                        <div className="matches-divider" />

                        <h2 className="stage2-section-title">Наименование линейки продукта</h2>
                        <p className="stage4-lead">
                            Наименование линейки продукта сформировалось из Логотипа + Типа
                            продукта + Бренда + Линейки.
                        </p>
                        <div className="stage4-name-box">
                            {logoPreviewUrl && (
                                <img
                                    className="stage4-name-box__logo"
                                    src={logoPreviewUrl}
                                    alt="Логотип"
                                />
                            )}
                            <input
                                type="text"
                                className="stage4-name-box__text"
                                value={composedFullName}
                                readOnly
                                placeholder="Логотип Тип продукта Бренд Линейка"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <BottomBar current={2} total={wizardTotal} prevPath="/stage1" nextPath="/stage3" onSave={save} />
        </>
    )
}

export default Stage2