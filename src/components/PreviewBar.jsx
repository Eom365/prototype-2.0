import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { notifyProductUpdated } from '../api'
import './PreviewBar.css'

function PreviewBar({
    onSave,
    onPreview,
    previewPath,
    onManage,
    managePath,
    manageDisabled = false,
    showManage = true,          // ← вот эту строку добавить
    showNext = true,
    previewLabel = 'Предварительный просмотр',
    manageLabel = 'Отправить на проверку',
    homeIconSrc = '/images/Home.png',
    homePath = '/',
    prevPath,
    nextPath,
    onNext,
    nextLabel = 'Далее',
    current,
    total,
    showStep = true,
}) {
    const navigate = useNavigate()
    const location = useLocation()
    const [params] = useSearchParams()
    const [busy, setBusy] = useState(false)

    const goHome = () => {
        if (busy) return
        navigate({ pathname: homePath, search: '' })
    }

    const goPrev = () => {
        if (busy) return
        if (!prevPath) return
        navigate({ pathname: prevPath, search: location.search })
    }
    const goNext = async () => {
        if (busy) return
        setBusy(true)
        try {
            if (onSave) await onSave()
            if (onNext) {
                onNext()
                return
            }
            if (nextPath) {
                navigate({ pathname: nextPath, search: location.search })
            }
        } catch (error) {
            window.alert(error.message || 'Не удалось сохранить')
        } finally {
            setBusy(false)
        }
    }

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

    const handleManage = () => {
        if (busy || manageDisabled) return
        if (onManage) {
            onManage()
            return
        }
        if (managePath) {
            navigate({ pathname: managePath, search: location.search })
        }
    }

    return (
        <div className="preview-bar">
            {/* <div className="preview-bar__left"> */}
                

                {showStep && current != null && total != null && (
                    <span className="preview-bar__stage">
                        Этап {current} из {total}
                    </span>
                )}
                {prevPath && (
                    <button
                        type="button"
                        className="preview-bar__prev"
                        onClick={goPrev}
                        disabled={busy}
                    >
                        ← Вернуть на этап назад
                    </button>
                )}
            {/* </div> */}

            <div className="preview-bar__center">
                <button
                    type="button"
                    className="preview-bar__home"
                    onClick={goHome}
                    title="На главную"
                    disabled={busy}
                >
                    <img
                        src={homeIconSrc}
                        alt="На главную"
                        className="preview-bar__home-img"
                    />
                </button>

                <button
                    type="button"
                    className="preview-bar__preview"
                    onClick={handlePreview}
                    disabled={busy}
                >
                    {busy ? 'Сохранение…' : previewLabel}
                </button>

                {showManage && (
                    <button
                        type="button"
                        className="preview-bar__manage"
                        onClick={handleManage}
                        disabled={busy || manageDisabled}
                    >
                        {manageLabel}
                    </button>
                )}

                {/* {showNext && (
                    <button
                        type="button"
                        className="preview-bar__next"
                        onClick={goNext}
                        disabled={busy || (!nextPath && !onNext)}
                    >
                        {busy ? 'Сохранение…' : `${nextLabel} →`}
                    </button>
                )} */}
            </div>
        </div>
    )
}

export default PreviewBar