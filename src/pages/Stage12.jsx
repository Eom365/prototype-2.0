// Заполнение карточки продукта новой  категории

import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import './Stage12.css'

function Stage12() {
    const navigate = useNavigate()
    const location = useLocation()
    const [params] = useSearchParams()

    const go = (path) => navigate({ pathname: path, search: path === '/' ? '' : location.search })

    return (
        <>
            <div className="container">
                <h1 className="title">Вариант параметра продукта</h1>

                <p className="description">
                    Вариант параметра продукта — это характеристики, по которым покупатель может выбрать один из нескольких вариантов внутри одной карточки продукта.
                </p>

                <p className="pBold">Пример вариантов параметра продукта:<br /></p>
                <img
                    src="/images/example.png"
                    alt="Вариант параметра продукта - пример"
                    className="imgOne"
                />
            </div>

            <div className="action-bar">
                <button
                    type="button"
                    className="action-btn action-btn--no"
                    onClick={() => go('/')}
                    title="Нет"
                >
                    <span className="action-btn__circle">✕</span>
                </button>

                <button
                    type="button"
                    className="action-btn action-btn--yes"
                    onClick={() => go('/stage7')}
                    title="Да"
                >
                    <span className="action-btn__circle">✓</span>
                </button>
            </div>
        </>
    )
}

export default Stage12