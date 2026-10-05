export const HAZARD_GROUP_LABELS = {
  наконечники: 'Стоматологические наконечники',
  баллоны: 'Баллоны',
  иное: 'Иное',
}

export const HAZARD_CLASS_OPTIONS = {
  наконечники: ['1', '2а'],
  баллоны: ['1', '2а', '2б', '3', '4'],
  иное: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
}

/** Класс опасности по категории карточки (наконечники / аэрозоли / прочее). */
export function resolveHazardGroup(product) {
  const kindCode = (product?.kindCode || '').toLowerCase()
  const categoryCode = (product?.categoryCode || '').toLowerCase()
  const path = (product?.categoryPath || '').toLowerCase()

  if (kindCode === 'other') {
    return 'иное'
  }
  if (categoryCode === 'handpieces' || path.includes('наконечник')) {
    return 'наконечники'
  }
  if (categoryCode === 'aerosols' || path.includes('аэрозол')) {
    return 'баллоны'
  }
  return 'иное'
}

export function hazardClassForGroup(group, option) {
  return `${group}:${option}`
}

export function hazardClassMatchesGroup(hazardClass, group) {
  if (!hazardClass || !group) return false
  return hazardClass.startsWith(`${group}:`)
}

export function sanitizeHazardClass(hazardClass, group) {
  if (!hazardClass) return ''
  return hazardClassMatchesGroup(hazardClass, group) ? hazardClass : ''
}

export function formatHazardClass(value) {
  if (!value) return ''
  const [group, cls] = value.split(':')
  return `${HAZARD_GROUP_LABELS[group] || group}: ${cls}`
}
