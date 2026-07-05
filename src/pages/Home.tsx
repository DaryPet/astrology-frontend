/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { geocodeAPI, astrologyAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import i18n from '../i18n';
import Header from '../components/Header';
import LocationInput from '../components/LocationInput';
import PlanetTable from '../components/PlanetTable';
import PlanetAnalysisModal from '../components/PlanetAnalysisModal';
import AstroChartComponent from '../components/AstroChartComponent';
import ProcessingMessage from '../components/ProcessingMessage';
import AnalysisModeToggle from '../components/AnalysisModeToggle';
import DailyForecastPanel from '../components/DailyForecastPanel';

interface FormData {
  name: string;
  birth_date: string;
  birth_time: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
}

interface ChartPlanet {
  name?: string;
  full_degree?: number;
  sign?: string;
  sign_ru?: string;
  degree?: number;
  speed?: number;
  house?: number;
  house_sign?: string;
  is_retrograde?: boolean;
  aspects?: unknown[];
  [key: string]: unknown;
}

interface ChartHouse {
  cusp_longitude?: number;
  sign?: string;
  sign_ru?: string;
  degree?: number;
}

interface ChartData {
  planets?: Record<string, ChartPlanet>;
  houses?: Record<string, ChartHouse>;
  houses_meta?: {
    house_system?: string;
    armc?: number;
    vertex?: { longitude: number; sign?: string; sign_ru?: string; degree?: number; house?: number };
    pars_fortuna?: { longitude: number; sign?: string; sign_ru?: string; degree?: number; house?: number };
  };
  sun_sign?: string;
  sun_sign_ru?: string;
  moon_sign?: string;
  moon_sign_ru?: string;
  ascendant?: string;
  ascendant_ru?: string;
  mc?: string;
  mc_ru?: string;
  mc_degree?: number;
  jd?: number;
  meta?: {
    birth_date?: string;
    birth_place?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    jd?: number;
  };
  name?: string;
  aspects?: unknown[];
  type?: string;
}

interface PreparedChartData {
  planets: Record<string, ChartPlanet & { planet: string; sign_ru?: string; house_sign?: string; is_retrograde?: boolean }>;
  houses: Record<string, ChartHouse & { house: number; name_en: string; name_ru: string; cusp_longitude: number; degree: number }>;
  houses_meta: { house_system?: string; armc?: number; vertex?: unknown; pars_fortuna?: unknown };
  meta: { birth_date?: string; birth_place?: string; latitude?: number | null; longitude?: number | null; timezone?: string; jd?: number | null };
  sun_sign?: string;
  sun_sign_ru?: string;
  moon_sign?: string;
  moon_sign_ru?: string;
  ascendant?: string;
  ascendant_ru?: string;
  ascendant_degree?: number;
  mc?: string;
  mc_ru?: string;
  mc_degree?: number;
  name?: string;
  aspects?: unknown[];
}

function Home() {
  const navigate = useNavigate();
  const { lang } = useParams();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const currentLang = lang || i18n.language || 'ru';

  const [formData, setFormData] = useState<FormData>({
    name: '',
    birth_date: '',
    birth_time: '12:00',
    city: '',
    latitude: null,
    longitude: null,
    timezone: 'UTC'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<ChartPlanet | null>(null);
  const [planetAnalysis, setPlanetAnalysis] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string>('');
  const [analysisMode, setAnalysisMode] = useState<string>(() => {
    return localStorage.getItem('analysisMode') || 'simple';
  });
  const [isNavigating, setIsNavigating] = useState(false);
  const [showDailyForecast, setShowDailyForecast] = useState(false);

  useEffect(() => {
    const savedChartData = localStorage.getItem('savedChartData');
    if (savedChartData && !chartData) {
      try {
        const parsed = JSON.parse(savedChartData);
        setChartData(parsed);
      } catch (e) {
        console.error('Error parsing saved chart data:', e);
      }
    }
  }, [chartData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'name') setNameError('');
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = async (location: { lat: number; lon: number; display_name: string; timezone?: string }) => {
    const lat = typeof location.lat === 'string' ? parseFloat(location.lat) : location.lat;
    const lon = typeof location.lon === 'string' ? parseFloat(location.lon) : location.lon;

    let timezone = location.timezone || 'UTC';

    if (lat && lon) {
      try {
        const detectedTimezone = await geocodeAPI.detectTimezone(lat, lon);
        if (detectedTimezone && detectedTimezone !== 'UTC') {
          timezone = detectedTimezone;
        }
      } catch {
        // Fallback на UTC
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

  const handlePlanetClick = async (planetData: ChartPlanet & { name?: string }) => {
    const planetName = planetData.name ? t('planets.names.' + planetData.name) : '';
    setSelectedPlanet({ ...planetData, name: planetName });
    setPlanetAnalysis(null);
    setAnalysisError('');
    setAnalysisLoading(true);

    const savedAnalysis = localStorage.getItem(`planetAnalysis_${planetData.name}`);
    if (savedAnalysis) {
      setPlanetAnalysis(savedAnalysis);
      setAnalysisLoading(false);
      return;
    }

    try {
      const result = await astrologyAPI.getPlanetAnalysis({
        planet: planetData.name,
        sign: planetData.sign,
        degree: planetData.degree,
        house: planetData.house,
        house_sign: planetData.house_sign,
        aspects: planetData.aspects,
        is_retrograde: planetData.is_retrograde,
        language: i18n.language
      }, analysisMode);

      setPlanetAnalysis(result.analysis);
      localStorage.setItem(`planetAnalysis_${planetData.name}`, result.analysis);
    } catch (err) {
      console.error('Planet analysis error:', err);
      const errorDetail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      if (typeof errorDetail === 'string') {
        setAnalysisError(errorDetail);
      } else if (Array.isArray(errorDetail)) {
        setAnalysisError(errorDetail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(', '));
      } else if (errorDetail && typeof errorDetail === 'object' && 'msg' in errorDetail) {
        setAnalysisError((errorDetail as { msg: string }).msg);
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

  const prepareChartDataForAnalysis = useCallback((cd: ChartData | null): PreparedChartData | null => {
    if (!cd) return null;
    const zodiacSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const zodiacSignsRu = ['Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Дева', 'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы'];
    const planetNamesEn: Record<string, string> = {
      Sun: 'Sun', Moon: 'Moon', Mercury: 'Mercury', Venus: 'Venus', Mars: 'Mars',
      Jupiter: 'Jupiter', Saturn: 'Saturn', Uranus: 'Uranus', Neptune: 'Neptune',
      Pluto: 'Pluto', NorthNode: 'NorthNode', SouthNode: 'SouthNode', Chiron: 'Chiron',
      Lilith: 'Lilith', Ft: 'PartOfFortune', Vertex: 'Vertex'
    };

    const planets: Record<string, ChartPlanet & { planet: string }> = {};
    Object.entries(cd.planets || {}).forEach(([name, p]) => {
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

    const houses: Record<string, ChartHouse & { house: number; name_en: string; name_ru: string; cusp_longitude: number; degree: number }> = {};
    const houseNamesEn = ['1st House', '2nd House', '3rd House', '4th House', '5th House', '6th House',
      '7th House', '8th House', '9th House', '10th House', '11th House', '12th House'];
    const houseNamesRu = ['Дом 1', 'Дом 2', 'Дом 3', 'Дом 4', 'Дом 5', 'Дом 6',
      'Дом 7', 'Дом 8', 'Дом 9', 'Дом 10', 'Дом 11', 'Дом 12'];
    for (let i = 1; i <= 12; i++) {
      const house = cd.houses?.[i];
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
      house_system: cd.houses_meta?.house_system || 'Placidus',
      armc: cd.houses_meta?.armc || 0,
      vertex: cd.houses_meta?.vertex || null,
      pars_fortuna: cd.houses_meta?.pars_fortuna || null
    };

    const meta = cd.meta || {
      birth_date: formData.birth_date ? `${formData.birth_date}T${formData.birth_time}:00+03:00` : undefined,
      birth_place: formData.city,
      latitude: formData.latitude,
      longitude: formData.longitude,
      timezone: formData.timezone,
      jd: cd.jd
    };

    return {
      sun_sign: cd.sun_sign,
      sun_sign_ru: cd.sun_sign_ru,
      moon_sign: cd.moon_sign,
      moon_sign_ru: cd.moon_sign_ru,
      ascendant: cd.ascendant,
      ascendant_ru: cd.ascendant_ru,
      ascendant_degree: cd.houses?.[1]?.degree || 0,
      mc: cd.mc,
      mc_ru: cd.mc_ru,
      mc_degree: cd.mc_degree || 0,
      planets,
      houses,
      houses_meta,
      meta,
      name: cd.name || formData.name?.trim(),
      aspects: cd.aspects || []
    };
  }, [formData]);

  const handleFullAnalysisClick = () => {
    localStorage.setItem('analysisMode', analysisMode);
    const chartDataForAnalysis = prepareChartDataForAnalysis(chartData);

    if (!chartDataForAnalysis) return;

    localStorage.removeItem('savedFullAnalysis');
    localStorage.removeItem('savedChartId');
    localStorage.removeItem('chartDataForAnalysis');
    localStorage.setItem('chartDataForAnalysis', JSON.stringify(chartDataForAnalysis));

    localStorage.setItem('pendingAnalysisJob', JSON.stringify({
      chartDataForAnalysis,
      analysisMode,
      timestamp: Date.now()
    }));

    setIsNavigating(true);

    setTimeout(() => {
      if (!isAuthenticated) {
        navigate(`/${currentLang}/login`, {
          state: { from: '/', chartDataForAnalysis, showFullAnalysis: true, analysisMode }
        });
      } else {
        navigate(`/${currentLang}/dashboard`, {
          state: { showFullAnalysis: true, chartDataForAnalysis, analysisMode }
        });
      }
    }, 0);
  };

  const handleDailyForecastClick = () => {
    setShowDailyForecast(true);
  };

  const handleNewCalculation = () => {
    localStorage.removeItem('savedChartData');
    localStorage.removeItem('chartDataForAnalysis');
    localStorage.removeItem('savedFullAnalysis');
    localStorage.removeItem('savedFullAnalysis_simple');
    localStorage.removeItem('savedFullAnalysis_advanced');
    localStorage.removeItem('savedChartId');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('planetAnalysis_')) {
        localStorage.removeItem(key);
      }
    });
    setChartData(null);
    setShowDailyForecast(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name?.trim()) {
      setNameError(i18n.language === 'ru' ? 'Введите название карты' : 'Enter chart name');
      setLoading(false);
      return;
    }

    const apiData = {
      birth_date: `${formData.birth_date}T${formData.birth_time}:00+03:00`,
      birth_place: formData.city,
      latitude: formData.latitude,
      longitude: formData.longitude,
      timezone: formData.timezone,
      name: formData.name
    };

    try {
      const response = await astrologyAPI.calculateChart(apiData);
      console.log('🔮 Natal chart data from backend:', JSON.stringify(response, null, 2));

      const enhancedPlanets: Record<string, any> = {
        ...(response.planets || {}),
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

      const chartDataToSave: ChartData = {
        ...(response as any),
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
      localStorage.setItem('savedChartData', JSON.stringify(chartDataToSave));
      localStorage.removeItem('savedChartId');
    } catch (err) {
      console.error('Ошибка API:', (err as { response?: { data?: unknown } })?.response?.data);
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || t('home.errors.calcError'));
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
                    ? (error as { msg?: string; message?: string }).msg || (error as { msg?: string; message?: string }).message || t('home.errors.calcError')
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
                    maxLength={10}
                  />
                  {nameError && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{nameError}</div>}
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

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '24px' }}>
              <button
                type="button"
                className="btn-full-analysis"
                onClick={handleFullAnalysisClick}
                disabled={isNavigating}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: isNavigating ? '30px 28px' : '14px 28px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isNavigating ? 'default' : 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  opacity: isNavigating ? 0.8 : 1,
                  minWidth: '280px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isNavigating ? <ProcessingMessage /> : t('home.getFullAnalysis')}
              </button>

              <button
                type="button"
                onClick={handleDailyForecastClick}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  padding: '14px 28px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {t('home.dailyForecast')}
              </button>
            </div>

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
              {t('home.planets.title')}
            </h3>

            <div style={{ marginBottom: '40px' }}>
              <PlanetTable
                planets={chartData.planets}
                houses={chartData.houses}
                onPlanetClick={handlePlanetClick}
              />
            </div>

            <PlanetAnalysisModal
              planet={selectedPlanet ?? undefined}
              analysis={planetAnalysis}
              isOpen={!!selectedPlanet}
              onClose={handleCloseAnalysis}
              loading={analysisLoading}
              error={analysisError}
            />
          </div>

          {showDailyForecast && (
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>
                {t('dailyForecast.forPerson')}: {chartData.name}
              </h3>
              <DailyForecastPanel natalChart={chartData} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Home;