import { CUSTOM_CODE_PREFIX } from './customCharacteristics'

function isApproved(product) {
  if ((product?.reviewStatus || '').toLowerCase() === 'approved') return true
  if ((product?.status || '').toLowerCase() === 'ready') return true
  return (product?.variations || []).some(
    (item) => (item.reviewStatus || '').toLowerCase() === 'approved',
  )
}

function axisLabel(product, code) {
  if (code === 'model') return 'Модель'
  if (code === 'volume') return 'Объем'
  if (code === 'article') return 'Артикул'
  if (String(code || '').startsWith(CUSTOM_CODE_PREFIX)) {
    for (const variation of product?.variations || []) {
      const row = (variation.values || []).find((item) => item.code === code)
      const name = String(row?.value || '').trim()
      if (name) return name
    }
    return 'Иное'
  }
  const map = {
    width: 'Ширина',
    height: 'Высота',
    length: 'Длина',
    weight: 'Вес',
    weightTolerance: 'Погрешность веса',
  }
  return map[code] || code
}

export function resolveVariantFlow(product) {
  const kindCode = (product?.kindCode || '').toLowerCase()
  const categoryCode = (product?.categoryCode || '').toLowerCase()
  const path = (product?.categoryPath || '').toLowerCase()
  const axes = [...(product?.variantAxes || [])].filter(Boolean)
  const manual = kindCode === 'other'

  if (!manual && (categoryCode === 'handpieces' || path.includes('наконечник'))) {
    return { mode: 'known', label: 'Модель', axis: 'model', axes: ['model'] }
  }
  if (!manual && (categoryCode === 'aerosols' || path.includes('аэрозол'))) {
    return { mode: 'known', label: 'Объем', axis: 'volume', axes: ['volume'] }
  }

  if (axes.length > 0 && (manual ? isApproved(product) : true)) {
    const axis = axes[0]
    return {
      mode: 'known',
      label: axisLabel(product, axis),
      axis,
      axes,
      stabilized: manual || axes.length > 1,
    }
  }

  return { mode: 'custom', axes }
}

export function variantAxisFields(product) {
  const flow = resolveVariantFlow(product)
  if (flow.mode !== 'known') return []
  const codes = flow.axes?.length ? flow.axes : [flow.axis]
  return codes.filter(Boolean).map((code) => ({
    code,
    label: axisLabel(product, code),
  }))
}

export function nextPathAfterCharacteristics(product) {
  return resolveVariantFlow(product).mode === 'custom' ? '/stage25' : '/stage24'
}

export function nameFeaturesKey(productId) {
  return `nameFeatures:${productId}`
}

export function saveNameFeatures(productId, codes) {
  if (!productId) return
  try {
    sessionStorage.setItem(nameFeaturesKey(productId), JSON.stringify(codes || []))
  } catch {
    /* ignore */
  }
}

export function loadNameFeatures(productId) {
  if (!productId) return []
  try {
    const raw = sessionStorage.getItem(nameFeaturesKey(productId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function customTechFieldsFromProduct(product) {
  const byCode = new Map()
  for (const variation of product?.variations || []) {
    for (const item of variation.values || []) {
      if (!item?.code?.startsWith(CUSTOM_CODE_PREFIX)) continue
      const name = String(item.value || '').trim()
      if (!name) continue
      if (!byCode.has(item.code)) {
        byCode.set(item.code, { code: item.code, name })
      }
    }
  }
  for (const item of product?.values || []) {
    if (item.variationId) continue
    if (!item?.code?.startsWith(CUSTOM_CODE_PREFIX)) continue
    const name = String(item.value || '').trim()
    if (!name) continue
    if (!byCode.has(item.code)) {
      byCode.set(item.code, { code: item.code, name })
    }
  }
  return [...byCode.values()]
}
