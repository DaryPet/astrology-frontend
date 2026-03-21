import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

function Synastry() {
  const [formData, setFormData] = useState({
    person1: { name: '', birth_date: '', birth_place: '' },
    person2: { name: '', birth_date: '', birth_place: '' }
  })
  const [chart1Id, setChart1Id] = useState(null)
  const [chart2Id, setChart2Id] = useState(null)
  const [synastry, setSynastry] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Create first user and chart
      const user1 = await api.post('/users', {
        ...formData.person1,
        birth_date: new Date(formData.person1.birth_date).toISOString()
      })
      const chart1 = await api.post('/charts', { user_id: user1.data.id })
      setChart1Id(chart1.data.id)

      // Create second user and chart
      const user2 = await api.post('/users', {
        ...formData.person2,
        birth_date: new Date(formData.person2.birth_date).toISOString()
      })
      const chart2 = await api.post('/charts', { user_id: user2.data.id })
      setChart2Id(chart2.data.id)

      // Calculate synastry
      const synastryResult = await api.post('/synastry', {
        chart1_id: chart1.data.id,
        chart2_id: chart2.data.id
      })
      setSynastry(synastryResult.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка расчёта синастрии')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="synastry-page">
      <header className="header">
        <div className="container header-content">
          <div className="logo">✨ Астрология</div>
          <nav className="nav">
            <Link to="/">Главная</Link>
            <Link to="/synastry">Синастрия</Link>
          </nav>
        </div>
      </header>

      <div className="container" style={{ padding: '40px 0' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>
          Синастрия — совместимость двух людей
        </h1>

        {error && <div className="error">{error}</div>}

        {!synastry ? (
          <form onSubmit={handleSubmit}>
            <div className="synastry-form">
              <div className="form-card">
                <h3 style={{ marginBottom: '20px' }}>Человек 1</h3>
                <div className="form-group">
                  <label>Имя</label>
                  <input
                    type="text"
                    value={formData.person1.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      person1: { ...formData.person1, name: e.target.value }
                    })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Дата рождения</label>
                  <input
                    type="date"
                    value={formData.person1.birth_date}
                    onChange={(e) => setFormData({
                      ...formData,
                      person1: { ...formData.person1, birth_date: e.target.value }
                    })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Место рождения</label>
                  <input
                    type="text"
                    value={formData.person1.birth_place}
                    onChange={(e) => setFormData({
                      ...formData,
                      person1: { ...formData.person1, birth_place: e.target.value }
                    })}
                    required
                  />
                </div>
              </div>

              <div className="form-card">
                <h3 style={{ marginBottom: '20px' }}>Человек 2</h3>
                <div className="form-group">
                  <label>Имя</label>
                  <input
                    type="text"
                    value={formData.person2.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      person2: { ...formData.person2, name: e.target.value }
                    })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Дата рождения</label>
                  <input
                    type="date"
                    value={formData.person2.birth_date}
                    onChange={(e) => setFormData({
                      ...formData,
                      person2: { ...formData.person2, birth_date: e.target.value }
                    })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Место рождения</label>
                  <input
                    type="text"
                    value={formData.person2.birth_place}
                    onChange={(e) => setFormData({
                      ...formData,
                      person2: { ...formData.person2, birth_place: e.target.value }
                    })}
                    required
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ maxWidth: '300px', margin: '0 auto', display: 'block' }}>
              {loading ? 'Расчёт...' : 'Рассчитать совместимость'}
            </button>
          </form>
        ) : (
          <div>
            <div className="aspects-list">
              <h2>Аспекты совместимости</h2>
              {synastry.aspects && synastry.aspects.length > 0 ? (
                synastry.aspects.map((aspect, idx) => (
                  <div key={idx} className="aspect-item">
                    <span className="aspect-name">{aspect.planet}</span>
                    <span className="aspect-type">{aspect.aspect}</span>
                    <span style={{ color: aspect.compatibility === 'Strong' ? '#10b981' : aspect.compatibility === 'Moderate' ? '#f59e0b' : '#94a3b8' }}>
                      {aspect.compatibility}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>Сильные аспекты не найдены</p>
              )}
            </div>

            <button 
              onClick={() => { setSynastry(null); setChart1Id(null); setChart2Id(null) }} 
              className="btn btn-primary" 
              style={{ maxWidth: '300px', margin: '40px auto 0', display: 'block' }}
            >
              Рассчитать заново
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Synastry
