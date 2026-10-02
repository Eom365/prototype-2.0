import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { productsApi } from '../api'
import './Stage12.css'

function Stage12() {
    const navigate = useNavigate()
    const location = useLocation()
    const [params] = useSearchParams()
    const productId = params.get('id')
    const go = (path) => navigate({ pathname: path, search: path === '/' ? '' : location.search })

    const choose = async (wantsVariants) => {
        if (!productId) {
            window.alert('Сначала создайте карточку на главной странице')
            return
        }
        try {
            await productsApi.saveWantsVariants(productId, { wantsVariants })
            go(wantsVariants ? '/stage13' : '/')
        } catch (error) {
            window.alert(error.message || 'Не удалось сохранить')
        }
    }

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
                <p className="question">
                    У созданного продукта есть варианты для выбора?
                </p>
            </div>

            <div className="action-bar">
                <button
                    type="button"
                    className="action-btn action-btn--no"
                    onClick={() => choose(false)}
                    title="Нет"
                >
                    <span className="action-btn__circle">✕</span>
                </button>

                <button
                    type="button"
                    className="action-btn action-btn--yes"
                    onClick={() => choose(true)}
                    title="Да"
                >
                    <span className="action-btn__circle">✓</span>
                </button>
            </div>
        </>
    )
}

export default Stage12