import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { notifyProductUpdated } from '../api'
import './BottomBar.css'

function BottomBar({
    current,
    total = 11,
    nextPath,
    prevPath,
    onSave,
    onFinish,
    onNext,
    showStep = true,

    /* === Новые пропсы для «Предварительный просмотр / Управление товарами» === */
    previewPath,          // куда перейти по кнопке «Предварительный просмотр»
    onPreview,            // кастомный обработчик вместо перехода
    managePath,           // куда перейти по кнопке «Управление товарами»
    onManage,             // кастомный обработчик вместо перехода
    manageDisabled = false, // сделать «Управление товарами» неактивной
    previewLabel = 'Предварительный просмотр',
    manageLabel = 'Управление товарами',
    homeIconSrc = '/images/home-icon.svg', // путь к картинке-иконке
}) {
    const navigate = useNavigate()
    const location = useLocation()
    const [params] = useSearchParams()
    const [busy, setBusy] = useState(false)

    /* ==== Оригинальная логика сохранения/навигации ==== */
    const go = async (path, finish) => {
        if (busy) return
        setBusy(true)
        try {
            if (onSave && finish) await onSave()
            if (finish) notifyProductUpdated(params.get('id'))
            if (finish && onFinish) await onFinish()
            if (finish && onNext) {
                onNext()
                return
            }
            if (path) {
                navigate({
                    pathname: path,
                    search: path === '/' ? '' : location.search,
                })
            }
        } catch (error) {
            window.alert(error.message || 'Не удалось сохранить')
        } finally {
            setBusy(false)
        }
    }

    /* ==== Обработчики нового layout ==== */
    const handlePreview = async () => {
        if (busy) return
        setBusy(true)
        try {
            if (onSave) await onSave()
            notifyProductUpdated(params.get('id'))
            if (onPreview) {
                onPreview()
                return
            }
            if (previewPath) {
                navigate({ pathname: previewPath, search: location.search })
            }
        } catch (error) {
            window.alert(error.message || 'Не удалось сохранить')
        } finally {
            setBusy(false)
        }
    }

    const handleManage = async () => {
        if (busy || manageDisabled) return
        if (onManage) {
            onManage()
            return
        }
        if (managePath) {
            navigate({ pathname: managePath, search: location.search })
        }
    }

    /* ==== Решаем, какой layout рендерить ==== */
    const isPreviewLayout =
        Boolean(previewPath || onPreview || managePath || onManage)

    if (isPreviewLayout) {
        return (
            <div className="bottom-bar--preview">
                {/* 1. Иконка — на главную */}
                <button
                    type="button"
                    className="bottom-bar__home"
                    onClick={() => go('/', false)}
                    title="На главную"
                    disabled={busy}
                >
                    <img
                        src={homeIconSrc}
                        alt="На главную"
                        className="bottom-bar__home-icon"
                    />
                </button>

                {/* 2. Предварительный просмотр */}
                <button
                    type="button"
                    className="bottom-bar__preview"
                    onClick={handlePreview}
                    disabled={busy}
                >
                    {busy ? 'Сохранение...' : previewLabel}
                </button>

                {/* 3. Управление товарами */}
                <button
                    type="button"
                    className="bottom-bar__manage"
                    onClick={handleManage}
                    disabled={busy || manageDisabled}
                >
                    {manageLabel}
                </button>
            </div>
        )
    }

    /* ==== Старый layout — если новые пропсы не переданы ==== */
    return (
        <div className="bottom-bar">
            <div className="bottom-bar__col">
                {showStep && (
                    <span className="bottom-bar__stage">
                        {current} из {total}
                    </span>
                )}
            </div>

            <div className="bottom-bar__col">
                {prevPath && (
                    <button
                        className="bottom-bar__btn"
                        onClick={() => go(prevPath, false)}
                        disabled={busy}
                    >
                        ← Вернуть на этап назад
                    </button>
                )}
            </div>

            <div className="bottom-bar__col">
                <button
                    className="bottom-bar__close bottom-bar__close--icon"
                    onClick={() => go('/', false)}
                    title="На главную"
                    disabled={busy}
                >
                    <img
                        src={homeIconSrc}
                        alt="На главную"
                        className="bottom-bar__close-img"
                    />
                </button>
            </div>

            <div className="bottom-bar__col">
                <button
                    className="bottom-bar__btn"
                    onClick={() => go(nextPath, true)}
                    disabled={busy || (!nextPath && !onNext)}
                >
                    {busy ? 'Сохранение...' : 'Далее →'}
                </button>
            </div>
        </div>
    )
}

export default BottomBar