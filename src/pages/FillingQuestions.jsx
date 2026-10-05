import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { productsApi } from '../api'
import { loadPageQuestions } from '../pageQuestions'
import './FillingQuestions.css'

function FillingQuestions() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const productId = params.get('id')
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')
  const [questions, setQuestions] = useState([])

  useEffect(() => {
    if (!productId) {
      setError('Карточка не найдена')
      return
    }
    productsApi
      .get(productId)
      .then((loaded) => {
        setProduct(loaded)
        setQuestions([...loadPageQuestions(productId)].reverse())
      })
      .catch((loadError) => setError(loadError.message))
  }, [productId])

  return (
    <div className="filling-questions">
      <button
        type="button"
        className="filling-questions__back"
        onClick={() => navigate('/')}
      >
        ← На главную
      </button>

      <h1 className="filling-questions__title">Вопросы по заполнению</h1>
      <p className="filling-questions__product">
        {product?.fullName || product?.productName || product?.title || 'Без названия'}
      </p>

      {error && <p className="form-error">{error}</p>}

      {!error && questions.length === 0 && (
        <p className="filling-questions__empty">Вопросов пока нет</p>
      )}

      <div className="filling-questions__list">
        {questions.map((item) => (
          <article className="filling-questions__item" key={item.id}>
            <p className="filling-questions__meta">
              {new Date(item.createdAt).toLocaleString('ru-RU')}
            </p>
            <h2 className="filling-questions__page">
              {item.pageLabel || item.path}
            </h2>
            <p className="filling-questions__text">{item.text}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

export default FillingQuestions
