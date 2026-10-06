import { useEffect, useRef, useState } from 'react'
import { notifyProductUpdated, productsApi } from '../api'
import { sameId } from '../cardScope'

function PhotoGallery({
    productId,
    role,
    variationId = null,
    buttonLabel = 'Добавить фотографию',
    layout = 'side',
}) {
    const [photos, setPhotos] = useState([])
    const [error, setError] = useState('')
    const fileInputRef = useRef(null)
    const variationIdRef = useRef(variationId)
    const stackLayout = layout === 'stack'
    const smallSlots = stackLayout ? 3 : 4
    const maxPhotos = stackLayout ? 4 : 5

    variationIdRef.current = variationId

    const loadPhotos = (product) => {
        const scopeId = variationIdRef.current
        const next = (product.files || [])
            .filter((file) => file.role === role && (scopeId ? sameId(file.variationId, scopeId) : !file.variationId))
            .sort((a, b) => a.sortOrder - b.sortOrder)
        setPhotos(next)
    }

    const load = async ({ notify = false } = {}) => {
        const product = await productsApi.get(productId)
        loadPhotos(product)
        if (notify) notifyProductUpdated(productId)
    }

    useEffect(() => {
        setPhotos([])
        if (!productId) return
        load().catch((loadError) => setError(loadError.message))
    }, [productId, role, variationId])

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file || !productId) return

        const scopeId = variationIdRef.current
        const formData = new FormData()
        formData.append('file', file)
        formData.append('role', role)
        if (scopeId) formData.append('variationId', scopeId)
        setError('')
        try {
            await productsApi.upload(productId, formData)
            await load({ notify: true })
        } catch (uploadError) {
            setError(uploadError.message)
        }
    }

    const handleRemove = async (fileId) => {
        setError('')
        try {
            await productsApi.deleteFile(fileId)
            await load({ notify: true })
        } catch (removeError) {
            setError(removeError.message)
        }
    }

    return (
        <>
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />

            <button
                className="add-photo-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={!productId || photos.length >= maxPhotos}
            >
                <span className="add-photo-btn__icon">＋</span>
                <span className="add-photo-btn__text">
                    {photos.length >= maxPhotos
                        ? `Все ${maxPhotos} фото добавлены`
                        : `${buttonLabel} (${photos.length}/${maxPhotos})`}
                </span>
            </button>

            {error && <p className="form-error">{error}</p>}

            <div className={`gallery${stackLayout ? ' gallery--stack' : ''}`}>
                <div className="slot--big">
                    {photos[0] && (
                        <>
                            <img src={photos[0].url} alt={photos[0].name} className="slot__img" />
                            <button
                                type="button"
                                className="slot__remove"
                                onClick={() => handleRemove(photos[0].id)}
                                title="Удалить"
                            >
                                ✕
                            </button>
                        </>
                    )}
                </div>

                <div className="slots-small">
                    {Array.from({ length: smallSlots }, (_, offset) => offset + 1).map((index) => (
                        <div key={index} className="slot--small">
                            {photos[index] && (
                                <>
                                    <img
                                        src={photos[index].url}
                                        alt={photos[index].name}
                                        className="slot__img"
                                    />
                                    <button
                                        type="button"
                                        className="slot__remove"
                                        onClick={() => handleRemove(photos[index].id)}
                                        title="Удалить"
                                    >
                                        ✕
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}

export default PhotoGallery
