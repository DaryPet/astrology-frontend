import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

function Synastry() {
  const [formData, setFormData] = useState({
    person1: { name: '', birth_date: '', birth_time: '12:00', birth_place: '', latitude: null, longitude: null, timezone: 'Europe/Moscow' },
    person2: { name: '', birth_date: '', birth_time: '12:00', birth_place: '', latitude: null, longitude: null, timezone: 'Europe/Moscow' }
  })
  const [synastry, setSynastry] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [locations1, setLocations1] = useState([])
  const [locations2, setLocations2] = useState([])
  const [showLoc1, setShowLoc1] = useState(false)
  const [showLoc2, setShowLoc2] = useState(false)
  const loc1Ref = useRef(null)
  const loc2Ref = useRef(null)

  const searchLocation = async (query, setLocations) => {
    if (query.length < 2) { setLocations([]); return }
    try {
      const res = await api.get(`/geocode/search?q=${encodeURIComponent(query)}`)
      setLocations(res.data.slice(0, 8))
    } catch (err) { console.error(err) }
  }

  const selectLocation = (loc, personNum) => {
    const name = loc.display_name.split(',')[0]
    const data = personNum === 1 ? formData.person1 : formData.person2
    const setPerson = personNum === 1 
      ? (p) => setFormData({...formData, person1: p})
      : (p) => setFormData({...formData, person2: p})
    
    setPerson({
      ...data,
      birth_place: name,
      latitude: parseFloat(loc.lat),
      longitude: parseFloat(loc.lon)
    })
    if (personNum === 1) { setShowLoc1(false); setLocations1([]) }
    else { setShowLoc2(false); setLocations2([]) }
  }

  useEffect(() => {
    const handleClick = (e) => {
      if (loc1Ref.current && !loc1Ref.current.contains(e.target)) setShowLoc1(false)
      if (loc2Ref.current && !loc2Ref.current.contains(e.target)) setShowLoc2(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const parseForm = (p) => {
        const [y, m, d] = p.birth_date.split('-')
        const [h, min] = p.birth_time.split(':')
        return {
          birth_date: `${y}-${m}-${d}T${h}:${min}:00`,
          birth_time: p.birth_time,
          birth_place: p.birth_place,
          latitude: p.latitude || 55.7558,
          longitude: p.longitude || 37.6173,
          timezone: p.timezone
        }
      }

      const res = await api.post('/synastry/direct', {
        chart1: parseForm(formData.person1),
        chart2: parseForm(formData.person2)
      })
      setSynastry(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="synastry-page">
      <header className="header">
        <div className="container header-content">
          <div className="logo">Astrology</div>
          <nav className="nav">
            <Link to="/">Home</Link>
            <Link to="/synastry">Synastry</Link>
          </nav>
        </div>
      </header>

      <div className="container" style={{ padding: '40px 0' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Synastry - Relationship Compatibility</h1>

        {error && <div className="error">{error}</div>}

        {!synastry ? (
          <form onSubmit={handleSubmit}>
            <div className="synastry-form">
              <div className="form-card">
                <h3 style={{ marginBottom: '20px', color: '#ffd700' }}>Person 1</h3>
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" value={formData.person1.name} onChange={(e) => setFormData({...formData, person1: {...formData.person1, name: e.target.value}})} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Birth Date</label>
                    <input type="date" value={formData.person1.birth_date} onChange={(e) => setFormData({...formData, person1: {...formData.person1, birth_date: e.target.value}})} required />
                  </div>
                  <div className="form-group">
                    <label>Birth Time</label>
                    <input type="time" value={formData.person1.birth_time} onChange={(e) => setFormData({...formData, person1: {...formData.person1, birth_time: e.target.value}})} />
                  </div>
                </div>
                <div className="form-group" ref={loc1Ref} style={{position: 'relative'}}>
                  <label>Birth Place</label>
                  <input type="text" value={formData.person1.birth_place} onChange={(e) => {
                    setFormData({...formData, person1: {...formData.person1, birth_place: e.target.value}})
                    searchLocation(e.target.value, setLocations1)
                    setShowLoc1(true)
                  }} placeholder="Enter city" required />
                  {showLoc1 && locations1.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {locations1.map(loc => (
                        <div key={loc.place_id} className="autocomplete-item" onClick={() => selectLocation(loc, 1)}>
                          <div className="autocomplete-name">{loc.display_name.split(',')[0]}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Timezone</label>
                    <select value={formData.person1.timezone} onChange={(e) => setFormData({...formData, person1: {...formData.person1, timezone: e.target.value}})}>
                      <option value="Europe/Moscow">Moscow</option>
                      <option value="Europe/Kiev">Kiev</option>
                      <option value="Europe/London">London</option>
                      <option value="America/New_York">New York</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-card">
                <h3 style={{ marginBottom: '20px', color: '#ff6b6b' }}>Person 2</h3>
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" value={formData.person2.name} onChange={(e) => setFormData({...formData, person2: {...formData.person2, name: e.target.value}})} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Birth Date</label>
                    <input type="date" value={formData.person2.birth_date} onChange={(e) => setFormData({...formData, person2: {...formData.person2, birth_date: e.target.value}})} required />
                  </div>
                  <div className="form-group">
                    <label>Birth Time</label>
                    <input type="time" value={formData.person2.birth_time} onChange={(e) => setFormData({...formData, person2: {...formData.person2, birth_time: e.target.value}})} />
                  </div>
                </div>
                <div className="form-group" ref={loc2Ref} style={{position: 'relative'}}>
                  <label>Birth Place</label>
                  <input type="text" value={formData.person2.birth_place} onChange={(e) => {
                    setFormData({...formData, person2: {...formData.person2, birth_place: e.target.value}})
                    searchLocation(e.target.value, setLocations2)
                    setShowLoc2(true)
                  }} placeholder="Enter city" required />
                  {showLoc2 && locations2.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {locations2.map(loc => (
                        <div key={loc.place_id} className="autocomplete-item" onClick={() => selectLocation(loc, 2)}>
                          <div className="autocomplete-name">{loc.display_name.split(',')[0]}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Timezone</label>
                    <select value={formData.person2.timezone} onChange={(e) => setFormData({...formData, person2: {...formData.person2, timezone: e.target.value}})}>
                      <option value="Europe/Moscow">Moscow</option>
                      <option value="Europe/Kiev">Kiev</option>
                      <option value="Europe/London">London</option>
                      <option value="America/New_York">New York</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ maxWidth: '300px', margin: '0 auto', display: 'block' }}>
              {loading ? 'Calculating...' : 'Calculate Compatibility'}
            </button>
          </form>
        ) : (
          <div>
            <div className="results-grid">
              <div className="result-card">
                <h3>Person 1</h3>
                <p>Sun: {synastry.chart1.sun_sign}</p>
                <p>Moon: {synastry.chart1.moon_sign}</p>
                <p>Ascendant: {synastry.chart1.ascendant}</p>
              </div>
              <div className="result-card">
                <h3>Person 2</h3>
                <p>Sun: {synastry.chart2.sun_sign}</p>
                <p>Moon: {synastry.chart2.moon_sign}</p>
                <p>Ascendant: {synastry.chart2.ascendant}</p>
              </div>
            </div>
            
            <div className="result-card" style={{marginTop: '20px'}}>
              <h3>Synastry Aspects ({synastry.total_aspects})</h3>
              <div className="aspects-list">
                {synastry.aspects && synastry.aspects.map((aspect, idx) => (
                  <div key={idx} className="aspect-item">
                    <span className="aspect-planets">{aspect.planet1} {aspect.aspect} {aspect.planet2}</span>
                    <span className="aspect-type">{aspect.aspect_ru}</span>
                    <span className="aspect-orb">orb: {aspect.orb}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setSynastry(null)} className="btn btn-primary" style={{ maxWidth: '300px', margin: '40px auto 0', display: 'block' }}>
              Calculate Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Synastry
