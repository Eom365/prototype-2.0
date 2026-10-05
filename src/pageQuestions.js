const STORAGE_PREFIX = 'pageQuestions:'

const PAGE_LABELS = {
  '/review': 'Проверка',
  '/stage1': 'Этап 1 — Проверка идентичности продукта',
  '/stage2': 'Этап 2 — Категория',
  '/stage2_3': 'Этап 3 — Бренд и линейка продукта',
  '/stage3': 'Этап 5 — Презентация продукции',
  '/stage4': 'Этап 4 — Наименование линейки продукта',
  '/stage5': 'Этап 3 — Характеристики продукта',
  '/stage6': 'Этап 6 — Полное наименование продукта',
  '/stage7': 'Этап 1 — Документы на продукт',
  '/stage8': 'Этап 8 — Заводская упаковка продукта',
  '/stage9': 'Этап 9 — Стоимость и лояльность',
  '/stage10': 'Этап 10 — Доставка',
  '/stage11': 'Этап 11 — Предварительный просмотр',
  '/stage12': 'Вариант параметра продукта',
  '/stage14': 'Этап 2 — Фотографии продукта',
  '/stage15': 'Этап 3 — Описание и характеристики продукта',
  '/stage16': 'Этап 4 — Полное наименование продукта',
  '/stage17': 'Этап 5 — Описание продукта',
  '/stage18': 'Этап 5 — Упаковка продукта',
  '/stage19': 'Этап 6 — Стоимость и лояльность',
  '/stage20': 'Этап 7 — Доставка',
  '/stage21': 'Этап 8 — Предварительный просмотр',
  '/stage22': 'Варианты параметра продукта',
  '/stage23': 'Этап 3 — Характеристики варианта параметра продукта',
  '/stage24': 'Этап 4 — Описание продукта',
  '/stage25': 'Этап 4 — Вариант параметра продукта',
  '/stage26': 'Этап 5 — Наименование продукта',
  '/stage27': 'Этап 6 — Описание продукта',
  '/stage28': 'Этап 7 — Упаковка продукта',
  '/stage29': 'Этап 8 — Стоимость и лояльность',
  '/stage30': 'Этап 9 — Доставка',
  '/stage31': 'Этап 10 — Предварительный просмотр',
}

function storageKey(productId) {
  return `${STORAGE_PREFIX}${productId}`
}

export function pageLabelForPath(pathname) {
  return PAGE_LABELS[pathname] || pathname
}

export function loadPageQuestions(productId) {
  if (!productId) return []
  try {
    const raw = localStorage.getItem(storageKey(productId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function savePageQuestion(productId, question) {
  if (!productId) return null
  const text = String(question?.text || '').trim()
  if (!text) return null
  const entry = {
    id: crypto.randomUUID?.() || `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    path: question.path || '',
    pageLabel: question.pageLabel || pageLabelForPath(question.path || ''),
    createdAt: new Date().toISOString(),
  }
  const next = [...loadPageQuestions(productId), entry]
  try {
    localStorage.setItem(storageKey(productId), JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return entry
}

export function countPageQuestions(productId) {
  return loadPageQuestions(productId).length
}
