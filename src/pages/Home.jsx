import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { geocodeAPI, astrologyAPI } from '../services/api'
import LocationInput from '../components/LocationInput'
import TimezoneDisplay from '../components/TimezoneDisplay'
import SwissEphemerisChartWheel from '../components/SwissEphemerisChartWheel'
import PlanetTable from '../components/PlanetTable'
import AspectGrid from '../components/AspectGrid'
import AstroChartComponent from '../components/AstroChartComponent'

function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // const [formData, setFormData] = useState({
  //   name: '',
  //   birth_date: '',
  //   birth_time: '',
  //   city: '',
  //   latitude: '',
  //   longitude: '',
  //   timezone: ''
  // })

  const [formData, setFormData] = useState({
  name: '',
  birth_date: '',
  birth_time: '12:00',  // ← дефолтное время
  city: '',
  latitude: null,       // ← null вместо строки!
  longitude: null,      // ← null вместо строки!
  timezone: 'UTC'
})
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chartData, setChartData] = useState(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // const handleLocationSelect = (location) => {
  //   setFormData(prev => ({
  //     ...prev,
  //     city: location.display_name,
  //     latitude: location.lat,
  //     longitude: location.lon,
  //     timezone: location.timezone || ''
  //   }))
  // }

  const handleLocationSelect = async (location) => {
  // Сохраняем координаты (скрыто от пользователя)
  const lat = parseFloat(location.lat)
  const lon = parseFloat(location.lon)

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
    city: location.display_name,
    latitude: lat,      // ← ЧИСЛО!
    longitude: lon,     // ← ЧИСЛО!
    timezone: timezone
  }))
}

//   const handleSubmit = async (e) => {
//     e.preventDefault()
//     setLoading(true)
//     setError('')
//       // 👇 ВРЕМЕННО: посмотрим, что отправляем
//   console.log('Отправляемые данные:', formData)
    
//     try {
//       const apiData = {
//   birth_datetime: `${formData.birth_date}T${formData.birth_time}:00`,
//   birth_place: formData.city,
//   latitude: formData.latitude,
//   longitude: formData.longitude,
//   timezone: formData.timezone,
//   name: formData.name
// }
// const response = await astrologyAPI.calculateChart(apiData)
//       // const response = await astrologyAPI.calculateChart(formData)
//       setChartData(response)
//     } catch (err) {
//        console.error('Ошибка API:', err.response?.data)  // 👈 Увидим детали ошибки
//       setError(err.response?.data?.detail || 'Ошибка при расчете карты')
//     } finally {
//       setLoading(false)
//     }
//   }
const handleSubmit = async (e) => {
  e.preventDefault()
  setLoading(true)
  setError('')
  
const apiData = {
  birth_date: `${formData.birth_date}T${formData.birth_time}:00`,
  birth_place: formData.city,
  latitude: formData.latitude,
  longitude: formData.longitude,
  timezone: formData.timezone,
  name: formData.name
}
  console.log('Отправляем apiData:', apiData) // 👈 ДОБАВЬТЕ ЭТО
  
  try {
    const response = await astrologyAPI.calculateChart(apiData)
    setChartData(response) // 👈 ИСПРАВЬТЕ: было response, а нужно response.data
  } catch (err) {
    console.error('Ошибка API:', err.response?.data)
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
            {/* {error && <div className="error">{error}</div>} */}
            {error && (
  <div className="error">
    {typeof error === 'object' 
      ? error.msg || error.message || 'Произошла ошибка при расчете' 
      : error}
  </div>
)}
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
                  onLocationSelect={handleLocationSelect}
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
              <AstroChartComponent  
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
              {/* <AspectGrid 
                aspects={chartData.aspects}
                planets={chartData.planets}
              /> */}
               <AstroChartComponent
              chartData={chartData}
              size={700}
            />
            </div>
           {/* Планеты в домах */}
            <div style={{ marginTop: '40px' }}>
              <h4 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>
                Планеты в Домах
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '15px'
              }}>
                {chartData.planets && Object.entries(chartData.planets).map(([planet, data]) => (
                  data && data.house && (
                    <div key={planet} style={{
                      background: 'var(--bg-secondary)',
                      padding: '15px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                        {planet}
                      </div>
                      <div style={{ marginTop: '5px', fontSize: '14px' }}>
                        <div>Дом: <strong>{data.house}</strong></div>
                        <div>Знак: {data.sign || '—'}</div>
                        <div>Градус: {data.degree?.toFixed(2) || '—'}°</div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
