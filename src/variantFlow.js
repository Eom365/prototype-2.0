import { CUSTOM_CODE_PREFIX } from './customCharacteristics'
import { DIMENSION_CODES } from './productSpecs'

export const VARIANT_AXIS_SKIP_CODES = new Set([
  'brand',
  'manufacturer',
  'country',
  'article',
  'weightTolerance',
])

const DIMENSION_WEIGHT_CODES = new Set([...DIMENSION_CODES, 'weight'])

export function variantAxisRank(code) {
  if (code === 'model') return 0
  if (String(code || '').startsWith(CUSTOM_CODE_PREFIX)) return 1
  if (DIMENSION_WEIGHT_CODES.has(code)) return 3
  return 2
}

export function sortVariantAxisCodes(codes) {
  return [...(codes || [])]
    .filter((code) => code && !VARIANT_AXIS_SKIP_CODES.has(code))
    .map((code, index) => ({ code, index }))
    .sort((a, b) => {
      const rankDiff = variantAxisRank(a.code) - variantAxisRank(b.code)
      if (rankDiff !== 0) return rankDiff
      return a.index - b.index
    })
    .map((item) => item.code)
}

export function sortByVariantAxisHierarchy(items, keyFn = (item) => item.key || item.code) {
  return [...(items || [])]
    .map((item, index) => ({ item, index, code: keyFn(item) }))
    .sort((a, b) => {
      const rankDiff = variantAxisRank(a.code) - variantAxisRank(b.code)
      if (rankDiff !== 0) return rankDiff
      return a.index - b.index
    })
    .map((entry) => entry.item)
}

function isApproved(product) {
  if ((product?.reviewStatus || '').toLowerCase() === 'approved') return true
  if ((product?.status || '').toLowerCase() === 'ready') return true
  return (product?.variations || []).some(
    (item) => (item.reviewStatus || '').toLowerCase() === 'approved',
  )
}

export function variantAxisLabel(product, code) {
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
    const ordered = sortVariantAxisCodes(axes)
    const axis = ordered[0] || axes[0]
    return {
      mode: 'known',
      label: variantAxisLabel(product, axis),
      axis,
      axes: ordered,
      stabilized: manual || ordered.length > 1,
    }
  }

  return { mode: 'custom', axes: sortVariantAxisCodes(axes) }
}

export function variantAxisFields(product) {
  const flow = resolveVariantFlow(product)
  if (flow.mode !== 'known') return []
  const codes = sortVariantAxisCodes(flow.axes?.length ? flow.axes : [flow.axis])
  return codes.filter(Boolean).map((code) => ({
    code,
    label: variantAxisLabel(product, code),
  }))
}

export function nextPathAfterCharacteristics(product) {
  return resolveVariantFlow(product).mode === 'custom' ? '/stage25' : '/stage24'
}

/** Manual category / custom flow has no axis values on Stage12 yet. */
export function skipsVariantParamStage(product) {
  return resolveVariantFlow(product).mode === 'custom'
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
  const remember = (item) => {
    if (!item?.code?.startsWith(CUSTOM_CODE_PREFIX)) return
    const name = String(item.value || '').trim()
    if (!name) return
    const unit = String(item.unit || '').trim()
    const prev = byCode.get(item.code)
    if (!prev) {
      byCode.set(item.code, { code: item.code, name, unit })
      return
    }
    if (!prev.unit && unit) {
      byCode.set(item.code, { ...prev, unit })
    }
  }
  for (const variation of product?.variations || []) {
    for (const item of variation.values || []) remember(item)
  }
  for (const item of product?.values || []) {
    if (item.variationId) continue
    remember(item)
  }
  return [...byCode.values()]
}

export function customAxisUnitFromProduct(product, code) {
  if (!code) return ''
  for (const variation of product?.variations || []) {
    const row = (variation.values || []).find((item) => item.code === code)
    const unit = String(row?.unit || '').trim()
    if (unit) return unit
  }
  for (const item of product?.values || []) {
    if (item.variationId) continue
    if (item.code !== code) continue
    const unit = String(item.unit || '').trim()
    if (unit) return unit
  }
  return ''
}
