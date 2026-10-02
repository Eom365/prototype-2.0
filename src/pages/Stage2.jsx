import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BottomBar from '../components/BottomBar'
import { catalogApi, productsApi } from '../api'
import {
    HANDPIECE_PARENTS,
    handpieceParentCodeForKind,
    handpieceParentForKind,
    handpieceProductName,
} from '../handpieceKinds'
import './Stage2.css'

function getPurposeRoot(purpose) {
    return purpose === 'Стоматология' ? 'Профессиональная стоматология' : 'Стоматология'
}

export const OTHER_KIND_CODE = 'other'
const OTHER_PURPOSE = 'Иное'

function getProductName(kind, categoryCode) {
    if (kind.code === OTHER_KIND_CODE) return ''
    if (categoryCode === 'handpieces') {
        return handpieceProductName(kind.code, kind.name)
    }
    return kind.name
}

function getCategoryPath(kind, categoryName, purpose) {
    if (kind.code === OTHER_KIND_CODE) return ''
    const parent = handpieceParentForKind(kind.code)
    if (parent) {
        if (parent.name === kind.name) {
            return `${getPurposeRoot(purpose)} > ${categoryName} > ${kind.name}`
        }
        return `${getPurposeRoot(purpose)} > ${categoryName} > ${parent.name} > ${kind.name}`
    }
    return `${getPurposeRoot(purpose)} > ${categoryName} > ${kind.name}`
}

function CategoryModal({ catalog, purpose, onSelect, onClose }) {
    // сразу открываемся на списке категорий внутри корня
    const [stack, setStack] = useState([{ type: 'root' }])
    const [selected, setSelected] = useState(null)
    const [customText, setCustomText] = useState('')

    const rootLabel = getPurposeRoot(purpose || 'Стоматология')

    const getCurrent = () => {
        if (!catalog) return { title: 'Укажите категорию продукта', items: [] }

        // Экран 1 — корень (показываем категории)
        if (stack.length === 0) {
            return {
                title: 'Укажите категорию продукта',
                items: [{
                    key: 'root',
                    label: rootLabel,
                    hasChildren: true,
                    onPick: () => setStack([{ type: 'root' }]),
                }],
            }
        }

        const current = stack[stack.length - 1]

        // Экран 2 — категории внутри корня
        if (current.type === 'root') {
            return {
                title: rootLabel,
                items: catalog.categories.map((cat) => ({
                    key: cat.code,
                    label: cat.name,
                    hasChildren: true,
                    onPick: () => setStack((prev) => [...prev, { type: 'category', data: cat }]),
                })),
            }
        }

        // Экран 3 — родители наконечников или сразу виды
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
                                onPick: () => setSelected({ kind, category: cat, parent }),
                            }
                        }
                        return {
                            key: code,
                            label: parent.name,
                            hasChildren: true,
                            onPick: () => setStack((prev) => [
                                ...prev,
                                { type: 'parent', data: { parentCode: code, parent, category: cat } },
                            ]),
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
                    onPick: () => setSelected({ kind, category: cat, parent: null }),
                })),
            }
        }

        // Экран 4 — виды внутри родителя наконечников
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
                        onPick: () => setSelected({ kind, category, parent }),
                    })),
            }
        }

        return { title: '', items: [] }
    }

    const { title, items } = getCurrent()

    const goBack = () => {
        if (selected) {
            setSelected(null)
            return
        }
        if (stack.length <= 1) return
        setStack((prev) => prev.slice(0, -1))
    }

    const handleConfirm = () => {
        if (!selected) return
        const { kind, category, parent } = selected

        const parentSegment = parent && parent.name !== kind.name ? ` > ${parent.name}` : ''
        const fullPath = `${rootLabel} > ${category.name}${parentSegment} > ${kind.name}`

        onSelect({
            path: fullPath,
            kindCode: kind.code,
            categoryCode: category.code,
            handpieceParent: parent ? handpieceParentCodeForKind(kind.code) : '',
            productName: getProductName(kind, category.code),
        })
    }

    const handleCustomSubmit = () => {
        const text = customText.trim()
        if (!text) return
        onSelect({
            path: text,
            kindCode: OTHER_KIND_CODE,
            categoryCode: '',
            handpieceParent: '',
            productName: text,
        })
    }

    const showBack = stack.length > 1 || selected

    return (
        <div className="modal-overlay" onClick={onClose}>
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
                    {items.map((item) => {
                        const isSelected = selected && item.data?.kind?.code === selected.kind.code
                        return (
                            <button
                                key={item.key}
                                type="button"
                                className={`modal-sheet__item${isSelected ? ' modal-sheet__item--selected' : ''}`}
                                onClick={item.onPick}
                            >
                                <span>{item.label}</span>
                                {item.hasChildren && (
                                    <span className="modal-sheet__arrow">›</span>
                                )}
                            </button>
                        )
                    })}
                    {items.length === 0 && (
                        <p className="modal-sheet__empty">Нет доступных категорий</p>
                    )}
                </div>

                <div className="modal-sheet__suggest">
                    <p className="paragraph">Добавьте свою категорию</p>
                    <input
                        type="text"
                        className="input"
                        placeholder="Введите наименование категории"
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                    />
                </div>

                {selected && (
                    <div className="modal-sheet__actions">
                        <button
                            type="button"
                            className="modal-sheet__action modal-sheet__action--cancel"
                            onClick={() => setSelected(null)}
                            aria-label="Отменить"
                        >
                            ✕
                        </button>
                        <button
                            type="button"
                            className="modal-sheet__action modal-sheet__action--confirm"
                            onClick={handleConfirm}
                            aria-label="Подтвердить"
                        >
                            ✓
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
    const [error, setError] = useState('')
    const [loaded, setLoaded] = useState(false)
    const [modalOpen, setModalOpen] = useState(true)

    useEffect(() => {
        catalogApi.get().then(setCatalog).catch((loadError) => setError(loadError.message))
    }, [])

    useEffect(() => {
        if (!productId) return
        productsApi.get(productId).then((product) => {
            const savedKind = product.kindCode || ''
            const savedPurpose = product.currentStage >= 2 ? (product.purpose || '') : ''
            setKindCode(savedKind)
            setPurpose(savedKind === OTHER_KIND_CODE ? OTHER_PURPOSE : savedPurpose)
            setProductName(product.productName || '')
            setCategoryPath(product.categoryPath || '')
            setProductLine(product.productLine || '')
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

    const applyKindSelection = (kind, code, nextPurpose = purpose) => {
        const category = catalog?.categories.find((item) => item.code === code)
        if (!category) return
        setProductName(getProductName(kind, code))
        setCategoryPath(getCategoryPath(kind, category.name, nextPurpose))
    }

    const handleClearAll = () => {
        setCategoryCode('')
        setHandpieceParent('')
        setKindCode('')
        setProductName('')
        setCategoryPath('')
    }

    const handleCategorySelect = (selection) => {
        setCategoryCode(selection.categoryCode || '')
        setKindCode(selection.kindCode || '')
        setHandpieceParent(selection.handpieceParent || '')
        setProductName(selection.productName || '')
        setCategoryPath(selection.path || '')
        setModalOpen(false)
    }

    const save = () => {
        if (!productId) throw new Error('Сначала создайте карточку на главной странице')
        if (!loaded) throw new Error('Карточка ещё загружается, подождите секунду')
        return productsApi.saveCategory(productId, {
            purpose,
            kindCode,
            productName,
            categoryPath,
            productLine,
        })
    }

    return (
        <>
            <div className="container stage2-page">
                <h1 className="title stage2-title">Этап 2 - Наименование и категория</h1>
                {!productId && <p className="form-error">Откройте создание карточки с главной страницы.</p>}
                {error && <p className="form-error">{error}</p>}

                <p className="paragraph">Выберите назначение продукта</p>

                <div className="stage2-category-wrap">
                    <div className="field field--category">
                        <p className="paragraph">Категория продукта:</p>

                        <div className="category-picker">
                            <button
                                type="button"
                                className="category-picker__burger"
                                title="Меню"
                                onClick={() => setModalOpen(true)}
                            >
                                ☰
                            </button>

                            <input
                                type="text"
                                className="category-picker__input"
                                value={categoryPath}
                                readOnly
                                onClick={() => setModalOpen(true)}
                                placeholder="Категория"
                            />

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
                </div>
            </div>

            {modalOpen && (
                <CategoryModal
                    catalog={catalog}
                    purpose={purpose}
                    onSelect={handleCategorySelect}
                    onClose={() => setModalOpen(false)}
                />
            )}

            <BottomBar current={2} total={11} prevPath="/stage1" nextPath="/stage2_3" onSave={save} />
        </>
    )
}

export default Stage2