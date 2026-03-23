import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { geocodeAPI, astrologyAPI } from '../services/api'
import LocationInput from '../components/LocationInput'
import TimezoneDisplay from '../components/TimezoneDisplay'
import D3NatalChartWheel from '../components/D3NatalChartWheel'
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
    const lat = location.lat
    const lon = location.lon
    
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

  // Нет необходимости в обработчиках клика вне компонента - они внутри LocationInput

  // Отправка формы для расчета натальной карты
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Валидация формы
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    setError('')

    try {
      // Форматируем дату и время для backend
      const [year, month, day] = formData.birth_date.split('-')
      const [hour, minute] = formData.birth_time.split(':')
      const birthDateTime = `${year}-${month}-${day}T${hour}:${minute}:00`
      
      // Подготавливаем данные для API
      const chartData = {
        birth_date: birthDateTime,
        birth_time: formData.birth_time,
        birth_place: formData.birth_place, // Точное название города
        // Координаты НЕ отправляем - backend сам определит их по birth_place!
        timezone: formData.timezone,
        house_system: formData.house_system
      }
      
      // Вызываем API для расчета карты
      const result = await astrologyAPI.calculateChart(chartData)
      setChartData(parseChartData(result))
      
      // Прокручиваем к результатам
      setTimeout(() => {
        const resultsSection = document.querySelector('.results')
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
      
    } catch (err) {
      // Обработка ошибок от backend
      const errorMessage = err.response?.data?.detail || err.message || 'Ошибка при расчете карты'
      
      // Особенная обработка ошибок геокодинга
      if (errorMessage.includes('Cannot determine coordinates') || 
          errorMessage.includes('геокодинг') ||
          errorMessage.includes('coordinates')) {
        setError(`Не удалось определить координаты для города "${formData.birth_place}". Пожалуйста, выберите другой город из списка или уточните название.`)
      } else {
        setError(errorMessage)
      }
      
      console.error('Chart calculation error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Функция парсинга данных карты (как в Chart.jsx)
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

  return (
    <div className="home">
      <header className="header">
        <div className="container header-content">
          <div className="logo">Астрология</div>
          <nav className="nav">
            <a href="/">Главная</a>
            <a href="/synastry">Синастрия</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <h1>Калькулятор Натальной Карты</h1>
          <p>Введите данные рождения для расчета точных планетарных позиций</p>

          <div className="form-card">
            {error && <div className="error">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Имя (опционально)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                  placeholder="Иван Иванов"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Дата рождения</label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData(prev => ({...prev, birth_date: e.target.value}))}
                    required
                    max={new Date().toISOString().split('T')[0]} // Нельзя выбрать будущую дату
                  />
                  <div style={{
                    marginTop: '4px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)'
                  }}>
                    Дата не может быть в будущем
                  </div>
                </div>

                <div className="form-group">
                  <label>Время рождения</label>
                  <input
                    type="time"
                    value={formData.birth_time}
                    onChange={(e) => setFormData(prev => ({...prev, birth_time: e.target.value}))}
                    step="60" // Только часы и минуты
                  />
                  <div style={{
                    marginTop: '4px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)'
                  }}>
                    Если время неизвестно, оставьте 12:00
                  </div>
                </div>
              </div>

              {/* Компонент для ввода города с автокомплитом */}
              <LocationInput
                value={formData.birth_place}
                onChange={handlePlaceChange}
                onLocationSelect={handleLocationSelect}
                placeholder="Начните вводить название города..."
                required={true}
                label="Место рождения"
              />

              <div className="form-row">
                {/* Компонент для отображения автоматически определенной таймзоны */}
                <TimezoneDisplay
                  timezone={formData.timezone}
                  lat={coordinates.lat}
                  lon={coordinates.lon}
                  label="Часовой пояс"
                />

                <div className="form-group">
                  <label>Система домов</label>
                  <select 
                    value={formData.house_system}
                    onChange={(e) => setFormData(prev => ({...prev, house_system: e.target.value}))}
                  >
                    <option value="Placidus">Плацидус (Placidus)</option>
                    <option value="Equal">Равнодомная (Equal)</option>
                    <option value="WholeSign">Целознаковая (Whole Sign)</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading || !coordinates.lat || !formData.birth_date}
                style={{
                  opacity: (!coordinates.lat || !formData.birth_date) ? 0.6 : 1,
                  cursor: (!coordinates.lat || !formData.birth_date) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      marginRight: '8px',
                      verticalAlign: 'middle'
                    }}></span>
                    Расчет карты...
                  </>
                ) : 'Рассчитать Натальную Карту'}
              </button>
              
              {/* Подсказка, если не все поля заполнены */}
              {(!coordinates.lat || !formData.birth_date) && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  background: 'rgba(124, 58, 237, 0.1)',
                  border: '1px solid var(--accent)',
                  borderRadius: '6px',
                  color: 'var(--accent-glow)',
                  fontSize: '13px',
                  textAlign: 'center'
                }}>
                  {!formData.birth_date ? 'Укажите дату рождения' : 'Выберите город из списка'}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {chartData && (
        <section className="results">
          <div className="container">
            <h2>Ваша Натальная Карта</h2>
            
            {/* Информация о расчете */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '30px',
              fontSize: '14px',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <strong>Место:</strong> {formData.birth_place}
                  {coordinates.lat && (
                    <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                      ({coordinates.lat.toFixed(4)}°, {coordinates.lon.toFixed(4)}°)
                    </span>
                  )}
                </div>
                <div>
                  <strong>Часовой пояс:</strong> {formData.timezone.replace('_', ' ')}
                </div>
                <div>
                  <strong>Система домов:</strong> {formData.house_system}
                </div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--accent-glow)' }}>
                ✓ Расчет выполнен с максимальной точностью с использованием Swiss Ephemeris
              </div>
            </div>
            
            <div className="main-signs">
              <div className="sign-card">
                <span className="sign-label">Солнце</span>
                <span className="sign-value">{chartData.sun_sign}</span>
              </div>
              <div className="sign-card">
                <span className="sign-label">Луна</span>
                <span className="sign-value">{chartData.moon_sign}</span>
              </div>
              <div className="sign-card">
                <span className="sign-label">Асцендент</span>
                <span className="sign-value">{chartData.ascendant}</span>
              </div>
              <div className="sign-card">
                <span className="sign-label">MC (Середина Неба)</span>
                <span className="sign-value">{chartData.mc}</span>
              </div>
            </div>

            <div className="results-grid">
              <div className="result-card">
                <h3>Планеты ({Object.keys(chartData.planets || {}).length})</h3>
                <div className="planets-list">
                  {Object.entries(chartData.planets || {}).map(([name, planet]) => (
                    <div key={name} className="planet-item">
                      <span className="planet-name">
                        {name === 'sun' ? 'Солнце' :
                         name === 'moon' ? 'Луна' :
                         name === 'mercury' ? 'Меркурий' :
                         name === 'venus' ? 'Венера' :
                         name === 'mars' ? 'Марс' :
                         name === 'jupiter' ? 'Юпитер' :
                         name === 'saturn' ? 'Сатурн' :
                         name === 'uranus' ? 'Уран' :
                         name === 'neptune' ? 'Нептун' :
                         name === 'pluto' ? 'Плутон' :
                         name === 'chiron' ? 'Хирон' :
                         name === 'true_node' ? 'Северный Узел' :
                         name === 'lilith' ? 'Лилит' : name}
                      </span>
                      <span className="planet-pos">
                        {planet.sign} {planet.degree}°
                        {planet.retrograde && (
                          <span style={{ 
                            marginLeft: '4px', 
                            color: 'var(--error)', 
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }}>R</span>
                        )}
                      </span>
                      {planet.house && (
                        <span className="planet-house">
                          {planet.house === 1 ? 'I дом' :
                           planet.house === 2 ? 'II дом' :
                           planet.house === 3 ? 'III дом' :
                           planet.house === 4 ? 'IV дом' :
                           planet.house === 5 ? 'V дом' :
                           planet.house === 6 ? 'VI дом' :
                           planet.house === 7 ? 'VII дом' :
                           planet.house === 8 ? 'VIII дом' :
                           planet.house === 9 ? 'IX дом' :
                           planet.house === 10 ? 'X дом' :
                           planet.house === 11 ? 'XI дом' :
                           planet.house === 12 ? 'XII дом' : `Дом ${planet.house}`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="result-card">
                <h3>Дома (12)</h3>
                <div className="houses-grid">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                    <div key={h} className="house-item">
                      <span className="house-num">
                        {h === 1 ? 'I дом' :
                         h === 2 ? 'II дом' :
                         h === 3 ? 'III дом' :
                         h === 4 ? 'IV дом' :
                         h === 5 ? 'V дом' :
                         h === 6 ? 'VI дом' :
                         h === 7 ? 'VII дом' :
                         h === 8 ? 'VIII дом' :
                         h === 9 ? 'IX дом' :
                         h === 10 ? 'X дом' :
                         h === 11 ? 'XI дом' :
                         h === 12 ? 'XII дом' : `Дом ${h}`}
                      </span>
                      <span className="house-sign">{chartData.houses?.[h]?.sign || '-'}</span>
                      <span className="house-degree">{chartData.houses?.[h]?.degree || '0.00'}°</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="result-card" style={{gridColumn: '1 / -1'}}>
                <h3>Аспекты ({chartData.aspects?.length || 0})</h3>
                <div className="aspects-list">
                  {chartData.aspects?.map((aspect, idx) => (
                    <div key={idx} className="aspect-item">
                      <span className="aspect-planets">
                        {aspect.planet1} {aspect.aspect} {aspect.planet2}
                      </span>
                      <span className="aspect-type">
                        {aspect.aspect === 'conjunction' ? 'Соединение' :
                         aspect.aspect === 'opposition' ? 'Оппозиция' :
                         aspect.aspect === 'trine' ? 'Трин' :
                         aspect.aspect === 'square' ? 'Квадратура' :
                         aspect.aspect === 'sextile' ? 'Секстиль' : aspect.aspect}
                      </span>
                      <span className="aspect-orb">орб: {aspect.orb}°</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Профессиональное колесо */}
              <div style={{ margin: '40px 0', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>
                  Колесо Натальной Карты
                </h3>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <D3NatalChartWheel 
                    chartData={chartData}
                    size={600}
                  />
                </div>
              </div>

              {/* Таблица планет */}
              <div style={{ margin: '40px 0' }}>
                <PlanetTable 
                  planets={chartData.planets}
                  houses={chartData.houses}
                />
              </div>

              {/* Сетка аспектов */}
              <div style={{ margin: '40px 0' }}>
                <AspectGrid 
                  aspects={chartData.aspects}
                  planets={chartData.planets}
                />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default Home