export async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) }
    const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData
    if (!isForm && options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(`/api${path}`, { ...options, headers })
    if (!response.ok) {
        throw new Error(await readError(response))
    }
    if (response.status === 204) return null

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) return response.json()
    return null
}

async function readError(response) {
    const text = await response.text()
    if (!text) return `Ошибка ${response.status}`
    try {
        const json = JSON.parse(text)
        return json.message || json.title || text
    } catch {
        return text
    }
}

export const catalogApi = {
    get: () => api('/catalog'),
}

export const productsApi = {
    list: () => api('/products'),
    get: (id) => api(`/products/${id}`),
    create: () => api('/products', { method: 'POST' }),
    remove: (id) => api(`/products/${id}`, { method: 'DELETE' }),
    complete: (id) => api(`/products/${id}/complete`, { method: 'POST' }),
    matches: (query) => api(`/products/matches?${query}`),
    saveIdentity: (id, body) => api(`/products/${id}/identity`, { method: 'PUT', body: JSON.stringify(body) }),
    saveCategory: (id, body) => api(`/products/${id}/category`, { method: 'PUT', body: JSON.stringify(body) }),
    saveDescription: (id, body) => api(`/products/${id}/description`, { method: 'PUT', body: JSON.stringify(body) }),
    saveCharacteristics: (id, body) => api(`/products/${id}/characteristics`, { method: 'PUT', body: JSON.stringify(body) }),
    saveName: (id, body) => api(`/products/${id}/name`, { method: 'PUT', body: JSON.stringify(body) }),
    savePackaging: (id, body) => api(`/products/${id}/packaging`, { method: 'PUT', body: JSON.stringify(body) }),
    savePrice: (id, body) => api(`/products/${id}/price`, { method: 'PUT', body: JSON.stringify(body) }),
    saveShipments: (id, body) => api(`/products/${id}/shipments`, { method: 'PUT', body: JSON.stringify(body) }),
    saveVariantAxes: (id, body) => api(`/products/${id}/variant-axes`, { method: 'PUT', body: JSON.stringify(body) }),
    saveWantsVariants: (id, body) => api(`/products/${id}/wants-variants`, { method: 'PUT', body: JSON.stringify(body) }),
    saveVariationDescription: (id, variationId, body) => api(`/products/${id}/variations/${variationId}/description`, { method: 'PUT', body: JSON.stringify(body) }),
    saveVariationCharacteristics: (id, variationId, body) => api(`/products/${id}/variations/${variationId}/characteristics`, { method: 'PUT', body: JSON.stringify(body) }),
    saveVariationName: (id, variationId, body) => api(`/products/${id}/variations/${variationId}/name`, { method: 'PUT', body: JSON.stringify(body) }),
    saveVariationPackaging: (id, variationId, body) => api(`/products/${id}/variations/${variationId}/packaging`, { method: 'PUT', body: JSON.stringify(body) }),
    upload: (id, formData) => api(`/products/${id}/files`, { method: 'POST', body: formData }),
    deleteFile: (fileId) => api(`/files/${fileId}`, { method: 'DELETE' }),
    addVariation: (id, body) => api(`/products/${id}/variations`, { method: 'POST', body: JSON.stringify(body) }),
    updateVariation: (id, variationId, body) => api(`/products/${id}/variations/${variationId}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteVariation: (id, variationId) => api(`/products/${id}/variations/${variationId}`, { method: 'DELETE' }),
    submitProductReview: (id) => api(`/products/${id}/review`, { method: 'POST', body: JSON.stringify({ decision: 'submit' }) }),
    approveProductReview: (id) => api(`/products/${id}/review`, { method: 'POST', body: JSON.stringify({ decision: 'approve' }) }),
    submitReview: (id, variationId) => api(`/products/${id}/variations/${variationId}/review`, { method: 'POST', body: JSON.stringify({ decision: 'submit' }) }),
    approveReview: (id, variationId) => api(`/products/${id}/variations/${variationId}/review`, { method: 'POST', body: JSON.stringify({ decision: 'approve' }) }),
    pendingReviews: () => api('/reviews'),
}

export function notifyProductUpdated(productId) {
    if (typeof window !== 'undefined' && productId) {
        window.dispatchEvent(new CustomEvent('product-updated', { detail: { productId } }))
    }
}
