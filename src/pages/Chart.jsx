import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import Header from '../components/Header'
import D3NatalChartWheel from '../components/D3NatalChartWheel'
import PlanetTable from '../components/PlanetTable'
import AspectGrid from '../components/AspectGrid'

function Chart() {
  const { id } = useParams()
  const { t } = useTranslation()
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
      setError(t('chart.error'))
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

  // Парсим данные планет и аспектов если они в строковом формате
  const parseChartData = (chart) => {
    if (!chart) return null;
    
    const parsedChart = { ...chart };
    
    // Парсим планеты если они в строковом формате
    if (typeof chart.planets === 'string') {
      try {
        parsedChart.planets = JSON.parse(chart.planets);
      } catch (e) {
        console.error('Error parsing planets:', e);
        parsedChart.planets = {};
      }
    }
    
    // Парсим дома если они в строковом формате
    if (typeof chart.houses === 'string') {
      try {
        parsedChart.houses = JSON.parse(chart.houses);
      } catch (e) {
        console.error('Error parsing houses:', e);
        parsedChart.houses = {};
      }
    }
    
    // Парсим аспекты если они в строковом формате
    if (typeof chart.aspects === 'string') {
      try {
        parsedChart.aspects = JSON.parse(chart.aspects);
      } catch (e) {
        console.error('Error parsing aspects:', e);
        parsedChart.aspects = [];
      }
    }
    
    return parsedChart;
  };

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
          <Link to="/" className="btn btn-primary">{t('common.backHome')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="chart-page">
      <Header />

      <div className="container">
        <div className="chart-header">
          <h1>{t('chart.title')}</h1>
          <p className="chart-subtitle">
            {chart.name && `${chart.name} • `}{chart.sun_sign} • {chart.moon_sign} • ASC {chart.ascendant}
          </p>
        </div>

        {/* Профессиональное колесо с d3.js */}
        <div style={{
          margin: '40px 0',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <D3NatalChartWheel 
            chartData={parseChartData(chart)}
            size={800}
          />
        </div>

        {/* Основная информация */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          margin: '40px 0'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', color: 'var(--text-primary)' }}>
              {t('chart.sun')}
            </h3>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#FFD700'
            }}>
              {chart.sun_sign}
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginTop: '8px'
            }}>
              {chart.sun_sign_ru || chart.sun_sign}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', color: 'var(--text-primary)' }}>
              {t('chart.moon')}
            </h3>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#C0C0C0'
            }}>
              {chart.moon_sign}
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginTop: '8px'
            }}>
              {chart.moon_sign_ru || chart.moon_sign}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', color: 'var(--text-primary)' }}>
              {t('chart.ascendant')}
            </h3>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#FF1493'
            }}>
              {chart.ascendant}
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginTop: '8px'
            }}>
              {chart.ascendant_ru || chart.ascendant}
              {chart.ascendant_degree && (
                <div style={{ marginTop: '4px' }}>
                  {chart.ascendant_degree.toFixed(1)}°
                </div>
              )}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', color: 'var(--text-primary)' }}>
              {t('chart.midheaven')}
            </h3>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#00BFFF'
            }}>
              {chart.mc || '—'}
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginTop: '8px'
            }}>
              {chart.mc_ru || chart.mc || t('chart.notDetermined')}
              {chart.mc_degree && (
                <div style={{ marginTop: '4px' }}>
                  {chart.mc_degree.toFixed(1)}°
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Таблица планет */}
        <div style={{ margin: '40px 0' }}>
          <PlanetTable 
            planets={parseChartData(chart)?.planets}
            houses={parseChartData(chart)?.houses}
          />
        </div>

        {/* Сетка аспектов */}
        <div style={{ margin: '40px 0' }}>
          <AspectGrid 
            aspects={parseChartData(chart)?.aspects}
            planets={parseChartData(chart)?.planets}
          />
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          {!interpretation && (
            <button onClick={getInterpretation} className="btn btn-primary" style={{ maxWidth: '300px' }}>
              t('chart.getInterpretation')
            </button>
          )}
          {interpretation && (
            <div className="info-card" style={{ textAlign: 'left', marginTop: '20px' }}>
              <h3>t('chart.interpretation')</h3>
              <p style={{ marginTop: '10px', lineHeight: '1.8' }}>{interpretation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Chart
