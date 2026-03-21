import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

function Home() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    birth_time: '',
    birth_place: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Create user
      const userResponse = await api.post('/users', {
        ...formData,
        birth_date: new Date(formData.birth_date).toISOString()
      })
      
      // Create chart
      const chartResponse = await api.post('/charts', {
        user_id: userResponse.data.id
      })
      
      navigate(`/chart/${chartResponse.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при создании карты')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home">
      <header className="header">
        <div className="container header-content">
          <div className="logo">✨ Астрология</div>
          <nav className="nav">
            <a href="/">Главная</a>
            <a href="/synastry">Синастрия</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <h1>Откройте тайны<br />вашей натальной карты</h1>
          <p>
            Введите данные рождения, чтобы рассчитать положение планет 
            и получить персональную астрологическую интерпретацию
          </p>

          <div className="form-card">
            {error && <div className="error">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Ваше имя</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Иван Иванов"
                  required
                />
              </div>

              <div className="form-group">
                <label>Дата рождения</label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Время рождения (необязательно)</label>
                <input
                  type="time"
                  value={formData.birth_time}
                  onChange={(e) => setFormData({...formData, birth_time: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Место рождения</label>
                <input
                  type="text"
                  value={formData.birth_place}
                  onChange={(e) => setFormData({...formData, birth_place: e.target.value})}
                  placeholder="Москва, Россия"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Расчёт...' : 'Рассчитать карту'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
