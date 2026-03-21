import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'

const PLANET_COLORS = {
  Sun: '#FFD700',
  Moon: '#C0C0C0',
  Mercury: '#B8860B',
  Venus: '#FF69B4',
  Mars: '#FF4500',
  Jupiter: '#FFA500',
  Saturn: '#DAA520',
  Uranus: '#00CED1',
  Neptune: '#4169E1',
  Pluto: '#8B008B'
}

function Chart() {
  const { id } = useParams()
  const [chart, setChart] = useState(null)
  const [interpretation, setInterpretation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchChart()
  }, [id])

  const fetchChart = async () => {
    try {
      const response = await api.get(`/charts/${id}`)
      setChart(response.data)
      setLoading(false)
    } catch (err) {
      setError('Ошибка загрузки карты')
      setLoading(false)
    }
  }

  const getInterpretation = async () => {
    try {
      const response = await api.post(`/charts/${id}/interpret`, {
        type: 'natal'
      })
      setInterpretation(response.data.interpretation)
    } catch (err) {
      console.error(err)
    }
  }

  const getPlanetPosition = (planet, degree) => {
    // Convert degree (0-360) to position on circle
    const radians = (degree - 90) * (Math.PI / 180)
    const radius = 140 // half of wheel size
    const x = 200 + radius * Math.cos(radians)
    const y = 200 + radius * Math.sin(radians)
    return { x, y }
  }

  const renderZodiacWheel = () => {
    if (!chart || !chart.planets) return null
    
    const planets = JSON.parse(chart.planets)
    
    return (
      <div className="wheel-container">
        <svg width="400" height="400" viewBox="0 0 400 400">
          {/* Zodiac circle */}
          <circle cx="200" cy="200" r="160" fill="none" stroke="#2d2d3a" strokeWidth="1" />
          <circle cx="200" cy="200" r="120" fill="none" stroke="#2d2d3a" strokeWidth="1" />
          <circle cx="200" cy="200" r="80" fill="none" stroke="#2d2d3a" strokeWidth="1" />
          
          {/* Zodiac signs markers */}
          {['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
            'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'].map((sign, i) => {
            const degree = i * 30 + 15
            const radians = (degree - 90) * (Math.PI / 180)
            const x = 200 + 170 * Math.cos(radians)
            const y = 200 + 170 * Math.sin(radians)
            return (
              <text key={sign} x={x} y={y} textAnchor="middle" fill="#94a3b8" fontSize="10">
                {sign.substring(0, 3)}
              </text>
            )
          })}
          
          {/* Planets */}
          {Object.entries(planets).map(([name, data]) => {
            if (!data.raw_degree) return null
            const pos = getPlanetPosition(name, data.raw_degree)
            return (
              <g key={name}>
                <circle 
                  cx={pos.x} 
                  cy={pos.y} 
                  r="12" 
                  fill={PLANET_COLORS[name] || '#7c3aed'}
                  stroke="#fff"
                  strokeWidth="2"
                />
                <text 
                  x={pos.x} 
                  y={pos.y + 4} 
                  textAnchor="middle" 
                  fill="#fff" 
                  fontSize="8"
                  fontWeight="bold"
                >
                  {name.substring(0, 2)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="chart-page">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="chart-page">
        <div className="container">
          <div className="error">{error}</div>
          <Link to="/" className="btn btn-primary">На главную</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="chart-page">
      <header className="header">
        <div className="container header-content">
          <div className="logo">✨ Астрология</div>
          <nav className="nav">
            <Link to="/">Главная</Link>
            <Link to="/synastry">Синастрия</Link>
          </nav>
        </div>
      </header>

      <div className="container">
        <div className="chart-header">
          <h1>Ваша натальная карта</h1>
          <p className="chart-subtitle">
            {chart.sun_sign} • {chart.moon_sign} • ASC {chart.ascendant}
          </p>
        </div>

        <div className="zodiac-wheel">
          {renderZodiacWheel()}
        </div>

        <div className="chart-info">
          <div className="info-card">
            <h3>Солнце</h3>
            <div className="value">{chart.sun_sign}</div>
          </div>
          <div className="info-card">
            <h3>Луна</h3>
            <div className="value">{chart.moon_sign}</div>
          </div>
          <div className="info-card">
            <h3>Асцендент</h3>
            <div className="value">{chart.ascendant}</div>
          </div>
        </div>

        {chart.aspects && (
          <div className="aspects-list">
            <h2>Аспекты планет</h2>
            {JSON.parse(chart.aspects).map((aspect, idx) => (
              <div key={idx} className="aspect-item">
                <span className="aspect-name">{aspect.planet1} — {aspect.planet2}</span>
                <span className="aspect-type">{aspect.aspect}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          {!interpretation && (
            <button onClick={getInterpretation} className="btn btn-primary" style={{ maxWidth: '300px' }}>
              Получить AI интерпретацию
            </button>
          )}
          {interpretation && (
            <div className="info-card" style={{ textAlign: 'left', marginTop: '20px' }}>
              <h3>Интерпретация</h3>
              <p style={{ marginTop: '10px', lineHeight: '1.8' }}>{interpretation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Chart
