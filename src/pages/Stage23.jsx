// Характеристики 5.1
import { useRef, useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import './Stage23.css'

const TABS = [
    { key: 'main', label: 'Основные' },
    { key: 'dimensions', label: 'Габариты и вес' },
    { key: 'manufacturer', label: 'Производитель' },
    { key: 'tech', label: 'Технические характеристики' },
    { key: 'custom', label: 'Добавьте характеристики' },
]

function Stage23() {
    const navigate = useNavigate()
    const location = useLocation()
    const [params] = useSearchParams()
    const productId = params.get('id')

    const go = (path) => navigate({ pathname: path, search: location.search })

    const [activeTab, setActiveTab] = useState('main')

    // ===== Поля =====
    const [brand, setBrand] = useState('TOSI')
    const [productLine, setProductLine] = useState('')
    const [model, setModel] = useState('')
    const [article, setArticle] = useState('')

    const [logo, setLogo] = useState({ url: '/images/brand.png', name: 'tosi.png' })
    const logoInputRef = useRef(null)

    const handleLogoClick = () => {
        logoInputRef.current?.click()
    }

    const handleLogoChange = (event) => {
        const file = event.target.files?.[0]
        if (!file) return
        const url = URL.createObjectURL(file)
        setLogo({ url, name: file.name })
        event.target.value = ''
    }

    const handleLogoRemove = () => {
        if (logo?.url?.startsWith('blob:')) URL.revokeObjectURL(logo.url)
        setLogo(null)
    }

    // Текущий индекс вкладки
    const currentIndex = TABS.findIndex((t) => t.key === activeTab)

    // Индексы уже пройденных вкладок (для подсветки)
    const [completedTabs, setCompletedTabs] = useState([])

    const handleSave = () => {
        console.log('save', { brand, productLine, model, article, logo })

        // Пометить текущую как пройденную
        setCompletedTabs((prev) => (
            prev.includes(activeTab) ? prev : [...prev, activeTab]
        ))

        // Перейти на следующую вкладку
        const nextIndex = currentIndex + 1
        if (nextIndex < TABS.length) {
            setActiveTab(TABS[nextIndex].key)
        } else {
            // Все вкладки пройдены — выходим
            go('/stage13')
        }
    }

    const handleCancel = () => {
        // Назад на предыдущую вкладку, либо на /stage13 с первой
        if (currentIndex > 0) {
            setActiveTab(TABS[currentIndex - 1].key)
        } else {
            go('/stage13')
        }
    }

    return (
        <>
            <div className="container">
                {/* ===== Панель табов ===== */}
                <div className="tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            className={`tab ${activeTab === tab.key ? 'tab--active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ===== Контент вкладки "Основные" ===== */}
                {activeTab === 'main' && (
                    <>
                        <h2 className="section-title">Основные</h2>
                        <img
                            src="/images/one.png"
                            alt="Презентационное изображение повышающих наконечников"
                            className="OOp"
                        />
                        {/* ----- Поля ввода ----- */}
                        <div className="fields">
                            {/* Скрытый input для логотипа */}
                            <input
                                type="file"
                                accept="image/*"
                                ref={logoInputRef}
                                onChange={handleLogoChange}
                                style={{ display: 'none' }}
                            />

                            {/* Бренд */}
                            <div className="field-row">
                                <span className="info-icon" title="Подсказка">ⓘ</span>
                                <span className="field-name">Бренд</span>
                                <input
                                    type="text"
                                    className="field-input"
                                    placeholder="Значение"
                                    value={brand}
                                    onChange={(event) => setBrand(event.target.value)}
                                />
                            </div>

                            {/* Логотип */}
                            <div className="field-row">
                                <span className="info-icon" title="Подсказка">ⓘ</span>
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
                                        onClick={handleLogoClick}
                                    >
                                        <span className="file-icon">📎</span>
                                        <span className="file-text">Загрузить фотографию</span>
                                    </button>
                                )}
                            </div>

                            {/* Линейка */}
                            <div className="field-row">
                                <span className="info-icon" title="Подсказка">ⓘ</span>
                                <span className="field-name">Линейка продукции</span>
                                <input
                                    type="text"
                                    className="field-input"
                                    placeholder="Линейка продукции"
                                    value={productLine}
                                    onChange={(event) => setProductLine(event.target.value)}
                                />
                            </div>

                            {/* Модель */}
                            <div className="field-row">
                                <span className="info-icon" title="Подсказка">ⓘ</span>
                                <span className="field-name">Модель</span>
                                <input
                                    type="text"
                                    className="field-input"
                                    placeholder="Значение"
                                    value={model}
                                    onChange={(event) => setModel(event.target.value)}
                                />
                                <span className="required-mark">✱</span>
                            </div>

                            {/* Артикул */}
                            <div className="field-row">
                                <span className="info-icon" title="Подсказка">ⓘ</span>
                                <span className="field-name">Артикул продукта от завода производителя</span>
                                <input
                                    type="text"
                                    className="field-input"
                                    placeholder="Семь цифр: 1234567"
                                    value={article}
                                    onChange={(event) => setArticle(event.target.value)}
                                />
                                <span className="required-mark">✱</span>
                            </div>
                        </div>
                    </>
                )}

                {/* ===== Остальные вкладки (заглушки) ===== */}
                {activeTab !== 'main' && (
                    <div className="tab-placeholder">
                        <p>Содержимое вкладки «{TABS.find((t) => t.key === activeTab)?.label}»</p>
                    </div>
                )}
            </div>

            {/* ===== Нижняя панель ===== */}
            <div className="action-bar">
                <button
                    type="button"
                    className="action-btn action-btn--no"
                    onClick={handleCancel}
                    title="Отмена"
                >
                    <span className="action-btn__circle">✕</span>
                </button>

                <button
                    type="button"
                    className="action-btn action-btn--yes"
                    onClick={handleSave}
                    title="Сохранить"
                >
                    <span className="action-btn__circle">✓</span>
                </button>
            </div>
        </>
    )
}

export default Stage23