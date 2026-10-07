import { useEffect, useState } from 'react'
import BottomBar from '../components/BottomBar'
import { productWizardOffset, variantFillStageHeading, variantFillStep, variantFillTotal } from '../stageProgress'
import VariantFlowHeader from '../components/VariantFlowHeader'
import VariationPreview from '../components/VariationPreview'
import { productsApi } from '../api'
import { blankWarehouse, composeAddress, pointsFrom, pointsPayload, useCardIds, warehouseFormFrom } from '../cardScope'
import './Stage20.css'

function Stage20() {
    const { productId, variationId } = useCardIds()
    const [addresses, setAddresses] = useState([])
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!productId || !variationId) return
        productsApi.get(productId).then((product) => {
            const catalog = pointsFrom(product, null)
            const own = pointsFrom(product, variationId)
            const ownById = new Map(own.map((item) => [item.id, item]))
            setAddresses(catalog.map((item) => {
                const stock = ownById.get(item.id)
                return {
                    ...item,
                    active: stock ? stock.active : false,
                    quantity: stock?.quantity || '',
                }
            }))
            setLoaded(true)
        }).catch((loadError) => setError(loadError.message))
    }, [productId, variationId])

    const save = () => {
        if (!productId) throw new Error('Сначала создайте карточку на главной страницы')
        if (!variationId) throw new Error('Сначала создайте вариант на этапе 13')
        if (!loaded) throw new Error('Карточка ещё загружается, подождите секунду')
        return productsApi.saveShipments(productId, {
            variationId,
            items: pointsPayload(addresses),
        })
    }

    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [newAddress, setNewAddress] = useState(blankWarehouse)

    const handleNewAddressChange = (field, value) => {
        setNewAddress((prev) => ({ ...prev, [field]: value }))
    }

    const closeForm = () => {
        setNewAddress(blankWarehouse())
        setEditingId(null)
        setShowForm(false)
    }

    const handleSaveAddress = () => {
        const addressString = composeAddress(newAddress)
        const stored = {
            address: addressString,
            name: newAddress.name,
            postalCode: newAddress.index,
            region: newAddress.region,
            city: newAddress.city,
            street: newAddress.street,
            house: newAddress.house,
            office: newAddress.office,
        }

        setAddresses((prev) => {
            if (editingId == null) {
                return [...prev, { id: Date.now(), active: true, quantity: '', ...stored }]
            }
            return prev.map((item) => (item.id === editingId ? { ...item, ...stored } : item))
        })
        closeForm()
    }

    const handleCancel = () => {
        closeForm()
    }

    const toggleAddress = (id) => {
        setAddresses((prev) =>
            prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
        )
    }

    const handleQuantityChange = (id, value) => {
        setAddresses((prev) =>
            prev.map((a) => (a.id === id ? { ...a, quantity: value } : a))
        )
    }

    const openNewAddress = () => {
        if (showForm && editingId == null) {
            closeForm()
            return
        }
        setEditingId(null)
        setNewAddress(blankWarehouse())
        setShowForm(true)
    }

    const editAddress = (id) => {
        const current = addresses.find((item) => item.id === id)
        if (!current) return
        setNewAddress(warehouseFormFrom(current))
        setEditingId(id)
        setShowForm(true)
    }

    return (
        <>
            <div className="container stage20-page">
                <VariantFlowHeader productId={productId} />
                <h1 className="title">{variantFillStageHeading(20, 'Доставка', null, productId)}</h1>
                <VariationPreview stage={20} />
                {!productId && <p className="form-error">Откройте создание карточки с главной страницы.</p>}
                {productId && !variationId && <p className="form-error">Сначала создайте вариант на этапе 13.</p>}
                {error && <p className="form-error">{error}</p>}

                <h2 className="subtitle">Количество товара на складе</h2>

                <button
                    className="add-address-btn"
                    type="button"
                    onClick={openNewAddress}
                >
                    <span className="add-address-btn__icon">＋</span>
                    <span className="add-address-btn__text">Добавить адрес отгрузки</span>
                </button>

                {showForm && (
                    <div className="address-form">
                        <input
                            type="text"
                            className="address-form__input"
                            placeholder="Наименование склада"
                            value={newAddress.name}
                            onChange={(e) => handleNewAddressChange('name', e.target.value)}
                        />
                        <input
                            type="text"
                            className="address-form__input"
                            placeholder="Индекс"
                            value={newAddress.index}
                            onChange={(e) => handleNewAddressChange('index', e.target.value)}
                        />
                        <input
                            type="text"
                            className="address-form__input"
                            placeholder="Область"
                            value={newAddress.region}
                            onChange={(e) => handleNewAddressChange('region', e.target.value)}
                        />
                        <input
                            type="text"
                            className="address-form__input"
                            placeholder="Город"
                            value={newAddress.city}
                            onChange={(e) => handleNewAddressChange('city', e.target.value)}
                        />
                        <input
                            type="text"
                            className="address-form__input"
                            placeholder="Улица"
                            value={newAddress.street}
                            onChange={(e) => handleNewAddressChange('street', e.target.value)}
                        />
                        <input
                            type="text"
                            className="address-form__input"
                            placeholder="Дом"
                            value={newAddress.house}
                            onChange={(e) => handleNewAddressChange('house', e.target.value)}
                        />
                        <input
                            type="text"
                            className="address-form__input"
                            placeholder="Офис"
                            value={newAddress.office}
                            onChange={(e) => handleNewAddressChange('office', e.target.value)}
                        />

                        <div className="address-form__actions">
                            <button
                                type="button"
                                className="address-form__btn address-form__btn--cancel"
                                onClick={handleCancel}
                                title="Отмена"
                            >
                                ✕
                            </button>
                            <button
                                type="button"
                                className="address-form__btn address-form__btn--save"
                                onClick={handleSaveAddress}
                                title="Сохранить"
                            >
                                ✓
                            </button>
                        </div>
                    </div>
                )}

                <div className="address-list">
                    {addresses.map((item) => (
                        <div className="address-item" key={item.id}>
                            <button
                                type="button"
                                className={`toggle ${item.active ? 'toggle--on' : ''}`}
                                onClick={() => toggleAddress(item.id)}
                                title={item.active ? 'Выключить' : 'Включить'}
                            >
                                <span className="toggle__knob" />
                            </button>

                            <div className="address-body">
                                <div className="address-text">{item.address}</div>

                                <div className="address-status">
                                    {item.active ? 'Склад активный' : 'Склад неактивный'}
                                </div>
                            </div>

                            <button
                                type="button"
                                className="address-edit"
                                onClick={() => editAddress(item.id)}
                                title="Редактировать"
                            >
                                ✎
                            </button>

                            {item.active && (
                                <div className="address-quantity">
                                    <span className="address-quantity__label">
                                        Количество товаров на складе:
                                    </span>
                                    <input
                                        type="text"
                                        className="address-quantity__input"
                                        value={item.quantity}
                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                    />
                                    <span className="address-quantity__unit">штук</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <BottomBar current={variantFillStep(20, null, productId) + productWizardOffset(productId)} total={variantFillTotal(null, productId) + productWizardOffset(productId)} prevPath="/stage19" nextPath="/stage21" onSave={save} />
        </>
    )
}

export default Stage20
