import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import {
  pageLabelForPath,
  savePageQuestion,
} from '../pageQuestions'
import './PageHelp.css'

function PageHelp() {
  const location = useLocation()
  const [params] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const pathname = location.pathname
  const productId = params.get('id')
  const hidden = pathname === '/' || pathname === '' || pathname === '/questions'

  useEffect(() => {
    setOpen(false)
    setText('')
    setError('')
    setSaved(false)
  }, [pathname])

  if (hidden) return null

  const pageLabel = pageLabelForPath(pathname)

  const handleSubmit = () => {
    const value = text.trim()
    if (!value) {
      setError('Введите вопрос')
      return
    }
    if (!productId) {
      setError('Откройте страницу из карточки товара, чтобы сохранить вопрос')
      return
    }
    const entry = savePageQuestion(productId, {
      text: value,
      path: pathname,
      pageLabel,
    })
    if (!entry) {
      setError('Не удалось сохранить вопрос')
      return
    }
    setSaved(true)
    setText('')
    setError('')
    window.setTimeout(() => {
      setOpen(false)
      setSaved(false)
    }, 700)
  }

  return (
    <>
      <button
        type="button"
        className="page-help-btn"
        title="Задать вопрос по странице"
        aria-label="Задать вопрос по странице"
        onClick={() => {
          setOpen(true)
          setError('')
          setSaved(false)
        }}
      >
        ?
      </button>

      {open && (
        <div
          className="page-help-overlay"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="page-help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="page-help-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="page-help-modal__title" id="page-help-title">
              Вопрос по заполнению
            </h2>
            <p className="page-help-modal__page">{pageLabel}</p>
            <label className="page-help-modal__label" htmlFor="page-help-text">
              Введите ваш вопрос и что вам не понятно по данной странице
            </label>
            <textarea
              id="page-help-text"
              className="page-help-modal__input"
              placeholder="Ваш вопрос"
              value={text}
              onChange={(event) => {
                setText(event.target.value)
                setError('')
              }}
            />
            {error && <p className="page-help-modal__error">{error}</p>}
            {saved && (
              <p className="page-help-modal__ok">Вопрос отправлен</p>
            )}
            <div className="page-help-modal__actions">
              <button
                type="button"
                className="page-help-action page-help-action--no"
                onClick={() => setOpen(false)}
                title="Отмена"
                aria-label="Отмена"
              >
                <span className="page-help-action__circle">✕</span>
              </button>
              <button
                type="button"
                className="page-help-action page-help-action--yes"
                onClick={handleSubmit}
                title="Отправить"
                aria-label="Отправить"
              >
                <span className="page-help-action__circle">✓</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PageHelp
