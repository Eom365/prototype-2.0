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
    const dimensionCodes = ['length', 'width', 'height']
    const weightCodes = weightFields.map((field) => field.code)
    const codes = weightCodes.length
      ? [...dimensionCodes, ...weightCodes]
      : [...dimensionCodes, 'weight', 'weightTolerance']
    return codes.every((code) => specFilled(specs[code]))
  }
  if (key === 'manufacturer') {
    if (!manufacturerFields.length) return false
    return manufacturerFields.every((field) => specFilled(specs[field.code]))
  }
  if (key === 'garant') {
    return (
      specFilled(specs.warrantyPeriod) && specFilled(specs.serviceLife)
    )
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
