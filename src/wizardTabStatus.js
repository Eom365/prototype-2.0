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
    hasText(group.temperatureFrom) ||
    hasText(group.temperatureTo) ||
    hasText(group.humidityFrom) ||
    hasText(group.humidityTo) ||
    hasText(group.lighting)
  )
}

export function isDescriptionTabFilled(key, form) {
  if (!form) return false
  if (key === 'review') {
    return (
      isDescriptionTabFilled('description', form) &&
      isDescriptionTabFilled('complectation', form) &&
      isDescriptionTabFilled('applicationArea', form) &&
      isDescriptionTabFilled('storageConditions', form) &&
      isDescriptionTabFilled('precautions', form)
    )
  }
  if (key === 'description') {
    const d = form.description || {}
    return (
      hasText(d.purpose) ||
      hasText(d.usage) ||
      hasText(d.design) ||
      hasText(d.principle)
    )
  }
  if (key === 'complectation') {
    return (form.complectation?.items || []).some(
      (item) => hasText(item?.name) || hasText(item?.quantity),
    )
  }
  if (key === 'applicationArea') {
    const a = form.applicationArea || {}
    return hasText(a.sphere) || hasText(a.method)
  }
  if (key === 'storageConditions') {
    const s = form.storageConditions || {}
    return (
      conditionFilled(s.transport) ||
      conditionFilled(s.storage) ||
      conditionFilled(s.operation) ||
      hasText(s.shelfLife)
    )
  }
  if (key === 'precautions') {
    const p = form.precautions || {}
    return hasText(p.hazardClass) || hasText(p.safety) || hasText(p.disposal)
  }
  return false
}

function specFilled(spec) {
  if (!spec) return false
  return hasText(spec.value) || hasText(spec.customValue)
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
    logo = null,
  } = ctx || {}

  if (key === 'review') {
    return (
      isCharacteristicsTabFilled('main', ctx) ||
      isCharacteristicsTabFilled('dimensions', ctx) ||
      isCharacteristicsTabFilled('manufacturer', ctx) ||
      isCharacteristicsTabFilled('garant', ctx) ||
      isCharacteristicsTabFilled('tech', ctx) ||
      isCharacteristicsTabFilled('custom', ctx)
    )
  }
  if (key === 'main') {
    const fields = mainFields.filter((field) => field.code !== 'brand')
    return (
      hasText(productLine) ||
      Boolean(logo) ||
      fields.some((field) => specFilled(specs[field.code])) ||
      weightFields.some((field) => specFilled(specs[field.code])) ||
      specFilled(specs.brand)
    )
  }
  if (key === 'dimensions') {
    return ['length', 'width', 'height', 'weight', 'weightTolerance'].some(
      (code) => specFilled(specs[code]),
    )
  }
  if (key === 'manufacturer') {
    return manufacturerFields.some((field) => specFilled(specs[field.code]))
  }
  if (key === 'garant') {
    return specFilled(specs.warrantyPeriod) || specFilled(specs.serviceLife)
  }
  if (key === 'tech') {
    return (techGroups || []).some((group) =>
      (group.fields || []).some((field) => specFilled(specs[field.code])),
    )
  }
  if (key === 'custom') {
    return (customRows || []).some(
      (row) => hasText(row?.name) || hasText(row?.value) || hasText(row?.customValue),
    )
  }
  return false
}
