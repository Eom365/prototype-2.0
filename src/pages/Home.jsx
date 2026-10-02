import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { productsApi } from '../api'
import './Home.css'

function Home() {
    const navigate = useNavigate()
    const [items, setItems] = useState([])
    const [filter, setFilter] = useState('all')
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState('')

    const load = async () => {
        const products = await productsApi.list()
        setItems(products)
    }

    useEffect(() => {
        load().catch((loadError) => setError(loadError.message))
    }, [])

    const handleCreate = async () => {
        setCreating(true)
        setError('')
        try {
            const product = await productsApi.create()
            navigate(`/stage1?id=${product.id}`)
        } catch (createError) {
            setError(createError.message)
            setCreating(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Удалить карточку?')) return
        setError('')
        try {
            await productsApi.remove(id)
            await load()
        } catch (deleteError) {
            setError(deleteError.message)
        }
    }

    const visible = items.filter((item) => filter === 'all' || item.status === filter)

    return (
        <div className="home">
            <button type="button" className="home__review" onClick={() => navigate('/review')}>
                проверка
            </button>
            <h1>Главная страница</h1>

            <div className="home__buttons">
                <button className="home__button" onClick={handleCreate} disabled={creating}>
                    {creating ? 'Создание...' : 'Создать карточку товара'}
                </button>
                {/* <button className="home__button" onClick={() => setFilter('draft')}>
                    Черновики
                </button>
                <button className="home__button" onClick={() => navigate('/stage3')}>
                    Объединение товара
                </button> */}
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="home__filters">
                <button className={filter === 'all' ? 'home__chip home__chip--active' : 'home__chip'} onClick={() => setFilter('all')}>
                    Все
                </button>
                <button className={filter === 'ready' ? 'home__chip home__chip--active' : 'home__chip'} onClick={() => setFilter('ready')}>
                    Готовые
                </button>
                <button className={filter === 'draft' ? 'home__chip home__chip--active' : 'home__chip'} onClick={() => setFilter('draft')}>
                    Черновики
                </button>
            </div>

            <div className="card-list">
                {visible.length === 0 && <p>Карточек пока нет</p>}
                {visible.map((item) => {
                    const reviewApproved = item.reviewStatus === 'approved'
                    return (
                        <article
                            className={`product-card${reviewApproved ? ' product-card--review-approved' : ''}`}
                            key={item.id}
                        >
                            {reviewApproved && (
                                <span className="product-card__approved" title="Проверка пройдена">✓</span>
                            )}
                            <div className="product-card__main">
                                <h2>{item.title}</h2>
                                <p>{item.kindName || 'Вид не выбран'}</p>
                                <p>{item.categoryPath || 'Категория не указана'}</p>
                                <p>
                                    {item.article ? `Артикул: ${item.article}` : 'Артикул не заполнен'}
                                    {item.model ? ` · Модель: ${item.model}` : ''}
                                </p>
                                <p>
                                    {[item.authorLastName, item.authorFirstName, item.authorMiddleName].filter(Boolean).join(' ') || 'ФИО не заполнено'}
                                </p>
                                <p className="product-card__meta">
                                    {item.status === 'ready' ? 'Готово' : 'Черновик'}
                                    {' · '}
                                    {new Date(item.updatedAt).toLocaleString('ru-RU')}
                                </p>
                            </div>
                            <div className="product-card__actions">
                                <button
                                    className="bottom-bar__btn"
                                    onClick={() => navigate(`/stage13?id=${item.id}`)}
                                >
                                    Редактировать
                                </button>
                                {reviewApproved && (
                                    <div className="tooltip-wrapper">
                                        <button
                                            type="button"
                                            className="home__variant-btn bottom-bar__btn"
                                            onClick={() => navigate(`/stage12?id=${item.id}`)}
                                        >
                                            <span className="home__variant-btn-icon" aria-hidden>+</span>
                                            <span>Добавить вариант параметра продукта</span>
                                        </button>
                                        <span className="tooltip-text">
                                            Вариант параметра продукта — это характеристики, по которым покупатель может выбрать один из нескольких вариантов внутри одной карточки продукта.
                                        </span>
                                    </div>
                                )}
                                <button className="bottom-bar__btn" onClick={() => handleDelete(item.id)}>
                                    Удалить
                                </button>
                            </div>
                        </article>
                    )
                })}
            </div>
        </div>
    )
}

export default Home
