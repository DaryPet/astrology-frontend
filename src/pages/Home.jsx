import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { geocodeAPI, astrologyAPI } from '../services/api'
import LocationInput from '../components/LocationInput'
import TimezoneDisplay from '../components/TimezoneDisplay'
import SwissEphemerisChartWheel from '../components/SwissEphemerisChartWheel'
import PlanetTable from '../components/PlanetTable'
import AspectGrid from '../components/AspectGrid'

function Home() {
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    birth_time: '',
    city: '',
    latitude: '',
    longitude: '',
    timezone: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chartData, setChartData] = useState(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleLocationSelect = (location) => {
    setFormData(prev => ({
      ...prev,
      city: location.display_name,
      latitude: location.lat,
      longitude: location.lon,
      timezone: location.timezone || ''
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await astrologyAPI.calculateChart(formData)
      setChartData(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при расчете карты')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home">
      <header className="header">
        <div className="container header-content">
          <div className="logo">Астрология</div>
          <nav className="nav">
            <button className="nav-link" onClick={() => navigate('/chart')}>Карта</button>
            <button className="nav-link" onClick={() => navigate('/about')}>О проекте</button>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <h1>Расчет Натальной Карты</h1>
          <p>Профессиональный расчет астрологической карты рождения с использованием Swiss Ephemeris</p>
          
          <div className="form-card">
            {error && <div className="error">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Имя (опционально)</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Введите ваше имя"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Дата рождения *</label>
                  <input
                    type="date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Время рождения *</label>
                  <input
                    type="time"
                    name="birth_time"
                    value={formData.birth_time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Место рождения *</label>
                <LocationInput
                  value={formData.city}
                  onSelect={handleLocationSelect}
                  placeholder="Начните вводить название города..."
                />
              </div>

              <TimezoneDisplay 
                latitude={formData.latitude}
                longitude={formData.longitude}
                timezone={formData.timezone}
              />

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Расчет...' : 'Рассчитать карту'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {chartData && (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
          {/* КАРТА ПО ЦЕНТРУ */}
          <div style={{ 
            textAlign: 'center',
            margin: '40px 0',
            padding: '20px',
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            <h2 style={{ marginBottom: '30px', color: 'var(--text-primary)' }}>
              Натальная Карта (Swiss Ephemeris)
            </h2>
            <SwissEphemerisChartWheel 
              chartData={chartData}
              size={700}
            />
            <div style={{ 
              marginTop: '30px', 
              color: 'var(--text-secondary)',
              fontSize: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
                <div><strong>Солнце:</strong> {chartData.sun_sign || '—'}</div>
                <div><strong>Луна:</strong> {chartData.moon_sign || '—'}</div>
                <div><strong>Асцендент:</strong> {chartData.ascendant || '—'}</div>
                <div><strong>MC:</strong> {chartData.mc || '—'}</div>
              </div>
            </div>
          </div>

          {/* ИНФОРМАЦИЯ ПОД КАРТОЙ */}
          <div style={{ 
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            padding: '30px',
            marginTop: '30px'
          }}>
            <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>
              Детальная Информация
            </h3>
            
            {/* Таблица планет */}
            <div style={{ marginBottom: '40px' }}>
              <PlanetTable 
                planets={chartData.planets}
                houses={chartData.houses}
              />
            </div>

            {/* Сетка аспектов */}
            <div>
              <AspectGrid 
                aspects={chartData.aspects}
                planets={chartData.planets}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
