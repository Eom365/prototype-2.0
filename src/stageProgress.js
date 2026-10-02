export const BASE_STAGE_COUNT = 11

/** Variant fill: docs → photos → specs(23) → 24 → pack → price → delivery → preview. */
export const VARIANT_FILL_STAGE_COUNT = 8

const VARIANT_FILL_STEPS = {
    7: 1,
    14: 2,
    23: 3,
    24: 4,
    18: 5,
    19: 6,
    20: 7,
    21: 8,
}

export function variantFillStep(routeStage) {
    if (VARIANT_FILL_STEPS[routeStage] != null) return VARIANT_FILL_STEPS[routeStage]
    return Math.max(1, routeStage - 12)
}

export function variantFillStepLabel(routeStage) {
    return `${variantFillStep(routeStage)} из ${VARIANT_FILL_STAGE_COUNT}`
}

export function variantFillStageHeading(routeStage, title) {
    return `Этап ${variantFillStep(routeStage)} — ${title}`
}
