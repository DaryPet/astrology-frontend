import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { geocodeAPI, astrologyAPI } from '../services/api'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import LocationInput from '../components/LocationInput'
import PlanetTable from '../components/PlanetTable'
import AspectGrid from '../components/AspectGrid'
import AstroChartComponent from '../components/AstroChartComponent'

function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    birth_time: '12:00',
    city: '',
    latitude: null,
    longitude: null,
    timezone: 'UTC'
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chartData, setChartData] = useState(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }


  const handleLocationSelect = async (location) => {
    const lat = parseFloat(location.lat)
    const lon = parseFloat(location.lon)

    let timezone = location.timezone || 'UTC'

    if (lat && lon) {
      try {
        const detectedTimezone = await geocodeAPI.detectTimezone(lat, lon)
        if (detectedTimezone && detectedTimezone !== 'UTC') {
          timezone = detectedTimezone
        }
      } catch (err) {
        console.warn('Timezone detection warning:', err)
      }
    }

    setFormData(prev => ({
      ...prev,
      city: location.display_name,
      latitude: lat,
      longitude: lon,
      timezone: timezone
    }))
  }

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
  console.log('Отправляем apiData:', apiData)
  
  try {
    const response = await astrologyAPI.calculateChart(apiData)
    setChartData({
      ...response,
      vertex: response.houses_meta?.vertex !== undefined 
        ? { longitude: response.houses_meta.vertex } 
        : null
    })
  } catch (err) {
    console.error('Ошибка API:', err.response?.data)
    setError(err.response?.data?.detail || t('home.errors.calcError'))
  } finally {
    setLoading(false)
  }
}
  return (
    <div className="home">
      <Header />

      <section className="hero">
        <div className="container">
          <h1>{t('home.title')}</h1>
          <p>{t('home.subtitle')}</p>
          
          <div className="form-card">
            {error && (
  <div className="error">
    {typeof error === 'object' 
      ? error.msg || error.message || t('home.errors.calcError')
      : error}
  </div>
)}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t('home.form.name')}</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={t('home.form.namePlaceholder')}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('home.form.birthDate')}</label>
                  <input
                    type="date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t('home.form.birthTime')}</label>
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
                <label>{t('home.form.birthPlace')}</label>
                <LocationInput
                  value={formData.city}
                  onLocationSelect={handleLocationSelect}
                  placeholder={t('home.form.cityPlaceholder')}
                />
              </div>

              <button type="submit" className="btn-register" disabled={loading}>
                {loading ? t('home.form.submitting') : t('home.form.submit')}
              </button>
            </form>
          </div>
        </div>
      </section>

      {chartData && (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            textAlign: 'center',
            margin: '40px 0',
            padding: '20px',
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            <h2 style={{ marginBottom: '30px', color: 'var(--text-primary)' }}>
              {t('home.chart.title')}
            </h2>
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
                <div><strong>{t('home.chart.sun')}:</strong> {chartData.sun_sign || '—'}</div>
                <div><strong>{t('home.chart.moon')}:</strong> {chartData.moon_sign || '—'}</div>
                <div><strong>{t('home.chart.ascendant')}:</strong> {chartData.ascendant || '—'}</div>
                <div><strong>{t('home.chart.mc')}:</strong> {chartData.mc || '—'}</div>
              </div>
            </div>
          </div>

          <div style={{ 
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            padding: '30px',
            marginTop: '30px'
          }}>
            <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>
              {t('home.chart.title')}
            </h3>
            
            <div style={{ marginBottom: '40px' }}>
              <PlanetTable 
                planets={chartData.planets}
                houses={chartData.houses}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home