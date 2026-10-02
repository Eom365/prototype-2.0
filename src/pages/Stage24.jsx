import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import BottomBar from '../components/BottomBar'
import { productsApi } from '../api'
import { emptyDescriptionForm, parseDescriptionForm, serializeDescriptionForm } from '../descriptionForm'
import { VARIANT_FILL_STAGE_COUNT, variantFillStageHeading, variantFillStep } from '../stageProgress'
import Stage5Description from './Stage5Description'
import './Stage5.css'
import './Stage24.css'

const TABS = [
    { key: 'description', label: 'Описание' },
    { key: 'complectation', label: 'Комплектация' },
    { key: 'applicationArea', label: 'Область эксплуатации продукта' },
    { key: 'storageConditions', label: 'Условия транспортировки, хранения и эксплуатации' },
    { key: 'precautions', label: 'Меры предосторожности' },
]

const TAB_HINTS = {
    description: 'При заполнении ориентируйтесь на следующие документы: 1. Руководство по эксплуатации',
    complectation: 'Укажите, что входит в комплект поставки.',
    applicationArea: 'Опишите сферу и способ применения продукта.',
    storageConditions: 'Укажите условия транспортировки, хранения и эксплуатации.',
    precautions: 'Укажите меры безопасности и утилизацию.',
}

function Stage24() {
    const navigate = useNavigate()
    const location = useLocation()
    const [params] = useSearchParams()
    const productId = params.get('id')
    const variationId = params.get('variationId')

    const [activeTab, setActiveTab] = useState('description')
    const [completedTabs, setCompletedTabs] = useState([])
    const [phase, setPhase] = useState('edit')
    const [form, setForm] = useState(emptyDescriptionForm)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [loaded, setLoaded] = useState(false)

    const go = (path) => navigate({ pathname: path, search: location.search })
    const currentIndex = TABS.findIndex((tab) => tab.key === activeTab)
    const currentTab = TABS[currentIndex]

    useEffect(() => {
        if (!productId) return
        productsApi.get(productId).then((product) => {
            if (variationId) {
                const variation = (product.variations || []).find(
                    (item) => String(item.id).toLowerCase() === String(variationId).toLowerCase(),
                )
                setForm(parseDescriptionForm({
                    description: variation?.description,
                    complectation: variation?.complectation,
                    applicationArea: variation?.applicationArea,
                    storageConditions: variation?.storageConditions,
                    precautions: variation?.precautions,
                }))
            } else {
                setForm(parseDescriptionForm(product))
            }
            setLoaded(true)
        }).catch((loadError) => setError(loadError.message))
    }, [productId, variationId])

    const patchForm = (section, value) => {
        setForm((prev) => ({ ...prev, [section]: value }))
    }

    const persist = async () => {
        if (!productId || !loaded) return
        const body = serializeDescriptionForm(form)
        if (variationId) {
            await productsApi.saveVariationDescription(productId, variationId, body)
        } else {
            await productsApi.saveDescription(productId, body)
        }
    }

    const handleConfirm = async () => {
        if (busy) return
        setBusy(true)
        setError('')
        try {
            await persist()

            if (phase === 'review') {
                go('/stage18')
                return
            }

            setCompletedTabs((prev) => (prev.includes(activeTab) ? prev : [...prev, activeTab]))
            const nextIndex = currentIndex + 1
            if (nextIndex < TABS.length) {
                setActiveTab(TABS[nextIndex].key)
            } else {
                setPhase('review')
            }
        } catch (saveError) {
            setError(saveError.message || 'Не удалось сохранить')
        } finally {
            setBusy(false)
        }
    }

    const handleCancel = () => {
        if (phase === 'review') {
            setPhase('edit')
            setActiveTab(TABS[TABS.length - 1].key)
            return
        }
        if (currentIndex > 0) {
            setActiveTab(TABS[currentIndex - 1].key)
            return
        }
        go('/stage23')
    }

    return (
        <>
            <div className={`container stage24-page${phase === 'review' ? ' stage24-page--review' : ''}`}>
                <h1 className="title stage24-title">{variantFillStageHeading(24, 'Описание продукта')}</h1>

                {!productId && <p className="form-error">Откройте создание карточки с главной страницы.</p>}
                {error && <p className="form-error">{error}</p>}

                {phase === 'edit' ? (
                    <>
                        <div className="stage24-tabs" role="tablist">
                            {TABS.map((tab) => {
                                const done = completedTabs.includes(tab.key)
                                const active = activeTab === tab.key
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        className={`stage24-tab${active ? ' stage24-tab--active' : ''}${done ? ' stage24-tab--done' : ''}`}
                                        onClick={() => setActiveTab(tab.key)}
                                    >
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </div>

                        <p className="stage24-hint">{TAB_HINTS[activeTab]}</p>
                        <h2 className="stage24-section-title">{currentTab?.label}</h2>

                        <Stage5Description
                            form={form}
                            onChange={patchForm}
                            only={activeTab}
                        />
                    </>
                ) : (
                    <>
                        <h2 className="stage24-section-title">Заполненное описание продукта</h2>
                        <p className="stage24-hint">Проверьте все разделы описания перед переходом дальше.</p>
                        <Stage5Description
                            form={form}
                            onChange={patchForm}
                        />
                    </>
                )}
            </div>

            {phase !== 'review' && (
            <div className="wizard-action-bar">
                <button
                    type="button"
                    className="wizard-action-btn wizard-action-btn--no"
                    onClick={handleCancel}
                    title="Назад"
                    disabled={busy}
                >
                    <span className="wizard-action-btn__step">
                        {variantFillStep(24)} из {VARIANT_FILL_STAGE_COUNT}
                    </span>
                    <span className="wizard-action-btn__circle">✕</span>
                </button>
                <button
                    type="button"
                    className="wizard-action-btn wizard-action-btn--yes"
                    onClick={handleConfirm}
                    title="Далее"
                    disabled={busy || !loaded}
                >
                    <span className="wizard-action-btn__circle">✓</span>
                </button>
            </div>
            )}

            <BottomBar
                current={variantFillStep(24)}
                total={VARIANT_FILL_STAGE_COUNT}
                prevPath="/stage23"
                nextPath="/stage18"
                onSave={persist}
            />
        </>
    )
}

export default Stage24
