import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BottomBar from '../components/BottomBar'
import Tip from '../components/Tip'
import { catalogApi, productsApi } from '../api'
import {
    HANDPIECE_PARENTS,
    handpieceParentCodeForKind,
    handpieceParentForKind,
    handpieceProductName,
} from '../handpieceKinds'
import { productWizardTotal } from '../stageProgress'
import './Stage2.css'
import './Stage2_3.css'
import '../components/ExcelImportModal.css'
import InformationAboutProductLine from "../components/InformationAboutProductLine";

function getPurposeRoot(purpose) {
    return purpose === 'Стоматология' ? 'Профессиональная стоматология' : 'Стоматология'
}

function isPurposeRootLabel(label) {
    const text = String(label || '').trim()
    return text === 'Профессиональная стоматология' || text === 'Стоматология'
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

const PRODUCT_TYPE_TIP =
    "Тип продукта — это название продукта, по которому определяется категория продукта. Тип продукта отображается в наименовании линейки продукта. Не указывайте бренд, модель и характеристики. Пример правильного заполнения: «Наконечник стоматолгогический турбинный», «Стерилизатор», «Ноутбук»."

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

function fieldsToCategoryPath(fields) {
    const parts = []
    for (const field of fields || []) {
        const text = String(field || '').trim()
        if (!text) break
        parts.push(text)
    }
    return parts.join(' > ')
}

/** Path segments + one trailing empty field for extending the chain. */
function pathToFields(path) {
    const segments = splitCategoryPath(path)
    return segments.length ? [...segments, ''] : ['']
}

/** Keep filled segments and one trailing empty field. */
function normalizePathFields(fields) {
    const next = []
    for (const field of fields || []) {
        const text = String(field ?? '')
        if (!String(text).trim()) break
        next.push(text)
    }
    if (next.length === 0) return ['']
    next.push('')
    return next
}

function fieldsToPathKeepAll(fields) {
    return (fields || [])
        .map((field) => String(field || '').trim())
        .filter(Boolean)
        .join(' > ')
}

/** Empty prefix slots + product type locked as the last segment. */
function normalizeUndeterminedPathFields(fields, typeName) {
    const type = String(typeName || '').trim()
    if (!type) return ['']
    const body = Array.isArray(fields) && fields.length
        ? fields.slice(0, -1)
        : []
    const filled = []
    for (const field of body) {
        const text = String(field ?? '')
        if (!String(text).trim()) break
        if (String(text).trim().toLowerCase() === type.toLowerCase()) break
        filled.push(text)
    }
    return [...filled, '', type]
}

function buildKindCatalogPath(purpose, category, parent, kind) {
    const rootLabel = getPurposeRoot(purpose || 'Стоматология')
    const parentSegment =
        parent && kind && parent.name !== kind.name ? ` > ${parent.name}` : ''
    const leaf = kind?.name || parent?.name || ''
    if (!category || !leaf) return ''
    return `${rootLabel} > ${category.name}${parentSegment} > ${leaf}`
}

function buildParentCatalogPath(purpose, category, parent) {
    const rootLabel = getPurposeRoot(purpose || 'Стоматология')
    if (!category || !parent) return ''
    return `${rootLabel} > ${category.name} > ${parent.name}`
}

function buildCategoryCatalogPath(purpose, category) {
    const rootLabel = getPurposeRoot(purpose || 'Стоматология')
    if (!category) return ''
    return `${rootLabel} > ${category.name}`
}

function typeTokens(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[ё]/g, 'е')
        .split(/[^a-zа-я0-9:]+/i)
        .map((part) => part.trim())
        .filter(Boolean)
}

/** Word bag key so "прямой стоматологический наконечник" == "Стоматологический прямой наконечник". */
function typeTokenKey(text) {
    return typeTokens(text).sort().join(' ')
}

function stemRu(word) {
    const w = String(word || '').toLowerCase().replace(/[ё]/g, 'е')
    if (w.length < 4) return w
    const endings = [
        'ическими',
        'ический',
        'ическая',
        'ическое',
        'ические',
        'ических',
        'ическим',
        'ческий',
        'ческая',
        'ческое',
        'ческие',
        'ческих',
        'ческим',
        'скими',
        'ский',
        'ская',
        'ское',
        'ские',
        'ских',
        'ским',
        'ями',
        'ами',
        'ов',
        'ев',
        'ей',
        'ий',
        'ый',
        'ой',
        'ая',
        'яя',
        'ое',
        'ее',
        'ые',
        'ие',
        'ых',
        'их',
        'ую',
        'юю',
        'а',
        'я',
        'ы',
        'и',
        'е',
        'у',
        'ю',
    ]
    for (const ending of endings) {
        if (w.length > ending.length + 3 && w.endsWith(ending)) {
            return w.slice(0, -ending.length)
        }
    }
    return w
}

function typeTokenKeySoft(text) {
    return typeTokens(text).map(stemRu).filter(Boolean).sort().join(' ')
}

function stemsClose(a, b) {
    if (!a || !b) return false
    if (a === b) return true
    if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true
    if (Math.abs(a.length - b.length) > 2) return false
    const maxLen = Math.max(a.length, b.length)
    if (maxLen < 6) return false
    let distance = 0
    const shorter = a.length <= b.length ? a : b
    const longer = a.length <= b.length ? b : a
    let si = 0
    for (let li = 0; li < longer.length && si < shorter.length; li += 1) {
        if (longer[li] === shorter[si]) si += 1
        else distance += 1
        if (distance > 2) return false
    }
    distance += shorter.length - si
    return distance <= 2
}

function typeTextMatches(query, label) {
    const q = String(query || '').trim()
    const l = String(label || '').trim()
    if (!q || !l) return false
    if (q.toLowerCase() === l.toLowerCase()) return true
    const qKey = typeTokenKey(q)
    const lKey = typeTokenKey(l)
    if (qKey && qKey === lKey) return true
    const qSoft = typeTokenKeySoft(q)
    const lSoft = typeTokenKeySoft(l)
    if (qSoft && qSoft === lSoft) return true
    const qStems = [...new Set(typeTokens(q).map(stemRu).filter((item) => item.length >= 4))]
    const lStems = [...new Set(typeTokens(l).map(stemRu).filter((item) => item.length >= 4))]
    if (!qStems.length || !lStems.length) return false
    return qStems.every((qs) => lStems.some((ls) => stemsClose(qs, ls)))
}

/**
 * Catalog matches for the typed product type (order of words does not matter).
 * Parent groups with several kinds are returned as hasSubtypes.
 */
function findTypeMatches(catalog, typeText) {
    const query = String(typeText || '').trim()
    if (!query || !catalog) return []

    const matches = []
    const seen = new Set()
    const handpieces = (catalog.categories || []).find((item) => item.code === 'handpieces')

    if (handpieces) {
        for (const [parentCode, parent] of Object.entries(HANDPIECE_PARENTS)) {
            const labels = [parent.name, parent.productName].filter(Boolean)
            if (!labels.some((label) => typeTextMatches(query, label))) continue
            const isLeaf = parent.kinds.length === 1
            const kind = isLeaf
                ? handpieces.kinds.find((item) => item.code === parent.kinds[0])
                : null
            const key = `parent:${parentCode}`
            if (seen.has(key)) continue
            seen.add(key)
            matches.push({
                matchKind: isLeaf ? 'kind' : 'parent',
                category: handpieces,
                parentCode,
                parent,
                kind: kind || null,
                hasSubtypes: !isLeaf,
            })
            if (kind) seen.add(`kind:${kind.code}`)
        }
    }

    for (const category of catalog.categories || []) {
        for (const kind of category.kinds || []) {
            const key = `kind:${kind.code}`
            if (seen.has(key)) continue
            const displayName = getProductName(kind, category.code)
            const parentForAlias = handpieceParentForKind(kind.code)
            const names = [kind.name, displayName].filter(Boolean)
            if (parentForAlias) {
                names.push(`${kind.name} ${parentForAlias.name}`)
                names.push(`${parentForAlias.name} ${kind.name}`)
                if (parentForAlias.productName) {
                    names.push(`${kind.name} ${parentForAlias.productName}`)
                    names.push(`${parentForAlias.productName} ${kind.name}`)
                }
            }
            if (!names.some((name) => typeTextMatches(query, name))) continue
            seen.add(key)
            const parent = handpieceParentForKind(kind.code)
            matches.push({
                matchKind: 'kind',
                category,
                parentCode: parent ? handpieceParentCodeForKind(kind.code) : '',
                parent,
                kind,
                hasSubtypes: false,
            })
        }
    }

    for (const category of catalog.categories || []) {
        const key = `category:${category.code}`
        if (seen.has(key)) continue
        const names = [category.name]
        if (category.code === 'handpieces') {
            names.push(
                'наконечник',
                'наконечники',
                'Стоматологический наконечник',
                'наконечник стоматологический',
                'стоматологический наконечник',
            )
        }
        if (category.code === 'aerosols') {
            names.push('Аэрозоль', 'аэрозоли', 'аэрозольная продукция', 'аэрозольный')
        }
        if (!names.some((name) => typeTextMatches(query, name))) continue
        seen.add(key)
        matches.push({
            matchKind: 'category',
            category,
            parentCode: '',
            parent: null,
            kind: null,
            hasSubtypes: true,
        })
    }

    return matches
}

function CategoryPathField({
    value,
    placeholder,
    onChange,
    onFocus,
    onClick,
    onDoubleClick,
    title,
    readOnly = false,
}) {
    const inputRef = useRef(null)
    const measureRef = useRef(null)

    useLayoutEffect(() => {
        const input = inputRef.current
        const measure = measureRef.current
        if (!input || !measure) return
        const nextWidth = Math.ceil(measure.offsetWidth) + 4
        input.style.width = `${Math.max(nextWidth, 48)}px`
    }, [value, placeholder])

    return (
        <span className="category-picker__field-wrap">
            <span ref={measureRef} className="category-picker__measure" aria-hidden="true">
                {value || placeholder || ' '}
            </span>
            <input
                ref={inputRef}
                type="text"
                className="category-picker__field"
                value={value}
                placeholder={placeholder}
                onChange={onChange}
                onFocus={onFocus}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                title={title}
                readOnly={readOnly}
            />
        </span>
    )
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
    const segments = splitCategoryPath(path)
    const empty = {
        stack: [],
        customTail: [],
        path: '',
        selectedKindCode: '',
        selectedParentCode: '',
        selectedCategoryCode: '',
    }
    if (segments.length === 0) return empty

    const stack = [{ type: 'root' }]
    let index = 0
    while (index < segments.length && isPurposeRootLabel(segments[index])) {
        index += 1
    }

    if (index >= segments.length) {
        return {
            stack,
            customTail: [],
            path: segments.join(' > '),
            selectedKindCode: '',
            selectedParentCode: '',
            selectedCategoryCode: '',
        }
    }

    const category = (catalog?.categories || []).find(
        (item) => item.name === segments[index],
    )
    if (!category) {
        return {
            stack,
            customTail: segments.slice(index),
            path: segments.join(' > '),
            selectedKindCode: '',
            selectedParentCode: '',
            selectedCategoryCode: '',
        }
    }

    stack.push({ type: 'category', data: category })
    index += 1

    if (index >= segments.length) {
        return {
            stack,
            customTail: [],
            path: segments.join(' > '),
            selectedKindCode: '',
            selectedParentCode: '',
            selectedCategoryCode: category.code,
        }
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
            index += 1

            let selectedKindCode = isLeaf ? parent.kinds[0] || '' : ''
            if (index < segments.length) {
                const kind = category.kinds.find(
                    (item) =>
                        item.name === segments[index] &&
                        parent.kinds.includes(item.code),
                )
                if (kind) {
                    selectedKindCode = kind.code
                    index += 1
                }
            }

            return {
                stack,
                customTail: index < segments.length ? segments.slice(index) : [],
                path: segments.join(' > '),
                selectedKindCode,
                selectedParentCode: parentCode,
                selectedCategoryCode: category.code,
            }
        }

        const kindDirect = category.kinds.find((item) => item.name === segments[index])
        if (kindDirect) {
            const parent = handpieceParentForKind(kindDirect.code)
            const parentCode = handpieceParentCodeForKind(kindDirect.code)
            if (parent && parent.kinds.length > 1) {
                stack.push({
                    type: 'parent',
                    data: { parentCode, parent, category },
                })
            }
            return {
                stack,
                customTail: segments.slice(index + 1),
                path: segments.join(' > '),
                selectedKindCode: kindDirect.code,
                selectedParentCode: parentCode,
                selectedCategoryCode: category.code,
            }
        }
    }

    const maybeKind = category.kinds.find((kind) => kind.name === segments[index])
    if (maybeKind) {
        return {
            stack,
            customTail: segments.slice(index + 1),
            path: segments.join(' > '),
            selectedKindCode: maybeKind.code,
            selectedParentCode: '',
            selectedCategoryCode: category.code,
        }
    }

    return {
        stack,
        customTail: segments.slice(index),
        path: segments.join(' > '),
        selectedKindCode: '',
        selectedParentCode: '',
        selectedCategoryCode: category.code,
    }
}

function CategoryModal({
    catalog,
    purpose,
    initialPath = '',
    selectedKindCode: selectedKindCodeProp = '',
    selectedParentCode: selectedParentCodeProp = '',
    selectedCategoryCode: selectedCategoryCodeProp = '',
    onSelect,
    onClose,
    onDraftPathChange,
}) {
    const rootLabel = getPurposeRoot(purpose || 'Стоматология')
    const initial = navigationFromPath(catalog, purpose, initialPath)
    const [stack, setStack] = useState(initial.stack)
    const [customTail, setCustomTail] = useState(initial.customTail)
    const [showSelection, setShowSelection] = useState(true)
    const selectedKindCode = selectedKindCodeProp || initial.selectedKindCode || ''
    const selectedParentCode =
        selectedParentCodeProp || initial.selectedParentCode || ''
    const selectedCategoryCode =
        selectedCategoryCodeProp || initial.selectedCategoryCode || ''
    const openedHere =
        showSelection &&
        customTail.length === 0 &&
        stack.length === initial.stack.length &&
        stack.every((frame, index) => frame.type === initial.stack[index]?.type)
    const markKind = openedHere ? selectedKindCode : ''
    const markParent = openedHere ? selectedParentCode : ''
    const markCategory =
        openedHere && !selectedKindCode && !selectedParentCode
            ? selectedCategoryCode
            : ''

    useEffect(() => {
        const prefix = catalogPathSegments(initial.stack, rootLabel)
        const path = buildDraftPath(prefix, initial.customTail, '')
        if (path) onDraftPathChange?.(path)
    }, [])

    const publishDraft = (prefix, tail, draft = '') => {
        onDraftPathChange?.(buildDraftPath(prefix, tail, draft))
    }

    const syncPath = (nextStack = stack, nextTail = customTail) => {
        publishDraft(catalogPathSegments(nextStack, rootLabel), nextTail, '')
    }

    useEffect(() => {
        syncPath()
    }, [stack, customTail])

    const resetCustomFlow = (nextStack = stack) => {
        setCustomTail([])
        syncPath(nextStack, [])
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
                    selected: false,
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
                    selected: cat.code === markCategory,
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
                                selected:
                                    code === markParent ||
                                    (kind && kind.code === markKind),
                                data: { kind, category: cat },
                                onPick: () => confirmKind(kind, cat, parent),
                            }
                        }
                        return {
                            key: code,
                            label: parent.name,
                            hasChildren: true,
                            selected: code === markParent,
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
                    selected: kind.code === markKind,
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
                        selected: kind.code === markKind,
                        data: { kind, category },
                        onPick: () => confirmKind(kind, category, parent),
                    })),
            }
        }

        return { title: '', items: [] }
    }

    const { title, items } = getCurrent()

    const goBack = () => {
        setShowSelection(false)
        if (customTail.length > 0) {
            const prefix = catalogPathSegments(stack, rootLabel)
            const nextTail = customTail.slice(0, -1)
            const path = [...prefix, ...nextTail].join(' > ')
            const nav = navigationFromPath(catalog, purpose, path)
            setStack(nav.stack.length ? nav.stack : [{ type: 'root' }])
            setCustomTail(nav.customTail)
            return
        }
        if (stack.length <= 1) {
            setStack([])
            setCustomTail([])
            onDraftPathChange?.('')
            return
        }
        setStack(stack.slice(0, -1))
        setCustomTail([])
    }

    const showBack = stack.length > 0 || customTail.length > 0
    const inCustomLevel = customTail.length > 0

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
                            className={`modal-sheet__item${item.selected ? ' modal-sheet__item--selected' : ''}`}
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
                    <p className="paragraph">Добавить категорию</p>
                    <p className="paragraph">Заполните категорию в поле для ввода</p>
                    <p style={{ fontWeight: 'bold' }} className="paragraph">Пример правильного заполнения:</p>
                    <img
                        className="modal-sheet__example"
                        src="/images/category-path-example.png"
                        alt="Пример пути категории"
                    />
                </div>
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
    const [modalOpen, setModalOpen] = useState(false)
    const [pathPreview, setPathPreview] = useState('')
    const [modalKey, setModalKey] = useState(0)
    const [modalStartPath, setModalStartPath] = useState('')
    const [pathFields, setPathFields] = useState([''])
    const [pathFromModal, setPathFromModal] = useState(false)
    const [pathDetermined, setPathDetermined] = useState(false)
    const [fullName, setFullName] = useState('')
    const [nameTouched, setNameTouched] = useState(false)
    const [nameAgreed, setNameAgreed] = useState(false)
    const [agreeBusy, setAgreeBusy] = useState(false)
    const autoSubtypeKeyRef = useRef('')
    const typeResolveTimerRef = useRef(null)

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
            const nextProductName =
                savedKind === OTHER_KIND_CODE
                    ? savedName || lastSegment
                    : savedName
            setProductName(nextProductName)
            setCategoryPath(savedPath)
            if (
                savedKind === OTHER_KIND_CODE &&
                String(nextProductName || '').trim()
            ) {
                const prefix = splitCategoryPath(savedPath).filter(
                    (part) =>
                        part.toLowerCase() !==
                        String(nextProductName).trim().toLowerCase(),
                )
                setPathFields(
                    normalizeUndeterminedPathFields(
                        [...prefix, nextProductName],
                        nextProductName,
                    ),
                )
                setPathFromModal(false)
                setPathDetermined(false)
            } else {
                setPathFields(pathToFields(savedPath))
                setPathFromModal(Boolean(String(savedPath || '').trim()))
                setPathDetermined(
                    Boolean(savedKind) &&
                        savedKind !== OTHER_KIND_CODE &&
                        Boolean(String(savedPath || '').trim()),
                )
            }
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
            const autoName = [
                String(nextProductName || '').trim(),
                String(product.brandName || '').trim(),
                String(product.productLine || '').trim(),
            ]
                .filter(Boolean)
                .join(' ')
            const storedName = String(product.fullName || '').trim()
            if (storedName) {
                setFullName(storedName)
                setNameTouched(storedName !== autoName)
                setNameAgreed(true)
            } else {
                setFullName(autoName)
                setNameTouched(false)
                setNameAgreed(false)
            }
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

    const applyUndeterminedPath = (typeName) => {
        const type = String(typeName || '').trim()
        const fields = normalizeUndeterminedPathFields(['', type], type)
        setPathFields(fields)
        setCategoryPath(fieldsToPathKeepAll(fields))
        setPathFromModal(false)
        setPathDetermined(false)
        setKindCode(OTHER_KIND_CODE)
        setPurpose(OTHER_PURPOSE)
        setCategoryCode('')
        setHandpieceParent('')
    }

    const resolveProductType = (rawType, { openSubtypes = true } = {}) => {
        const type = String(rawType || '').trim()
        if (!type) {
            setCategoryCode('')
            setHandpieceParent('')
            setKindCode('')
            setCategoryPath('')
            setPathFields([''])
            setPathFromModal(false)
            setPathDetermined(false)
            setPathPreview('')
            setModalStartPath('')
            setModalOpen(false)
            autoSubtypeKeyRef.current = ''
            return
        }

        const matches = findTypeMatches(catalog, type)
        const subtypeMatch = matches.find(
            (item) => item.hasSubtypes && item.matchKind === 'parent' && item.parent,
        )
        const categoryMatch = matches.find(
            (item) => item.matchKind === 'category' && item.category,
        )
        const kindMatch =
            matches.find((item) => item.matchKind === 'kind' && item.kind) || null

        if (categoryMatch?.category) {
            const path = buildCategoryCatalogPath(
                purpose || 'Стоматология',
                categoryMatch.category,
            )
            setPurpose((prev) =>
                prev === OTHER_PURPOSE ? 'Стоматология' : prev || 'Стоматология',
            )
            setCategoryCode(categoryMatch.category.code)
            setHandpieceParent('')
            setKindCode('')
            setCategoryPath(path)
            setPathFields(pathToFields(path))
            setPathFromModal(true)
            setPathDetermined(true)
            if (openSubtypes) {
                const key = `category:${categoryMatch.category.code}`
                if (autoSubtypeKeyRef.current !== key) {
                    autoSubtypeKeyRef.current = key
                    openModalAt(path)
                }
            }
            return
        }

        if (subtypeMatch) {
            const path = buildParentCatalogPath(
                purpose || 'Стоматология',
                subtypeMatch.category,
                subtypeMatch.parent,
            )
            const canonicalType =
                subtypeMatch.parent.productName ||
                subtypeMatch.parent.name ||
                type
            setPurpose((prev) => prev || 'Стоматология')
            setCategoryCode(subtypeMatch.category.code)
            setHandpieceParent(subtypeMatch.parentCode)
            setKindCode('')
            setProductName(canonicalType)
            setCategoryPath(path)
            setPathFields(pathToFields(path))
            setPathFromModal(true)
            setPathDetermined(true)
            if (openSubtypes) {
                const key = `parent:${subtypeMatch.parentCode}`
                if (autoSubtypeKeyRef.current !== key) {
                    autoSubtypeKeyRef.current = key
                    openModalAt(path)
                }
            }
            return
        }

        if (kindMatch?.kind) {
            const parent =
                kindMatch.parent ||
                handpieceParentForKind(kindMatch.kind.code) ||
                null
            const path = buildKindCatalogPath(
                purpose || 'Стоматология',
                kindMatch.category,
                parent,
                kindMatch.kind,
            )
            const canonicalType = getProductName(
                kindMatch.kind,
                kindMatch.category.code,
            )
            setPurpose((prev) => (prev === OTHER_PURPOSE ? 'Стоматология' : prev || 'Стоматология'))
            setCategoryCode(kindMatch.category.code)
            setHandpieceParent(
                kindMatch.parentCode || handpieceParentCodeForKind(kindMatch.kind.code),
            )
            setKindCode(kindMatch.kind.code)
            setProductName(canonicalType || type)
            setCategoryPath(path)
            setPathFields(pathToFields(path))
            setPathFromModal(true)
            setPathDetermined(true)
            autoSubtypeKeyRef.current = `kind:${kindMatch.kind.code}`
            setModalOpen(false)
            setPathPreview('')
            setModalStartPath('')
            return
        }

        autoSubtypeKeyRef.current = ''
        applyUndeterminedPath(type)
        setModalOpen(false)
        setPathPreview('')
        setModalStartPath('')
    }

    const handleProductTypeChange = (value) => {
        setProductName(value)
        if (typeResolveTimerRef.current) {
            window.clearTimeout(typeResolveTimerRef.current)
        }
        typeResolveTimerRef.current = window.setTimeout(() => {
            resolveProductType(value, { openSubtypes: true })
        }, 350)
    }

    const handleProductTypeBlur = () => {
        if (typeResolveTimerRef.current) {
            window.clearTimeout(typeResolveTimerRef.current)
            typeResolveTimerRef.current = null
        }
        resolveProductType(productName, { openSubtypes: true })
    }

    useEffect(() => {
        return () => {
            if (typeResolveTimerRef.current) {
                window.clearTimeout(typeResolveTimerRef.current)
            }
        }
    }, [])

    useEffect(() => {
        if (!catalog || !loaded) return
        const type = String(productName || '').trim()
        if (!type) return
        if (pathDetermined && kindCode && kindCode !== OTHER_KIND_CODE) return
        if (kindCode === OTHER_KIND_CODE && String(categoryPath || '').trim()) return
        resolveProductType(type, { openSubtypes: false })
        // eslint-disable-next-line react-hooks/exhaustive-deps -- resolve once catalog/load ready
    }, [catalog, loaded])

    const handleClearAll = () => {
        setCategoryCode('')
        setHandpieceParent('')
        setKindCode('')
        setCategoryPath('')
        setPathFromModal(false)
        setPathDetermined(false)
        setPathPreview('')
        setModalStartPath('')
        autoSubtypeKeyRef.current = ''
        const type = String(productName || '').trim()
        if (type) {
            applyUndeterminedPath(type)
        } else {
            setPathFields([''])
        }
        if (modalOpen) {
            setModalKey((prev) => prev + 1)
            setModalOpen(false)
        }
    }

    const handleCategorySelect = (selection) => {
        setCategoryCode(selection.categoryCode || '')
        setKindCode(selection.kindCode || '')
        setHandpieceParent(selection.handpieceParent || '')
        setCategoryPath(selection.path || '')
        setPathFields(pathToFields(selection.path || ''))
        setPathFromModal(Boolean(String(selection.path || '').trim()))
        setPathDetermined(
            Boolean(selection.kindCode) && selection.kindCode !== OTHER_KIND_CODE,
        )
        if (selection.kindCode === OTHER_KIND_CODE) {
            setPurpose(OTHER_PURPOSE)
        } else {
            setPurpose((prev) => (prev === OTHER_PURPOSE ? 'Стоматология' : prev || 'Стоматология'))
            if (selection.productName) {
                setProductName(selection.productName)
            }
        }
        setPathPreview('')
        setModalStartPath('')
        setModalOpen(false)
        autoSubtypeKeyRef.current = selection.kindCode
            ? `kind:${selection.kindCode}`
            : autoSubtypeKeyRef.current
    }

    const handleModalClose = () => {
        setPathPreview('')
        setModalStartPath('')
        setModalOpen(false)
    }

    const commitPathFields = (fields, { manual = false } = {}) => {
        const type = String(productName || '').trim()

        if (!pathDetermined && type) {
            const normalized = normalizeUndeterminedPathFields(fields, type)
            const path = fieldsToPathKeepAll(normalized)
            setPathFields(normalized)
            setCategoryPath(path)
            setPathFromModal(false)
            setKindCode(OTHER_KIND_CODE)
            setPurpose(OTHER_PURPOSE)
            setCategoryCode('')
            setHandpieceParent('')
            return
        }

        const normalized = normalizePathFields(fields)
        const path = fieldsToCategoryPath(normalized)
        setPathFields(normalized)
        setCategoryPath(path)
        setPathFromModal(!manual && Boolean(path))
        if (!path) {
            setCategoryCode('')
            setHandpieceParent('')
            setKindCode('')
            setPathFromModal(false)
            setPathDetermined(false)
            return
        }
        if (manual) {
            setKindCode(OTHER_KIND_CODE)
            setPurpose(OTHER_PURPOSE)
            setCategoryCode('')
            setHandpieceParent('')
            setPathDetermined(false)
            if (type) {
                const withType = normalizeUndeterminedPathFields(
                    [...normalized.filter((item) => String(item).trim()), type],
                    type,
                )
                setPathFields(withType)
                setCategoryPath(fieldsToPathKeepAll(withType))
            }
        }
    }

    const handlePathFieldChange = (index, value) => {
        if (modalOpen) {
            setModalOpen(false)
            setPathPreview('')
            setModalStartPath('')
        }
        const type = String(productName || '').trim()
        const isTypeSlot =
            !pathDetermined && type && index === pathFields.length - 1
        if (isTypeSlot) return

        const next = [...pathFields]
        next[index] = value
        if (!pathFromModal || !pathDetermined) {
            commitPathFields(next, { manual: true })
            return
        }
        commitPathFields(next, { manual: true })
    }

    const handlePathFieldFocus = (index) => {
        if (!modalOpen) return
        // Determined catalog path: click/focus on a segment opens the modal there — don't close it.
        if (pathDetermined || pathFromModal) return
        const type = String(productName || '').trim()
        const isTypeSlot =
            !pathDetermined && type && index === pathFields.length - 1
        if (isTypeSlot) return
        setModalOpen(false)
        setPathPreview('')
        setModalStartPath('')
    }

    const pathPrefixAt = (index) => {
        const segments = []
        for (let i = 0; i <= index; i += 1) {
            const text = String(pathFields[i] || '').trim()
            if (!text) break
            segments.push(text)
        }
        return segments.join(' > ')
    }

    const handlePathSegmentOpen = (index) => {
        const type = String(productName || '').trim()
        const isTypeSlot =
            !pathDetermined && type && index === pathFields.length - 1
        if (isTypeSlot) return
        if (!String(pathFields[index] || '').trim()) return

        const openIndex = index <= 0 ? 0 : index - 1
        const source = pathPrefixAt(openIndex)
        if (!source) return
        openModalAt(source)
    }

    const handleModalDraftPath = (path) => {
        setPathPreview(path)
        setPathFields(pathToFields(path))
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

    const isLeafCategory =
        Boolean(kindCode) && kindCode !== OTHER_KIND_CODE
    const displayedFields = (() => {
        if (!pathDetermined && !isLeafCategory) return pathFields
        const next = [...(pathFields || [])]
        while (next.length > 0 && !String(next[next.length - 1] || '').trim()) {
            next.pop()
        }
        return next.length ? next : pathFields
    })()
    const composedFullName = [
        String(productName || '').trim(),
        String(brandName || '').trim(),
        String(productLine || '').trim(),
    ]
        .filter(Boolean)
        .join(' ')

    useEffect(() => {
        if (nameTouched) return
        setFullName(composedFullName)
    }, [composedFullName, nameTouched])

    const buildNamePayload = (nameText, hasLogo) => ({
        fullName: String(nameText || '').trim(),
        nameIncludesLogo: Boolean(hasLogo),
        nameIncludesType: false,
        nameIncludesBrand: Boolean(String(brandName || '').trim()),
        nameIncludesLine: Boolean(String(productLine || '').trim()),
        nameIncludesModel: false,
    })

    const handleAgreeName = async () => {
        if (!productId) {
            setError('Сначала создайте карточку на главной странице')
            return
        }
        if (!loaded) {
            setError('Карточка ещё загружается, подождите секунду')
            return
        }
        const nameText = String(fullName || '').trim()
        if (!nameText) {
            setError('Заполните наименование линейки продукта')
            return
        }
        setAgreeBusy(true)
        setError('')
        try {
            await productsApi.saveName(
                productId,
                buildNamePayload(nameText, Boolean(brandLogo)),
            )
            setNameTouched(true)
            setNameAgreed(true)
        } catch (agreeError) {
            setError(agreeError.message || 'Не удалось согласовать наименование')
        } finally {
            setAgreeBusy(false)
        }
    }

    const save = async () => {
        if (!productId) throw new Error('Сначала создайте карточку на главной странице')
        if (!loaded || !productSnapshot) {
            throw new Error('Карточка ещё загружается, подождите секунду')
        }
        const trimmedProductName = String(productName || '').trim()
        if (!trimmedProductName) {
            throw new Error('Укажите тип продукта')
        }
        if (!String(categoryPath || '').trim()) {
            throw new Error('Заполните путь категории')
        }
        if (kindCode === OTHER_KIND_CODE) {
            const segments = splitCategoryPath(categoryPath)
            if (segments.length < 2) {
                throw new Error('Заполните путь категории')
            }
        } else if (!kindCode) {
            throw new Error('Выберите подтип продукта в каталоге')
        }

        const trimmedBrand = String(brandName || '').trim()
        if (trimmedBrand && !brandDoc) {
            throw new Error('Добавьте документы на бренд')
        }
        const trimmedLine = String(productLine || '').trim()
        const nameText = composedFullName
        const savePurpose =
            purpose ||
            (kindCode === OTHER_KIND_CODE ? OTHER_PURPOSE : 'Стоматология')

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
            purpose: savePurpose,
            kindCode: kindCode || OTHER_KIND_CODE,
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

        await productsApi.saveName(
            productId,
            buildNamePayload(nameText, Boolean(savedLogo)),
        )
        setNameAgreed(Boolean(nameText))
    }

    const typeFilled = Boolean(String(productName || '').trim())
    const wizardTotal = productWizardTotal(
        kindCode
            ? {
                kindCode,
                categoryCode,
                categoryPath,
                variantAxes: productSnapshot?.variantAxes || [],
            }
            : null,
    )

    return (
        <>
            <div className="container stage2-page">
                <InformationAboutProductLine productId={productId} />
                <h1 className="title stage2-title">Этап 2 - Категория, бренд и наименование линейки продукта</h1>
                {!productId && <p className="form-error">Откройте создание карточки с главной страницы.</p>}
                {error && <p className="form-error">{error}</p>}

                <div className="stage2-workarea">
                    <div className="stage2-brand-block stage3-page">
                        <h2 className="stage2-section-title">Бренд и линейка продукта</h2>

                        <h3 className="stage3-subtitle">Бренд</h3>

                        <div className="stage3-row">
                            <Tip
                                text={BRAND_TIPS.brand}
                                images={[
                                    { src: "/images/brand1.png" },
                                    { src: "/images/fillingBrand.png" },
                                ]}
                                imageSize="large"
                                bubbleSize="large"
                            />
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
                                {String(brandName || '').trim() ? (
                                    <span className="stage2-brand-doc-required" aria-hidden="true"> ✱</span>
                                ) : null}
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
                                images={[
                                    { src: "/images/ruler.png" },
                                    { src: "/images/fillingRuler.png" },
                                ]}
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
                    </div>

                    <div className="matches-divider" />

                    <h2 className="stage2-section-title stage2-category-title">Категория продукта</h2>

                    <div
                        className={`field--product-type${modalOpen ? ' field--product-type--after-modal' : ''}`}
                    >
                        <Tip inline text={PRODUCT_TYPE_TIP} />
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
                            onChange={(event) => handleProductTypeChange(event.target.value)}
                            onBlur={handleProductTypeBlur}
                            placeholder="Введите значение"
                        />
                    </div>

                    {typeFilled && !pathDetermined && (
                        <p className="stage2-path-hint">
                            Путь не определен, самостоятельно заполните категорию в поле ниже
                        </p>
                    )}

                    {typeFilled && (
                        <div className="field field--category">
                            <p className="paragraph">Категория продукта (строится из вашего выбора)</p>

                            <div className="category-picker">
                                <button
                                    type="button"
                                    className="category-picker__burger"
                                    title="Меню"
                                    onClick={() => {
                                        if (modalOpen) {
                                            handleModalClose()
                                            return
                                        }
                                        openModalAt(
                                            fieldsToPathKeepAll(
                                                pathDetermined
                                                    ? pathFields
                                                    : pathFields.slice(0, -1),
                                            ) || '',
                                        )
                                    }}
                                >
                                    ☰
                                </button>

                                <div className="category-picker__path-box">
                                    <div className="category-picker__fields">
                                        {displayedFields.map((value, index) => {
                                            const type = String(productName || '').trim()
                                            const isTypeSlot =
                                                !pathDetermined &&
                                                type &&
                                                index === displayedFields.length - 1
                                            return (
                                                <div
                                                    className="category-picker__segment"
                                                    key={`path-field-${index}`}
                                                >
                                                    {index > 0 && (
                                                        <span
                                                            className="category-picker__chevron"
                                                            aria-hidden="true"
                                                        >
                                                            ›
                                                        </span>
                                                    )}
                                                    <CategoryPathField
                                                        value={value}
                                                        placeholder="Категория"
                                                        onChange={(event) =>
                                                            handlePathFieldChange(
                                                                index,
                                                                event.target.value,
                                                            )
                                                        }
                                                        onFocus={() => handlePathFieldFocus(index)}
                                                        onClick={() => {
                                                            if (isTypeSlot || !String(value || '').trim()) return
                                                            if (pathDetermined || pathFromModal) {
                                                                handlePathSegmentOpen(index)
                                                            }
                                                        }}
                                                        onDoubleClick={() => {
                                                            if (isTypeSlot) return
                                                            handlePathSegmentOpen(index)
                                                        }}
                                                        title={
                                                            isTypeSlot
                                                                ? 'Тип продукта'
                                                                : 'Нажмите, чтобы открыть каталог на этом уровне'
                                                        }
                                                        readOnly={isTypeSlot || pathDetermined}
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
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

                            <p className="stage2-category-result">
                                Результат заполнения категории:{' '}
                                <span className="stage2-category-result__path">
                                    {String(
                                        pathPreview ||
                                            categoryPath ||
                                            fieldsToPathKeepAll(displayedFields) ||
                                            '',
                                    ).trim() || '—'}
                                </span>
                            </p>
                        </div>
                    )}

                    {modalOpen && (
                        <CategoryModal
                            key={modalKey}
                            catalog={catalog}
                            purpose={purpose || 'Стоматология'}
                            initialPath={modalStartPath}
                            selectedKindCode={kindCode}
                            selectedParentCode={handpieceParent}
                            selectedCategoryCode={categoryCode}
                            onSelect={handleCategorySelect}
                            onClose={handleModalClose}
                            onDraftPathChange={handleModalDraftPath}
                        />
                    )}

                    <div className="matches-divider" />

                    <div className="stage2-brand-block stage3-page">
                        <h2 className="stage2-section-title">Наименование линейки продукта</h2>
                        <p className="stage4-lead">
                            Наименование линейки продукта формируется из Логотипа + Типа
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
                        {/* <div className="stage2-agree-wrap">
                            <button
                                type="button"
                                className="excel-import-trigger__btn"
                                onClick={handleAgreeName}
                                disabled={agreeBusy || !String(fullName || '').trim()}
                            >
                                {agreeBusy ? 'Сохранение…' : nameAgreed ? 'Согласовано' : 'Согласовать'}
                            </button>
                        </div> */}
                    </div>
                </div>
            </div>

            <BottomBar current={2} total={wizardTotal} prevPath="/stage1" nextPath="/stage3" onSave={save} />
        </>
    )
}

export default Stage2