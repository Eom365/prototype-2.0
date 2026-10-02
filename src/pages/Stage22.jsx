// варианты параметра продукта

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomBar from '../components/BottomBar'
import './Stage22.css'

const DEMO_DATA = {
    category: 'Профессиональная стоматология > Стоматологические наконечники > Угловой наконечник > 1:1',
    productName: 'Стоматологический угловой наконечник повышающий TOSI TX',
    productLine: 'TX',
    brandStatus: 'Подтвержден',
    brandName: 'TOSI',
    video: '/images/video-placeholder.png',
    logo: '/images/tosi-logo.png',
    photos: [
        '/images/product-1.png',
        '/images/product-2.png',
        '/images/product-3.png',
        '/images/product-4.png',
        '/images/product-5.png',
    ],
}

function PhotoGallery({ photos }) {
    const [mainIndex, setMainIndex] = useState(0)
    const main = photos[mainIndex] || photos[0]

    return (
        <div className="product-gallery">
            <div className="product-gallery__main">
                {main && <img src={main} alt="Главное фото" />}
            </div>

            <div className="product-gallery__thumbs">
                {photos.slice(1, 5).map((src, index) => (
                    <div
                        key={index}
                        className={`product-gallery__thumb ${mainIndex === index + 1 ? 'product-gallery__thumb--active' : ''}`}
                        onClick={() => setMainIndex(index + 1)}
                    >
                        <img src={src} alt={`Фото ${index + 2}`} />
                    </div>
                ))}
            </div>
        </div>
    )
}

function Stage22() {
    const navigate = useNavigate()
    const data = DEMO_DATA

    return (
        <>
            <div className="container">
                <h1 className="title">Варианты параметра продукта</h1>

                {/* ===== ОБЩАЯ ИНФОРМАЦИЯ О ПРОДУКТЕ ===== */}
                <h2 className="section-title subtitle">Общая информация о продукте</h2>

                {/* --- Презентация линейки --- */}
                <h3 className="subtitleYt">Презентация линейки продукции</h3>

                <div className="field">
                    <span className="standartW">Презентационное видео линейки продукции:</span>
                    <img
                        src="/images/video.png"
                        alt="Презентационное видео"
                        className="field__video"
                    />
                </div>

                <div className="field">
                    <span className="standartW">Презентационные фотографии линейки продукции</span>
                    <PhotoGallery photos={data.photos} />
                </div>

                <div className="rows">
                    <div className="row">
                        <span className="row__label">Категория продукта:</span>
                        <span className="row__value row__value--breadcrumb">
                            {data.category}
                        </span>
                    </div>

                    <div className="row">
                        <span className="row__label">Наименование продукта:</span>
                        <span className="row__value">
                            <img
                                src="/images/brand.png"
                                alt="Логотип"
                                className="row__mini-logo"
                            />
                            {data.productName}
                        </span>
                    </div>

                    <div className="row">
                        <span className="row__label">Линейка продукта:</span>
                        <span className="row__value">{data.productLine}</span>
                    </div>

                    <div className="row">
                        <span className="row__label">Бренд</span>
                        <span className="row__value">
                            <span className="row__status">{data.brandStatus}</span>
                        </span>
                    </div>

                    <div className="row">
                        <span className="row__label">Название бренда:</span>
                        <span className="row__value">{data.brandName}</span>
                    </div>

                    <div className="row">
                        <span className="row__label">Логотип</span>
                        <span className="row__value">
                            <img
                                src="/images/brand.png"
                                alt="Логотип"
                                className="row__logo"
                            />
                        </span>
                    </div>
                </div>

                {/* ===== РАЗДЕЛИТЕЛЬ ===== */}
                <div className="divider" />

                {/* ===== ВАРИАНТЫ ПАРАМЕТРОВ ПРОДУКТА ===== */}
                <h2 className="section-title">Варианты параметров продукта</h2>

                <div className="variant-preview">
                    <div className="variant-preview__add">
                        <button
                            type="button"
                            className="variant-preview__add-btn"
                            title="Добавить вариант"
                            onClick={() => navigate('/stage12')}
                        >
                            <span className="variant-preview__plus">＋</span>
                        </button>
                        <span className="variant-preview__add-label">Добавить</span>
                    </div>
                </div>
            </div>

            <BottomBar showStep={false} prevPath="/" />
        </>
    )
}

export default Stage22