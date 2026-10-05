import { resolveVariantFlow } from './variantFlow'

export const BASE_STAGE_COUNT = 11

export const KNOWN_VARIANT_FILL_STAGE_COUNT = 8
export const CUSTOM_VARIANT_FILL_STAGE_COUNT = 10
export const VARIANT_FILL_STAGE_COUNT = KNOWN_VARIANT_FILL_STAGE_COUNT

const KNOWN_VARIANT_FILL_STEPS = {
  7: 1,
  14: 2,
  23: 3,
  24: 4,
  18: 5,
  19: 6,
  20: 7,
  21: 8,
}

const CUSTOM_VARIANT_FILL_STEPS = {
  7: 1,
  14: 2,
  23: 3,
  25: 4,
  26: 5,
  27: 6,
  28: 7,
  29: 8,
  30: 9,
  31: 10,
}

export function variantFillMode(product) {
  if (!product) return 'known'
  return resolveVariantFlow(product).mode === 'custom' ? 'custom' : 'known'
}

export function variantFillTotal(product) {
  if (!product) return KNOWN_VARIANT_FILL_STAGE_COUNT
  return variantFillMode(product) === 'custom'
    ? CUSTOM_VARIANT_FILL_STAGE_COUNT
    : KNOWN_VARIANT_FILL_STAGE_COUNT
}

export function variantFillStep(routeStage, product) {
  const steps =
    variantFillMode(product) === 'custom'
      ? CUSTOM_VARIANT_FILL_STEPS
      : KNOWN_VARIANT_FILL_STEPS
  if (steps[routeStage] != null) return steps[routeStage]
  if (CUSTOM_VARIANT_FILL_STEPS[routeStage] != null) {
    return CUSTOM_VARIANT_FILL_STEPS[routeStage]
  }
  if (KNOWN_VARIANT_FILL_STEPS[routeStage] != null) {
    return KNOWN_VARIANT_FILL_STEPS[routeStage]
  }
  return Math.max(1, routeStage - 12)
}

export function variantFillStepLabel(routeStage, product) {
  return `${variantFillStep(routeStage, product)} из ${variantFillTotal(product)}`
}

export function variantFillStageHeading(routeStage, title, product) {
  return `Этап ${variantFillStep(routeStage, product)} — ${title}`
}
