import { useSearchParams } from 'react-router-dom'

export function useCardIds() {
    const [params] = useSearchParams()
    return {
        productId: params.get('id'),
        variationId: params.get('variationId'),
    }
}

export function sameId(a, b) {
    return a != null && b != null && String(a).toLowerCase() === String(b).toLowerCase()
}

export function sameScope(variationId, itemVariationId) {
    return variationId ? sameId(variationId, itemVariationId) : itemVariationId == null
}

export function isSameCharacteristicValue(saved, base) {
    if (!saved && !base) return true
    if (!saved || !base) return false
    return (saved.value || '') === (base.value || '') &&
        (saved.customValue || '') === (base.customValue || '') &&
        (saved.unit || null) === (base.unit || null)
}

export function axisValueFromVariation(variation, code) {
    const row = (variation?.values || []).find((item) => item.code === code)
    if (row?.value === 'other') return (row.customValue || '').trim()
    if (row?.value) return String(row.value).trim()
    if (row?.customValue) return String(row.customValue).trim()
    if (code === 'model') return (variation?.model || '').trim()
    if (code === 'article') return (variation?.article || '').trim()
    return ''
}

const INHERIT_FROM_FIRST_VARIANT = new Set(['manufacturer'])

export function sourceVariationForPrefill(product, variationId) {
    const list = product?.variations || []
    return (
        list.find(
            (item) =>
                !sameId(item.id, variationId) &&
                (item.values || []).some(
                    (row) =>
                        String(row?.value || '').trim() ||
                        String(row?.customValue || '').trim(),
                ),
        ) || null
    )
}

export function variationSpecsFrom(product, variation, characteristics, defaultUnits = {}) {
    const axes = new Set(product?.variantAxes || [])
    const source = sourceVariationForPrefill(product, variation?.id)
    const next = {}
    for (const field of characteristics) {
        const saved = (variation.values || []).find((item) => item.code === field.code)
        const defaultUnit = field.unitGroup ? defaultUnits[field.unitGroup] : ''
        let value = saved?.value ?? ''
        let customValue = saved?.customValue ?? ''
        if (value == null) value = ''
        if (customValue == null) customValue = ''
        let unit = saved?.unit || defaultUnit

        if (!String(value).trim() && !String(customValue).trim()) {
            const axisText = axisValueFromVariation(variation, field.code)
            if (axisText && axes.has(field.code)) {
                value = axisText
            }
        }

        if (
            INHERIT_FROM_FIRST_VARIANT.has(field.code) &&
            !axes.has(field.code) &&
            !String(value).trim() &&
            !String(customValue).trim() &&
            source
        ) {
            const base = (source.values || []).find((item) => item.code === field.code)
            if (base) {
                value = base.value ?? ''
                customValue = base.customValue ?? ''
                unit = base.unit || unit
            }
        }

        next[field.code] = {
            value,
            customValue,
            unit,
        }
    }
    return next
}

export function emptyDiscounts() {
    return [
        { enabled: true, from: '', to: '', value: '' },
        { enabled: false, from: '', to: '', value: '' },
        { enabled: false, from: '', to: '', value: '' },
    ]
}

export function discountsFrom(product, variationId) {
    const rows = (product.loyaltyTiers || product.LoyaltyTiers || [])
        .filter((item) => sameScope(variationId, item.variationId))

    if (rows.length === 0) return emptyDiscounts()

    const next = emptyDiscounts()
    rows.slice(0, 3).forEach((row, index) => {
        next[index] = {
            enabled: !!(row.enabled ?? row.Enabled),
            from: row.from ?? row.From ?? '',
            to: row.to ?? row.To ?? '',
            value: row.value ?? row.Value ?? '',
        }
    })

    const allEmpty = next.every((item) => !item.from && !item.to && !item.value)
    const allEnabled = next.every((item) => item.enabled)
    if (allEmpty && allEnabled) return emptyDiscounts()

    return next
}

export function pointsFrom(product, variationId) {
    return (product.shipmentPoints || [])
        .filter((item) => sameScope(variationId, item.variationId))
        .map((item) => ({
            id: item.id,
            address: item.addressLine || '',
            active: item.active,
            quantity: item.quantity || '',
            name: item.name || '',
            postalCode: item.postalCode || '',
            region: item.region || '',
            city: item.city || '',
            street: item.street || '',
            house: item.house || '',
            office: item.office || '',
        }))
}

export function blankWarehouse() {
    return {
        name: '',
        index: '',
        region: '',
        city: '',
        street: '',
        house: '',
        office: '',
    }
}

export function composeAddress(fields) {
    const parts = []
    if (fields.name) parts.push(fields.name)
    if (fields.index) parts.push(fields.index)
    if (fields.region) parts.push(fields.region)
    if (fields.city) parts.push(`г. ${fields.city}`)
    if (fields.street) parts.push(`ул. ${fields.street}`)
    if (fields.house) parts.push(`д. ${fields.house}`)
    if (fields.office) parts.push(`офис ${fields.office}`)
    return parts.join(', ') || 'Новый склад'
}

export function warehouseFormFrom(item) {
    const structured = item.name || item.postalCode || item.region || item.city || item.street || item.house || item.office
    return {
        name: item.name || (structured ? '' : (item.address || '')),
        index: item.postalCode || '',
        region: item.region || '',
        city: item.city || '',
        street: item.street || '',
        house: item.house || '',
        office: item.office || '',
    }
}

function guidOrNull(id) {
    return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        ? id
        : null
}

export function pointsPayload(items) {
    return items.map((item) => ({
        id: guidOrNull(item.id),
        name: item.name || '',
        postalCode: item.postalCode || '',
        region: item.region || '',
        city: item.city || '',
        street: item.street || '',
        house: item.house || '',
        office: item.office || '',
        addressLine: item.address || '',
        active: !!item.active,
        quantity: item.quantity || '',
    }))
}

function packField(source, key) {
    const value = source?.[key]
    return value != null && String(value).trim() !== '' ? String(value).trim() : ''
}

export function packagingFrom(product, variationId = null) {
    const base = {
        packType: packField(product, 'packType'),
        packMaterial: packField(product, 'packMaterial'),
        packMaterialCustom: packField(product, 'packMaterialCustom'),
        packSizeUnit: packField(product, 'packSizeUnit') || 'sm',
        packLength: packField(product, 'packLength'),
        packWidth: packField(product, 'packWidth'),
        packHeight: packField(product, 'packHeight'),
    }

    if (!variationId) return base

    const variation = (product.variations || []).find((item) => sameId(item.id, variationId))
    if (!variation) return base

    return {
        packType: packField(variation, 'packType') || base.packType,
        packMaterial: packField(variation, 'packMaterial') || base.packMaterial,
        packMaterialCustom: packField(variation, 'packMaterialCustom') || base.packMaterialCustom,
        packSizeUnit: packField(variation, 'packSizeUnit') || base.packSizeUnit,
        packLength: packField(variation, 'packLength') || base.packLength,
        packWidth: packField(variation, 'packWidth') || base.packWidth,
        packHeight: packField(variation, 'packHeight') || base.packHeight,
    }
}
