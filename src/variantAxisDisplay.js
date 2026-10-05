import { CUSTOM_CODE_PREFIX, displayCustomCharacteristic } from './customCharacteristics'
import {
  sortVariantAxisCodes,
  variantAxisFields,
  variantAxisLabel,
} from './variantFlow'

function findKind(catalog, kindCode) {
  if (!catalog || !kindCode) return null
  for (const category of catalog.categories || []) {
    const kind = (category.kinds || []).find((item) => item.code === kindCode)
    if (kind) return kind
  }
  return null
}

function catalogField(catalog, kindCode, code) {
  const kind = findKind(catalog, kindCode)
  return (kind?.characteristics || []).find((item) => item.code === code) || null
}

function displayCatalogValue(field, saved, unitGroups) {
  if (!saved) return ''
  const raw = saved.value === 'other' ? (saved.customValue || '') : (saved.value || '')
  if (!String(raw).trim()) return ''
  const option = (field.options || []).find((item) => item.value === raw)
  const text = option ? option.label : raw
  if (!saved.unit || !field.unitGroup) return String(text).trim()
  const unit = (unitGroups?.[field.unitGroup] || []).find((item) => item.value === saved.unit)
  return unit ? `${String(text).trim()} ${unit.label}` : String(text).trim()
}

function unitSuffix(saved, unitGroups) {
  if (!saved?.unit) return ''
  for (const group of Object.values(unitGroups || {})) {
    const match = group.find((item) => item.value === saved.unit)
    if (match) return ` ${match.label}`
  }
  return ` ${saved.unit}`
}

function variationValueRow(variation, code) {
  const row = (variation?.values || []).find((item) => item.code === code)
  if (row) return row
  if (code === 'model' && String(variation?.model || '').trim()) {
    return { value: variation.model, customValue: '', unit: null }
  }
  return null
}

export function formatVariantAxisValue(product, catalog, variation, code) {
  const saved = variationValueRow(variation, code)
  if (!saved) return ''
  const unitGroups = catalog?.unitGroups || {}
  if (String(code).startsWith(CUSTOM_CODE_PREFIX)) {
    return displayCustomCharacteristic(saved, unitGroups)
  }
  const field = catalogField(catalog, product?.kindCode, code)
  if (field) return displayCatalogValue(field, saved, unitGroups)
  const raw = saved.value === 'other' ? saved.customValue : saved.value
  const text = String(raw || '').trim()
  if (!text) return ''
  return `${text}${unitSuffix(saved, unitGroups)}`.trim()
}

export function variantAxisEntriesForProduct(product, catalog) {
  const fromFlow = variantAxisFields(product)
  if (fromFlow.length) return fromFlow
  const axes = sortVariantAxisCodes(product?.variantAxes || [])
  const names = new Map(
    (findKind(catalog, product?.kindCode)?.characteristics || []).map((field) => [
      field.code,
      field.name,
    ]),
  )
  if (axes.length) {
    return axes.map((code) => ({
      code,
      label: names.get(code) || variantAxisLabel(product, code),
    }))
  }
  return [{ code: 'model', label: 'Модель' }]
}

export function formatVariantParameterLabel(product, variation, catalog) {
  const entries = variantAxisEntriesForProduct(product, catalog)
  const parts = entries
    .map(({ code, label }) => {
      const value = formatVariantAxisValue(product, catalog, variation, code)
      if (!value) return null
      return `${label} ${value}`
    })
    .filter(Boolean)
  return parts.join(' · ') || '—'
}
