import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { geocodeAPI, astrologyAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import i18n from '../i18n';
import Header from '../components/Header';
import LocationInput from '../components/LocationInput';
import PlanetTable from '../components/PlanetTable';
import PlanetAnalysisModal from '../components/PlanetAnalysisModal';
// import AspectGrid from '../components/AspectGrid';
import AstroChartComponent from '../components/AstroChartComponent';
import ProcessingMessage from '../components/ProcessingMessage';
import AnalysisModeToggle from '../components/AnalysisModeToggle';

function Home() {
  const navigate = useNavigate();
  const { lang } = useParams();
  const { t} = useTranslation();
  const { isAuthenticated } = useAuth();

  const currentLang = lang || i18n.language || 'ru';

  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    birth_time: '12:00',
    city: '',
    latitude: null,
    longitude: null,
    timezone: 'UTC'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [chartData, setChartData] = useState(null);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [planetAnalysis, setPlanetAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [fullAnalysisLoading] = useState(false);
  const [analysisMode, setAnalysisMode] = useState(() => {
    return localStorage.getItem('analysisMode') || 'simple';
  });

  // Восстанавливаем данные карты из localStorage при загрузке страницы
  useEffect(() => {
    const savedChartData = localStorage.getItem('savedChartData');
    if (savedChartData && !chartData) {
      try {
        const parsed = JSON.parse(savedChartData);
        // console.log('=== ВОССТАНОВЛЕНА КАРТА ИЗ LOCALSTORAGE ===', parsed);
        setChartData(parsed);
      } catch (e) {
        console.error('Error parsing saved chart data:', e);
      }
    }
  }, [chartData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name') setNameError('');
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const handleLocationSelect = async (location) => {
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lon);

    let timezone = location.timezone || 'UTC';

    if (lat && lon) {
      try {
        const detectedTimezone = await geocodeAPI.detectTimezone(lat, lon);
        if (detectedTimezone && detectedTimezone !== 'UTC') {
          timezone = detectedTimezone;
        }
      } catch (err) {
        console.warn('Timezone detection warning:', err);
      }
    }

    setFormData(prev => ({
      ...prev,
      city: location.display_name,
      latitude: lat,
      longitude: lon,
      timezone: timezone
    }));
  };

  const handlePlanetClick = async (planetData) => {
    // Перевод названия планеты на текущий язык приложения
    const planetName = t('planets.names.' + planetData.name);
    setSelectedPlanet({ ...planetData, name: planetName });
    setPlanetAnalysis(null);
    setAnalysisError('');
    setAnalysisLoading(true);

    // Проверяем есть ли сохраненный анализ в localStorage
    const savedAnalysis = localStorage.getItem(`planetAnalysis_${planetData.name}`);
    if (savedAnalysis) {
      // console.log('=== ВОССТАНОВЛЕН АНАЛИЗ ПЛАНЕТЫ ИЗ LOCALSTORAGE ===', planetData.name);
      setPlanetAnalysis(savedAnalysis);
      setAnalysisLoading(false);
      return;
    }

    try {
      // console.log('=== PLANET ANALYSIS REQUEST ===', { planet: planetData.name, sign: planetData.sign, degree: planetData.degree, house: planetData.house, is_retrograde: planetData.is_retrograde, language: i18n.language });
      const result = await astrologyAPI.getPlanetAnalysis({
        planet: planetData.name, // English name for API
        sign: planetData.sign,
        degree: planetData.degree,
        house: planetData.house,
        house_sign: planetData.house_sign,
        aspects: planetData.aspects,
        is_retrograde: planetData.is_retrograde,
        language: i18n.language
      });
      console.log('=== PLANET ANALYSIS RESPONSE ===', result);
      setPlanetAnalysis(result.analysis);
      // Сохраняем анализ планеты в localStorage (ключ - название планеты)
      localStorage.setItem(`planetAnalysis_${planetData.name}`, result.analysis);
    } catch (err) {
      console.error('Planet analysis error:', err);
      const errorDetail = err.response?.data?.detail;
      if (typeof errorDetail === 'string') {
        setAnalysisError(errorDetail);
      } else if (Array.isArray(errorDetail)) {
        setAnalysisError(errorDetail.map(e => e.msg || JSON.stringify(e)).join(', '));
      } else if (errorDetail?.msg) {
        setAnalysisError(errorDetail.msg);
      } else {
        setAnalysisError('Failed to load planet analysis');
      }
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleCloseAnalysis = () => {
    setSelectedPlanet(null);
    setPlanetAnalysis(null);
    setAnalysisError('');
  };

  const prepareChartDataForAnalysis = (chartData) => {
    const zodiacSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const zodiacSignsRu = ['Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Дева', 'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы'];
    const planetNamesEn = {
      Sun: 'Sun', Moon: 'Moon', Mercury: 'Mercury', Venus: 'Venus', Mars: 'Mars',
      Jupiter: 'Jupiter', Saturn: 'Saturn', Uranus: 'Uranus', Neptune: 'Neptune',
      Pluto: 'Pluto', NorthNode: 'NorthNode', SouthNode: 'SouthNode', Chiron: 'Chiron',
      Lilith: 'Lilith', Ft: 'PartOfFortune', Vertex: 'Vertex'
    };

    const planets = {};
    Object.entries(chartData.planets).forEach(([name, p]) => {
      if (p && p.full_degree !== undefined) {
        const signIndex = Math.floor(p.full_degree / 30) % 12;
        planets[name] = {
          planet: planetNamesEn[name] || name,
          sign: p.sign || zodiacSigns[signIndex],
          sign_ru: p.sign_ru || zodiacSignsRu[signIndex],
          degree: p.degree !== undefined ? p.degree : p.full_degree % 30,
          full_degree: p.full_degree,
          speed: p.speed ?? 0,
          is_retrograde: (p.speed ?? 0) < 0,
          house: p.house
        };
      }
    });

    const houses = {};
    const houseNamesEn = ['1st House', '2nd House', '3rd House', '4th House', '5th House', '6th House',
      '7th House', '8th House', '9th House', '10th House', '11th House', '12th House'];
    const houseNamesRu = ['Дом 1', 'Дом 2', 'Дом 3', 'Дом 4', 'Дом 5', 'Дом 6',
      'Дом 7', 'Дом 8', 'Дом 9', 'Дом 10', 'Дом 11', 'Дом 12'];
    for (let i = 1; i <= 12; i++) {
      const house = chartData.houses[i];
      if (house) {
        const signIndex = Math.floor((house.cusp_longitude || 0) / 30) % 12;
        houses[i] = {
          house: i,
          name_en: houseNamesEn[i-1],
          name_ru: houseNamesRu[i-1],
          cusp_longitude: house.cusp_longitude || 0,
          sign: house.sign || zodiacSigns[signIndex],
          sign_ru: house.sign_ru || zodiacSignsRu[signIndex],
          degree: house.degree !== undefined ? house.degree : (house.cusp_longitude || 0) % 30
        };
      }
    }

    const houses_meta = {
      house_system: chartData.houses_meta?.house_system || 'Placidus',
      armc: chartData.houses_meta?.armc || 0,
      vertex: chartData.houses_meta?.vertex || null,
      pars_fortuna: chartData.houses_meta?.pars_fortuna || null
    };

    const meta = chartData.meta || {
      birth_date: formData.birth_date ? `${formData.birth_date}T${formData.birth_time}:00+03:00` : null,
      birth_place: formData.city,
      latitude: formData.latitude,
      longitude: formData.longitude,
      timezone: formData.timezone,
      jd: chartData.jd
    };

    return {
      sun_sign: chartData.sun_sign,
      sun_sign_ru: chartData.sun_sign_ru,
      moon_sign: chartData.moon_sign,
      moon_sign_ru: chartData.moon_sign_ru,
      ascendant: chartData.ascendant,
      ascendant_ru: chartData.ascendant_ru,
      ascendant_degree: chartData.houses?.[1]?.degree || 0,
      mc: chartData.mc,
      mc_ru: chartData.mc_ru,
      mc_degree: chartData.mc_degree || 0,
      planets,
      houses,
      houses_meta,
      meta,
      name: chartData.name || formData.name?.trim(),
      aspects: chartData.aspects || []
    };
  };

  const handleFullAnalysisClick = async () => {
    localStorage.setItem('analysisMode', analysisMode);
    const chartDataForAnalysis = prepareChartDataForAnalysis(chartData);
    console.log('=== ОТПРАВЛЯЕМ НА ДАШБОРД ===', chartDataForAnalysis);
    // Чистим всё старое ДО перехода
    localStorage.removeItem('savedFullAnalysis');
    localStorage.removeItem('savedChartId');
    localStorage.removeItem('chartDataForAnalysis');
    localStorage.setItem('chartDataForAnalysis', JSON.stringify(chartDataForAnalysis));
    localStorage.removeItem('savedFullAnalysis');  // ← ДОБАВИТЬ ЭТУ СТРОКУ
    localStorage.removeItem('savedChartId');

    if (!isAuthenticated) {
      navigate(`/${currentLang}/login`, { state: { from: '/', chartDataForAnalysis, showFullAnalysis: true, analysisMode } });
    } else {
      navigate(`/${currentLang}/dashboard`, { state: { showFullAnalysis: true, chartDataForAnalysis, analysisMode } });
    }
  };

  const handleNewCalculation = () => {
    localStorage.removeItem('savedChartData');
    localStorage.removeItem('chartDataForAnalysis');
    localStorage.removeItem('savedFullAnalysis');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('planetAnalysis_')) {
        localStorage.removeItem(key);
      }
    });
    setChartData(null);
    setFormData({
      name: '',
      birth_date: '',
      birth_time: '12:00',
      city: '',
      latitude: null,
      longitude: null,
      timezone: 'UTC'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name?.trim()) {
      setNameError(i18n.language === 'ru' ? 'Введите название карты' : 'Enter chart name');
      setLoading(false);
      return;
    }

    const apiData = {
      birth_date: `${formData.birth_date}T${formData.birth_time}:00`,
      birth_place: formData.city,
      latitude: formData.latitude,
      longitude: formData.longitude,
      timezone: formData.timezone,
      name: formData.name
    };
    console.log('=== CHART CALCULATION REQUEST ===', JSON.stringify(apiData, null, 2));

    try {
      const response = await astrologyAPI.calculateChart(apiData);
      console.log('=== CHART CALCULATION RESPONSE ===', JSON.stringify(response, null, 2));

      // Добавляем Pars Fortuna и Vertex в planets для отображения в PlanetTable
      const enhancedPlanets = {
        ...response.planets,
        ...(response.houses_meta?.pars_fortuna && {
          Ft: {
            full_degree: response.houses_meta.pars_fortuna.longitude,
            sign: response.houses_meta.pars_fortuna.sign,
            sign_ru: response.houses_meta.pars_fortuna.sign_ru,
            degree: response.houses_meta.pars_fortuna.degree,
            house: response.houses_meta.pars_fortuna.house,
            speed: 0
          }
        }),
        ...(response.houses_meta?.vertex && {
          Vertex: (() => {
            const vertex = response.houses_meta.vertex;
            const longitude = vertex.longitude;
            const signIndex = Math.floor(longitude / 30) % 12;
            const zodiacSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
            return {
              full_degree: longitude,
              sign: vertex.sign || zodiacSigns[signIndex],
              sign_ru: vertex.sign_ru,
              degree: vertex.degree !== undefined ? vertex.degree : longitude % 30,
              house: vertex.house,
              speed: 0
            };
          })()
        })
      };

      const chartName = formData.name?.trim();

      const chartDataToSave = {
        ...response,
        planets: enhancedPlanets,
        vertex: response.houses_meta?.vertex !== undefined
          ? { longitude: response.houses_meta.vertex.longitude }
          : null,
        name: chartName,
        meta: {
          birth_date: formData.birth_date ? `${formData.birth_date}T${formData.birth_time}:00+03:00` : null,
          birth_place: formData.city,
          latitude: formData.latitude,
          longitude: formData.longitude,
          timezone: formData.timezone,
          jd: response.jd
        }
      };

      setChartData(chartDataToSave);
      // Сохраняем данные карты в localStorage
      localStorage.setItem('savedChartData', JSON.stringify(chartDataToSave));
      localStorage.removeItem('savedChartId');
    } catch (err) {
      console.error('Ошибка API:', err.response?.data);
      setError(err.response?.data?.detail || t('home.errors.calcError'));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="home">
      <Header />

      <section className="hero">
        <div className="container">
          <h1>{t('home.title')}</h1>
          <p>{t('home.subtitle')}</p>

          {!chartData && (
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
                  <label>{t('home.form.name')} *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={t('home.form.namePlaceholder')}
                    maxlength="10"
                  />
                  {nameError && <div style={{color: 'red', fontSize: '12px', marginTop: '4px'}}>{nameError}</div>}
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
          )}
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
            <h2 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}>
              {t('home.chart.title')}
            </h2>
            {chartData.name && (
              <p style={{
                fontSize: '18px',
                color: 'var(--text-secondary)',
                marginBottom: '20px',
                fontWeight: '500'
              }}>
                {chartData.name}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <AstroChartComponent
                chartData={chartData}
                size={700}
              />
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '30px',
              color: 'var(--text-secondary)',
              fontSize: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
                <div><strong>{t('home.chart.sun')}:</strong> {chartData.sun_sign ? t(`planets.signs.${chartData.sun_sign}`) : '—'}</div>
                <div><strong>{t('home.chart.moon')}:</strong> {chartData.moon_sign ? t(`planets.signs.${chartData.moon_sign}`) : '—'}</div>
                <div><strong>{t('home.chart.ascendant')}:</strong> {chartData.ascendant ? t(`planets.signs.${chartData.ascendant}`) : '—'}</div>
                <div><strong>{t('home.chart.mc')}:</strong> {chartData.mc ? t(`planets.signs.${chartData.mc}`) : '—'}</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <AnalysisModeToggle value={analysisMode} onChange={setAnalysisMode} />
            </div>

            <button
              type="button"
              className="btn-full-analysis"
              onClick={handleFullAnalysisClick}
              disabled={fullAnalysisLoading}
              style={{
                marginTop: '24px',
                marginLeft: 'auto',
                marginRight: 'auto',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: fullAnalysisLoading ? '30px 28px' : '14px 28px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: fullAnalysisLoading ? 'default' : 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                opacity: fullAnalysisLoading ? 0.8 : 1,
                minWidth: '280px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {fullAnalysisLoading ? <ProcessingMessage /> : t('home.getFullAnalysis')}
            </button>

            <button
              type="button"
              onClick={handleNewCalculation}
              style={{
                marginTop: '16px',
                marginLeft: 'auto',
                marginRight: 'auto',
                background: 'transparent',
                color: 'var(--text-primary)',
                padding: '12px 24px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {t('home.newCalculation')}
            </button>
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
                onPlanetClick={handlePlanetClick}
              />
            </div>

            <PlanetAnalysisModal
              planet={selectedPlanet}
              analysis={planetAnalysis}
              isOpen={!!selectedPlanet}
              onClose={handleCloseAnalysis}
              loading={analysisLoading}
              error={analysisError}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;