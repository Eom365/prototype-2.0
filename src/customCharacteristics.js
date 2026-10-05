export const CUSTOM_CODE_PREFIX = 'custom:'

function createId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        try {
            return crypto.randomUUID()
        } catch {
            // HTTP and other non-secure contexts can block randomUUID().
        }
    }
    return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createCustomRow() {
    return {
        id: createId(),
        name: '',
        value: '',
        unit: '',
        unitMode: 'preset',
        customUnit: '',
    }
}

export function customRowFilled(row) {
    return Boolean(
        String(row.name || '').trim() ||
        String(row.value || '').trim() ||
        row.unit ||
        String(row.customUnit || '').trim()
    )
}

export function normalizeCustomRows(rows) {
    const next = rows?.length
        ? rows.map((row) => ({
            id: row.id || createId(),
            name: row.name || '',
            value: row.value || '',
            unit: row.unit || '',
            unitMode: row.unitMode || 'preset',
            customUnit: row.customUnit || '',
        }))
        : [createCustomRow()]
    const last = next[next.length - 1]
    if (customRowFilled(last)) next.push(createCustomRow())
    return next
}

export function allUnitOptions(unitGroups) {
    const seen = new Set()
    const options = []
    for (const group of Object.values(unitGroups || {})) {
        for (const unit of group) {
            if (seen.has(unit.value)) continue
            seen.add(unit.value)
            options.push(unit)
        }
    }
    return options
}

export function knownUnitValues(unitGroups) {
    return new Set(allUnitOptions(unitGroups).map((item) => item.value))
}

function sameValueScope(item, { variationId = null } = {}) {
    if (variationId != null) {
        if (item.variationId == null || item.variationId === '') return true
        return String(item.variationId).toLowerCase() === String(variationId).toLowerCase()
    }
    return !item.variationId
}

export function customRowsFromValues(values, scope = {}, unitGroups = {}) {
    const known = knownUnitValues(unitGroups)
    return (values || [])
        .filter((item) => item.code?.startsWith(CUSTOM_CODE_PREFIX) && sameValueScope(item, scope))
        .map((item) => {
            const unit = item.unit || ''
            const unitIsKnown = known.has(unit)
            return {
                id: item.code.slice(CUSTOM_CODE_PREFIX.length),
                name: item.value || '',
                value: item.customValue || '',
                unit: unitIsKnown ? unit : '',
                unitMode: unit && !unitIsKnown ? 'other' : 'preset',
                customUnit: unitIsKnown ? '' : unit,
            }
        })
}

export function serializeCustomRows(rows) {
    return rows
        .filter((row) => String(row.name || '').trim() && String(row.value || '').trim())
        .map((row) => ({
            code: `${CUSTOM_CODE_PREFIX}${row.id}`,
            value: row.name.trim(),
            customValue: row.value.trim(),
            unit: row.unitMode === 'other'
                ? (row.customUnit.trim() || null)
                : (row.unit || null),
        }))
}

export function displayCustomCharacteristic(saved, unitGroups) {
    const value = saved.customValue || ''
    const unit = saved.unit || ''
    if (!value) return ''
    const known = allUnitOptions(unitGroups)
    const match = known.find((item) => item.value === unit)
    return match ? `${value} ${match.label}` : (unit ? `${value} ${unit}` : value)
}
