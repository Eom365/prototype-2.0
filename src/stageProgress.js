import { resolveVariantFlow } from './variantFlow'

export const BASE_STAGE_COUNT = 11

export const LINE_STAGE_COUNT = 3

export const KNOWN_VARIANT_FILL_STAGE_COUNT = 9
export const CUSTOM_VARIANT_FILL_STAGE_COUNT = 10
export const EDIT_KNOWN_VARIANT_FILL_STAGE_COUNT = 8
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

/** Edit existing known variant: starts at documents (no Stage12). */
const EDIT_KNOWN_VARIANT_FILL_STEPS = {
  7: 1,
  14: 2,
  23: 3,
  24: 4,
  18: 5,
  19: 6,
  20: 7,
  21: 8,
}

/** Manual/custom path: no Stage12; description uses Stage24 (not 27). */
const CUSTOM_VARIANT_FILL_STEPS = {
  7: 1,
  14: 2,
  23: 3,
  25: 4,
  26: 5,
  24: 6,
  28: 7,
  29: 8,
  30: 9,
  31: 10,
}

const LINE_ROUTE_STEPS = {
  1: 1,
  2: 2,
  3: 3,
}

function wizardKey(productId) {
  return `productWizard:${productId}`
}

function variantFlowKey(productId) {
  return `variantFlow:${productId}`
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

export function isVariantEdit(productId) {
  if (!productId) return false
  try {
    return sessionStorage.getItem(variantFlowKey(productId)) === 'edit'
  } catch {
    return false
  }
}

export function variantFillMode(product) {
  if (!product) return 'known'
  return resolveVariantFlow(product).mode === 'custom' ? 'custom' : 'known'
}

function fillStepsFor(product, productId) {
  if (variantFillMode(product) === 'custom') return CUSTOM_VARIANT_FILL_STEPS
  if (isVariantEdit(productId || product?.id)) return EDIT_KNOWN_VARIANT_FILL_STEPS
  return KNOWN_VARIANT_FILL_STEPS
}

export function variantFillTotal(product, productId) {
  if (variantFillMode(product) === 'custom') return CUSTOM_VARIANT_FILL_STAGE_COUNT
  if (isVariantEdit(productId || product?.id)) return EDIT_KNOWN_VARIANT_FILL_STAGE_COUNT
  return KNOWN_VARIANT_FILL_STAGE_COUNT
}

export function variantFillStep(routeStage, product, productId) {
  const id = productId || product?.id
  const steps = fillStepsFor(product, id)
  if (steps[routeStage] != null) return steps[routeStage]
  if (CUSTOM_VARIANT_FILL_STEPS[routeStage] != null) {
    return CUSTOM_VARIANT_FILL_STEPS[routeStage]
  }
  if (EDIT_KNOWN_VARIANT_FILL_STEPS[routeStage] != null) {
    return EDIT_KNOWN_VARIANT_FILL_STEPS[routeStage]
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

/** Total stages for the first product: line (1–3) + variant fill. */
export function productWizardTotal(product, productId) {
  return LINE_STAGE_COUNT + variantFillTotal(product, productId)
}

export function productWizardStep(routeStage, product, productId) {
  if (LINE_ROUTE_STEPS[routeStage] != null) return LINE_ROUTE_STEPS[routeStage]
  return LINE_STAGE_COUNT + variantFillStep(routeStage, product, productId)
}

/** Bottom-bar current step: continuous during first-product wizard, else variant-only. */
export function fillProgressStep(routeStage, product, productId) {
  const id = productId || product?.id
  if (LINE_ROUTE_STEPS[routeStage] != null && isProductWizard(id)) {
    return LINE_ROUTE_STEPS[routeStage]
  }
  const base = variantFillStep(routeStage, product, id)
  return base + productWizardOffset(id)
}

/** Bottom-bar total: continuous during first-product wizard, else variant-only. */
export function fillProgressTotal(product, productId) {
  const id = productId || product?.id
  if (isProductWizard(id)) return productWizardTotal(product, id)
  return variantFillTotal(product, id)
}

export function variantFillStepLabel(routeStage, product, productId) {
  const id = productId || product?.id
  return `${variantFillStep(routeStage, product, id)} из ${variantFillTotal(product, id)}`
}

export function variantFillStageHeading(routeStage, title, product, productId) {
  const id = productId || product?.id
  const step = fillProgressStep(routeStage, product, id)
  return `Этап ${step} — ${title}`
}
