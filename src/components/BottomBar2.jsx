import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { notifyProductUpdated } from '../api'
import './BottomBar2.css'

function BottomBar2({
    current,
    total = 11,
    nextPath,
    prevPath,
    onSave,
    onFinish,
    onNext,
    showStep = true,
    homeLabel = 'На главную',
    nextLabel = 'Управление товарами',
}) {
    const navigate = useNavigate()
    const location = useLocation()
    const [params] = useSearchParams()
    const [busy, setBusy] = useState(false)

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
                    className="bottom-bar__btn"
                    onClick={() => go('/', false)}
                    title={homeLabel}
                    disabled={busy}
                >
                    {homeLabel}
                </button>
            </div>

            <div className="bottom-bar__col">
                <button
                    className="bottom-bar__btn bottom-bar__btn--primary"
                    onClick={() => go(nextPath, true)}
                    disabled={busy || (!nextPath && !onNext)}
                >
                    {busy ? 'Сохранение...' : nextLabel}
                </button>
            </div>
        </div>
    )
}

export default BottomBar2