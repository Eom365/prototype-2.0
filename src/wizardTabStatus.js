export function markVisited(prev, key) {
  if (!key) return prev || []
  return prev?.includes(key) ? prev : [...(prev || []), key]
}

export function tabClassName({ active, visited, filled }) {
  const parts = ['stage24-tab']
  if (active) parts.push('stage24-tab--active')
  if (filled) parts.push('stage24-tab--filled')
  else if (visited) parts.push('stage24-tab--visited')
  return parts.join(' ')
}

function hasText(value) {
  return Boolean(String(value ?? '').trim())
}

function conditionFilled(group) {
  if (!group) return false
  return (
    hasText(group.temperatureFrom) &&
    hasText(group.temperatureTo) &&
    hasText(group.humidityFrom) &&
    hasText(group.humidityTo) &&
    hasText(group.lighting)
  )
}

function specFilled(spec) {
  if (!spec) return false
  return hasText(spec.value) || hasText(spec.customValue)
}

export function isDescriptionTabFilled(key, form) {
  if (!form) return false
  if (key === 'review') return false
  if (key === 'description') {
    const d = form.description || {}
    return hasText(d.purpose) && hasText(d.principle)
  }
  if (key === 'complectation') {
    const items = (form.complectation?.items || []).filter(
      (item) => hasText(item?.name) || hasText(item?.quantity),
    )
    if (items.length === 0) return false
    return items.every((item) => hasText(item?.name) && hasText(item?.quantity))
  }
  if (key === 'applicationArea') {
    return hasText(form.applicationArea?.method)
  }
  if (key === 'storageConditions') {
    const s = form.storageConditions || {}
    return (
      conditionFilled(s.transport) &&
      conditionFilled(s.storage) &&
      conditionFilled(s.operation)
    )
  }
  if (key === 'precautions') {
    const p = form.precautions || {}
    return hasText(p.hazardClass) && hasText(p.safety) && hasText(p.disposal)
  }
  return false
}

export function descriptionTabRequiresFill(key) {
  return (
    key === 'description' ||
    key === 'applicationArea' ||
    key === 'storageConditions' ||
    key === 'precautions'
  )
}

export function isCharacteristicsTabFilled(key, ctx) {
  const {
    specs = {},
    mainFields = [],
    weightFields = [],
    manufacturerFields = [],
    techGroups = [],
    customRows = [],
    productLine = '',
    product = null,
    packType = '',
    photosCount = 0,
    packagePhotosCount = 0,
  } = ctx || {}

  if (key === 'review') return false
  if (key === 'main') {
    const fields = mainFields.filter((field) => field.code !== 'brand')
    const checks = fields.map((field) => specFilled(specs[field.code]))
    if (mainFields.some((field) => field.code === 'brand')) {
      checks.push(specFilled(specs.brand))
    }
    checks.push(hasText(productLine))
    if (checks.length === 0) return false
    return checks.every(Boolean)
  }
  if (key === 'dimensions') {
    // «Наименование модели» — считаем заполненным,
    // если на Этапе 2 сохранено итоговое имя линейки
    return Boolean(
      (product?.fullName || '').trim() ||
      (product?.productName || '').trim(),
    )
  }
  if (key === 'manufacturer') {
    // «Фотографии модели» — есть ли хоть одно фото продукта
    return photosCount > 0
  }
  if (key === 'garant') {
    // «Упаковка модели» — выбран тип упаковки или загружены фото упаковки
    return Boolean(packType) || packagePhotosCount > 0
  }
  if (key === 'tech') {
    const fields = (techGroups || []).flatMap((group) => group.fields || [])
    if (!fields.length) return false
    return fields.every((field) => specFilled(specs[field.code]))
  }
  if (key === 'custom') {
    if (!customRows.length) return false
    return customRows.every(
      (row) =>
        hasText(row?.name) &&
        (hasText(row?.value) || hasText(row?.customValue)),
    )
  }
  return false
}

export function characteristicsTabRequiresFill(key, ctx) {
  const {
    manufacturerFields = [],
    techGroups = [],
  } = ctx || {}

  if (key === 'review') return false
  if (key === 'main') return true
  if (key === 'dimensions') return true
  if (key === 'manufacturer') return manufacturerFields.length > 0
  if (key === 'garant') return true
  if (key === 'tech') {
    return (techGroups || []).some((group) => (group.fields || []).length > 0)
  }
  if (key === 'custom') return false
  return false
}

export function tabFilledState({ key, visited, contentFilled, requiresFill }) {
  if (key === 'review') return Boolean(visited)
  if (contentFilled) return true
  if (!requiresFill && visited) return true
  return false
}
