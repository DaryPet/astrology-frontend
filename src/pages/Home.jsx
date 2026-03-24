import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { geocodeAPI, astrologyAPI } from '../services/api'
import LocationInput from '../components/LocationInput'
import TimezoneDisplay from '../components/TimezoneDisplay'
import SwissEphemerisChartWheel from '../components/SwissEphemerisChartWheel'
import PlanetTable from '../components/PlanetTable'
import AspectGrid from '../components/AspectGrid'

function Home() {
  const navigate = useNavigate()

  // Состояние формы - УБРАНЫ latitude и longitude из начального состояния!
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    birth_time: '12:00',
    birth_place: '',           // Только название города
    timezone: 'UTC',           // Автоматически определяется
    house_system: 'Placidus'
  })

  // Внутреннее состояние для координат (скрыто от пользователя)
  const [coordinates, setCoordinates] = useState({
    lat: null,
    lon: null
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chartData, setChartData] = useState(null)
  
  // Обработчик изменения города
  const handlePlaceChange = (value) => {
    setFormData(prev => ({...prev, birth_place: value}))

    // Сбрасываем координаты при изменении города
    if (coordinates.lat !== null || coordinates.lon !== null) {
      setCoordinates({ lat: null, lon: null })
      setFormData(prev => ({...prev, timezone: 'UTC'}))
    }
  }

  // Обработчик выбора города из автокомплита
  const handleLocationSelect = useCallback(async (location) => {
    // Сохраняем координаты (скрыто от пользователя)
    const lat = parseFloat(location.lat)  // ← ЧИСЛО!
    const lon = parseFloat(location.lon)  // ← ЧИСЛО!

    setCoordinates({ lat, lon })

    // Устанавливаем таймзону из ответа API
    let timezone = location.timezone || 'UTC'

    // Дополнительная проверка таймзоны через reverse geocoding для точности
    if (lat && lon) {
      try {
        const detectedTimezone = await geocodeAPI.detectTimezone(lat, lon)
        if (detectedTimezone && detectedTimezone !== 'UTC') {
          timezone = detectedTimezone
        }
      } catch (err) {
        console.warn('Timezone detection warning:', err)
        // Не критично - используем таймзону из автокомплита
      }
    }

    setFormData(prev => ({
      ...prev,
      timezone
    }))
  }, [])

  // Валидация формы перед отправкой
  const validateForm = () => {
    if (!formData.birth_date) {
      setError('Пожалуйста, укажите дату рождения')
      return false
    }

    if (!formData.birth_place.trim()) {
      setError('Пожалуйста, выберите город из списка')
      return false
    }

    if (coordinates.lat === null || coordinates.lon === null) {
      setError('Пожалуйста, выберите город из списка автокомплита')
      return false
    }

    // Проверяем, что дата не в будущем (для реалистичности)
    const birthDate = new Date(formData.birth_date)
    const today = new Date()
    if (birthDate > today) {
      setError('Дата рождения не может быть в будущем')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')
    setChartData(null)

    try {
      // Подготавливаем данные для отправки
      const requestData = {
        name: formData.name,
        birth_date: formData.birth_date,
        birth_time: formData.birth_time,
        latitude: coordinates.lat,    // ← ЧИСЛО из coordinates!
        longitude: coordinates.lon,   // ← ЧИСЛО из coordinates!
        timezone: formData.timezone,
        house_system: formData.house_system
      }

      const response = await astrologyAPI.calculateChart(requestData)
      setChartData(response)
    } catch (err) {
      console.error('Chart calculation error:', err)
      // Проверяем если это ошибка валидации Pydantic (422)
      if (err.response?.status === 422) {
        const validationErrors = err.response?.data?.detail || []
        const errorMessages = Array.isArray(validationErrors)
          ? validationErrors.map(e => e.msg || e.message).join(', ')
          : String(validationErrors)
        setError(`Ошибка валидации: ${errorMessages}`)
      } else {
        setError(err.response?.data?.detail || err.message || 'Ошибка при расчете карты')
      }
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
            {/* УБРАЛ навигацию на /chart - оставил только О проекте */}
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
                  onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
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
                    onChange={(e) => setFormData(prev => ({...prev, birth_date: e.target.value}))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Время рождения *</label>
                  <input
                    type="time"
                    name="birth_time"
                    value={formData.birth_time}
                    onChange={(e) => setFormData(prev => ({...prev, birth_time: e.target.value}))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Место рождения *</label>
                <LocationInput
                  value={formData.birth_place}
                  onChange={handlePlaceChange}
                  onSelect={handleLocationSelect}
                  placeholder="Начните вводить название города..."
                />
              </div>

              <TimezoneDisplay 
                latitude={coordinates.lat}
                longitude={coordinates.lon}
                timezone={formData.timezone}
              />

              <div className="form-group">
                <label>Система домов</label>
                <select
                  name="house_system"
                  value={formData.house_system}
                  onChange={(e) => setFormData(prev => ({...prev, house_system: e.target.value}))}
                >
                  <option value="Placidus">Плацидус</option>
                  <option value="Koch">Кох</option>
                  <option value="Equal">Равнодомная</option>
                  <option value="Whole">Целостная</option>
                </select>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Расчет...' : 'Рассчитать карту'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {chartData && chartData.sun_sign && (
        <div className="container">
          <div className="chart-section">
            <h2>Натальная Карта (Swiss Ephemeris)</h2>
            
            <div className="chart-container">
              <SwissEphemerisChartWheel 
                chartData={chartData}
                size={700}
              />
            </div>

            <div className="chart-summary">
              <div className="summary-item">
                <span className="label">Солнце:</span>
                <span className="value">{chartData.sun_sign || '—'}</span>
              </div>
              <div className="summary-item">
                <span className="label">Луна:</span>
                <span className="value">{chartData.moon_sign || '—'}</span>
              </div>
              <div className="summary-item">
                <span className="label">Асцендент:</span>
                <span className="value">{chartData.ascendant || '—'}</span>
              </div>
              <div className="summary-item">
                <span className="label">MC:</span>
                <span className="value">{chartData.mc || '—'}</span>
              </div>
            </div>
          </div>

          <div className="data-section">
            <h3>Планеты и Дома</h3>
            <PlanetTable 
              planets={chartData.planets}
              houses={chartData.houses}
            />
          </div>

          <div className="data-section">
            <h3>Аспекты</h3>
            <AspectGrid 
              aspects={chartData.aspects}
              planets={chartData.planets}
            />
          </div>

          {chartData.interpretation && (
            <div className="data-section">
              <h3>Интерпретация</h3>
              <div className="interpretation">
                {chartData.interpretation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Home