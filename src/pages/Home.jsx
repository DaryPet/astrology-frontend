import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

function Home() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    birth_time: '12:00',
    birth_place: '',
    latitude: null,
    longitude: null,
    timezone: 'Europe/Moscow',
    house_system: 'Placidus'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chartData, setChartData] = useState(null)
  const [locations, setLocations] = useState([])
  const [showLocations, setShowLocations] = useState(false)
  const locationInputRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  const searchLocation = async (query) => {
    if (query.length < 2) {
      setLocations([])
      return
    }
    try {
      const response = await api.get(`/geocode/search?q=${encodeURIComponent(query)}`)
      setLocations(response.data.slice(0, 8))
      setShowLocations(true)
    } catch (err) {
      console.error('Geocode error:', err)
    }
  }

  const handlePlaceChange = (e) => {
    const value = e.target.value
    setFormData({...formData, birth_place: value})
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => searchLocation(value), 300)
  }

  const selectLocation = (loc) => {
    const name = loc.display_name.split(',')[0]
    setFormData({
      ...formData,
      birth_place: name,
      latitude: parseFloat(loc.lat),
      longitude: parseFloat(loc.lon)
    })
    setShowLocations(false)
    setLocations([])
    
    detectTimezone(parseFloat(loc.lat), parseFloat(loc.lon))
  }

  const detectTimezone = async (lat, lon) => {
    try {
      const response = await api.get(`/geocode/coordinates?lat=${lat}&lon=${lon}`)
      if (response.data.timezone) {
        setFormData({...formData, timezone: response.data.timezone})
      }
    } catch (err) {
      console.error('Timezone detection error:', err)
    }
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (locationInputRef.current && !locationInputRef.current.contains(e.target)) {
        setShowLocations(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const [year, month, day] = formData.birth_date.split('-')
      const [hour, minute] = formData.birth_time.split(':')
      
      const response = await api.post('/chart/calculate', {
        birth_date: `${year}-${month}-${day}T${hour}:${minute}:00`,
        birth_time: formData.birth_time,
        birth_place: formData.birth_place,
        latitude: formData.latitude || 55.7558,
        longitude: formData.longitude || 37.6173,
        timezone: formData.timezone,
        house_system: formData.house_system
      })
      
      setChartData(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error calculating chart')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home">
      <header className="header">
        <div className="container header-content">
          <div className="logo">Astrology</div>
          <nav className="nav">
            <a href="/">Home</a>
            <a href="/synastry">Synastry</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <h1>Natal Chart Calculator</h1>
          <p>Enter your birth data to calculate planetary positions</p>

          <div className="form-card">
            {error && <div className="error">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Birth Date</label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Birth Time</label>
                  <input
                    type="time"
                    value={formData.birth_time}
                    onChange={(e) => setFormData({...formData, birth_time: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group" ref={locationInputRef} style={{position: 'relative'}}>
                <label>Birth Place</label>
                <input
                  type="text"
                  value={formData.birth_place}
                  onChange={handlePlaceChange}
                  onFocus={() => locations.length > 0 && setShowLocations(true)}
                  placeholder="Enter city (Moscow, Kiev...)"
                  required
                />
                {showLocations && locations.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {locations.map(loc => (
                      <div 
                        key={loc.place_id} 
                        className="autocomplete-item"
                        onClick={() => selectLocation(loc)}
                      >
                        <div className="autocomplete-name">{loc.display_name.split(',')[0]}</div>
                        <div className="autocomplete-details">{loc.lat}, {loc.lon}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude || ''}
                    onChange={(e) => setFormData({...formData, latitude: parseFloat(e.target.value)})}
                    placeholder="55.7558"
                  />
                </div>

                <div className="form-group">
                  <label>Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude || ''}
                    onChange={(e) => setFormData({...formData, longitude: parseFloat(e.target.value)})}
                    placeholder="37.6173"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Timezone</label>
                  <select 
                    value={formData.timezone}
                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                  >
                    <option value="Europe/Moscow">Moscow (UTC+3)</option>
                    <option value="Europe/Kiev">Kiev (UTC+2)</option>
                    <option value="Europe/Minsk">Minsk (UTC+3)</option>
                    <option value="Europe/London">London (UTC+0)</option>
                    <option value="Europe/Paris">Paris (UTC+1)</option>
                    <option value="America/New_York">New York (UTC-5)</option>
                    <option value="America/Los_Angeles">Los Angeles (UTC-8)</option>
                    <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>House System</label>
                  <select 
                    value={formData.house_system}
                    onChange={(e) => setFormData({...formData, house_system: e.target.value})}
                  >
                    <option value="Placidus">Placidus</option>
                    <option value="Equal">Equal</option>
                    <option value="WholeSign">Whole Sign</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Calculating...' : 'Calculate Chart'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {chartData && (
        <section className="results">
          <div className="container">
            <h2>Your Natal Chart</h2>
            
            <div className="main-signs">
              <div className="sign-card">
                <span className="sign-label">Sun</span>
                <span className="sign-value">{chartData.sun_sign}</span>
              </div>
              <div className="sign-card">
                <span className="sign-label">Moon</span>
                <span className="sign-value">{chartData.moon_sign}</span>
              </div>
              <div className="sign-card">
                <span className="sign-label">Ascendant</span>
                <span className="sign-value">{chartData.ascendant}</span>
              </div>
              <div className="sign-card">
                <span className="sign-label">MC</span>
                <span className="sign-value">{chartData.mc}</span>
              </div>
            </div>

            <div className="results-grid">
              <div className="result-card">
                <h3>Planets (13)</h3>
                <div className="planets-list">
                  {Object.entries(chartData.planets).map(([name, planet]) => (
                    <div key={name} className="planet-item">
                      <span className="planet-name">{name}</span>
                      <span className="planet-pos">{planet.sign} {planet.degree}</span>
                      {planet.house && <span className="planet-house">House {planet.house}</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="result-card">
                <h3>Houses (12)</h3>
                <div className="houses-grid">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                    <div key={h} className="house-item">
                      <span className="house-num">House {h}</span>
                      <span className="house-sign">{chartData.houses[h]?.sign}</span>
                      <span className="house-degree">{chartData.houses[h]?.degree}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="result-card" style={{gridColumn: '1 / -1'}}>
                <h3>Aspects ({chartData.aspects?.length || 0})</h3>
                <div className="aspects-list">
                  {chartData.aspects?.map((aspect, idx) => (
                    <div key={idx} className="aspect-item">
                      <span className="aspect-planets">{aspect.planet1} {aspect.aspect} {aspect.planet2}</span>
                      <span className="aspect-orb">orb: {aspect.orb}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default Home
