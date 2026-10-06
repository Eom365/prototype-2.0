import { useRef, useState } from 'react'
import './ExcelImportModal.css'

const TEMPLATE_HEADERS = [
  'Модель',
  'Объем',
  'Цвет',
  'Ширина',
  'Высота',
  'Длина',
  'Вес',
]

function downloadTemplate() {
  const csv = `${TEMPLATE_HEADERS.join(';')}\n`
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'shablon-variantov.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * Кнопка «Загрузить файл Excel» + модалка: скачать шаблон / загрузить файл.
 * onUploaded(file) — опциональный колбэк после выбора файла.
 */
export default function ExcelImportModal({ onUploaded }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState(null)
  const inputRef = useRef(null)

  const handlePick = () => inputRef.current?.click()

  const handleChange = (event) => {
    const next = event.target.files?.[0] || null
    event.target.value = ''
    if (!next) return
    setFile(next)
    onUploaded?.(next)
  }

  const handleClear = (event) => {
    event.stopPropagation()
    setFile(null)
  }

  const close = () => {
    setOpen(false)
    setFile(null)
  }

  return (
    <>
      <div className="excel-import-trigger">
        <button
          type="button"
          className="excel-import-trigger__btn"
          onClick={() => setOpen(true)}
        >
          Загрузить файл Excel
        </button>
      </div>

      {open && (
        <div className="excel-modal-overlay" onClick={close}>
          <div
            className="excel-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="excel-modal-title"
          >
            <h2 id="excel-modal-title" className="excel-modal__title">
              Загрузка вариантов из Excel
            </h2>

            <button
              type="button"
              className="excel-modal__download"
              onClick={downloadTemplate}
            >
              Скачать шаблон
            </button>

            <div className="excel-modal__upload">
              <span className="excel-modal__upload-label">Загрузить файл Excel</span>
              <div className="excel-modal__file-input" onClick={handlePick}>
                <input
                  type="text"
                  className="excel-modal__file-text"
                  value={file ? file.name : ''}
                  placeholder="Выберите файл .xlsx или .csv"
                  readOnly
                />
                {file && (
                  <button
                    type="button"
                    className="excel-modal__file-clear"
                    onClick={handleClear}
                    title="Удалить файл"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="button"
                  className="excel-modal__file-clip"
                  onClick={(event) => {
                    event.stopPropagation()
                    handlePick()
                  }}
                  title="Прикрепить файл"
                >
                  📎
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  hidden
                  onChange={handleChange}
                />
              </div>
            </div>

            <button type="button" className="excel-modal__ok" onClick={close}>
              Готово
            </button>
          </div>
        </div>
      )}
    </>
  )
}
