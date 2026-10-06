import { resolveVariantFlow } from './variantFlow'

export const BASE_STAGE_COUNT = 11

export const LINE_STAGE_COUNT = 3

export const KNOWN_VARIANT_FILL_STAGE_COUNT = 9
export const CUSTOM_VARIANT_FILL_STAGE_COUNT = 11
export const VARIANT_FILL_STAGE_COUNT = KNOWN_VARIANT_FILL_STAGE_COUNT

const KNOWN_VARIANT_FILL_STEPS = {
  12: 1,
  7: 2,
  14: 3,
  23: 4,
  24: 5,
  18: 6,
  19: 7,
  20: 8,
  21: 9,
}

const CUSTOM_VARIANT_FILL_STEPS = {
  12: 1,
  7: 2,
  14: 3,
  23: 4,
  25: 5,
  26: 6,
  27: 7,
  28: 8,
  29: 9,
  30: 10,
  31: 11,
}

const LINE_ROUTE_STEPS = {
  1: 1,
  2: 2,
  3: 3,
}

function wizardKey(productId) {
  return `productWizard:${productId}`
}

export function setProductWizard(productId, active) {
  if (!productId) return
  try {
    if (active) sessionStorage.setItem(wizardKey(productId), '1')
    else sessionStorage.removeItem(wizardKey(productId))
  } catch {
    /* ignore */
  }
}

export function isProductWizard(productId) {
  if (!productId) return false
  try {
    return sessionStorage.getItem(wizardKey(productId)) === '1'
  } catch {
    return false
  }
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
  return Math.max(1, routeStage - 11)
}

/** Offset added to variant-fill steps while the first-product line wizard is active. */
export function productWizardOffset(productId) {
  return isProductWizard(productId) ? LINE_STAGE_COUNT : 0
}

/** Total stages for the first product: line (1–3) + variant fill (includes Stage12). */
export function productWizardTotal(product) {
  return LINE_STAGE_COUNT + variantFillTotal(product)
}

export function productWizardStep(routeStage, product) {
  if (LINE_ROUTE_STEPS[routeStage] != null) return LINE_ROUTE_STEPS[routeStage]
  return LINE_STAGE_COUNT + variantFillStep(routeStage, product)
}

/** Bottom-bar current step: continuous during first-product wizard, else variant-only. */
export function fillProgressStep(routeStage, product, productId) {
  const id = productId || product?.id
  if (LINE_ROUTE_STEPS[routeStage] != null && isProductWizard(id)) {
    return LINE_ROUTE_STEPS[routeStage]
  }
  const base = variantFillStep(routeStage, product)
  return base + productWizardOffset(id)
}

/** Bottom-bar total: continuous during first-product wizard, else variant-only. */
export function fillProgressTotal(product, productId) {
  const id = productId || product?.id
  if (isProductWizard(id)) return productWizardTotal(product)
  return variantFillTotal(product)
}

export function variantFillStepLabel(routeStage, product) {
  return `${variantFillStep(routeStage, product)} из ${variantFillTotal(product)}`
}

export function variantFillStageHeading(routeStage, title, product, productId) {
  const id = productId || product?.id
  const step = fillProgressStep(routeStage, product, id)
  return `Этап ${step} — ${title}`
}
