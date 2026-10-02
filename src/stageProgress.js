export const BASE_STAGE_COUNT = 11

/** Variant fill: docs → photos → specs → pack → price → delivery → preview (7 steps). */
export const VARIANT_FILL_STAGE_COUNT = 7

const VARIANT_FILL_STEPS = {
    7: 1,
    14: 2,
    15: 3,
    18: 4,
    19: 5,
    20: 6,
    21: 7,
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
