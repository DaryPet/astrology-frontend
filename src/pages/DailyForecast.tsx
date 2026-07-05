/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { geocodeAPI, astrologyAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import Header from '../components/Header';
import LocationInput from '../components/LocationInput';
import QuickDailyForecastPanel from '../components/QuickDailyForecastPanel';

interface BirthData {
  name?: string;
  birth_date?: string;
  birth_time?: string;
  birth_place?: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
  house_system?: string;
}

function DailyForecastPage() {
  const { lang } = useParams();
  const { t } = useTranslation();
  const currentLang = lang || i18n.language || 'ru';

  const [birthData, setBirthData] = useState<BirthData>({
    name: '',
    birth_date: '',
    birth_time: '12:00',
    birth_place: '',
    latitude: null,
    longitude: null,
    timezone: 'UTC'
  });

  const [chartData, setChartData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBirthData(prev => ({ ...prev, [name]: value }));
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
        // Fallback на UTC если не удалось определить
      }
    }

    setBirthData(prev => ({
      ...prev,
      birth_place: location.display_name,
      latitude: lat,
      longitude: lon,
      timezone: timezone
    }));
  };

  const handleNewCalculation = () => {
    setBirthData({
      name: '',
      birth_date: '',
      birth_time: '12:00',
      birth_place: '',
      latitude: null,
      longitude: null,
      timezone: 'UTC'
    });
    setChartData(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!birthData.birth_date || !birthData.birth_place) {
      setError(i18n.language === 'ru' ? 'Введите место рождения' : 'Enter birth place');
      setLoading(false);
      return;
    }

    try {
      const apiData = {
        birth_date: `${birthData.birth_date}T${birthData.birth_time}:00+03:00`,
        birth_place: birthData.birth_place,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone,
      };

      const response = await astrologyAPI.calculateChart(apiData);

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
        })
      };

      setChartData({
        ...response,
        planets: enhancedPlanets,
        meta: {
          birth_date: `${birthData.birth_date}T${birthData.birth_time}:00+03:00`,
          birth_place: birthData.birth_place,
          latitude: birthData.latitude,
          longitude: birthData.longitude,
          timezone: birthData.timezone
        }
      });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(', '));
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError(t('dailyForecastPage.errors.calcError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home">
      <Header />

      <section className="hero">
        <div className="container">
          <h1>{t('dailyForecastPage.title')}</h1>
          <p>{t('dailyForecastPage.subtitle')}</p>

          {!chartData && (
            <div className="form-card">
              {error && (
                <div className="error">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>{t('dailyForecastPage.form.name')}</label>
                  <input
                    type="text"
                    name="name"
                    value={birthData.name}
                    onChange={handleInputChange}
                    placeholder={t('dailyForecastPage.form.namePlaceholder')}
                    maxLength={10}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t('dailyForecastPage.form.birthDate')}</label>
                    <input
                      type="date"
                      name="birth_date"
                      value={birthData.birth_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>{t('dailyForecastPage.form.birthTime')}</label>
                    <input
                      type="time"
                      name="birth_time"
                      value={birthData.birth_time}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('dailyForecastPage.form.birthPlace')}</label>
                  <LocationInput
                    value={birthData.birth_place || ''}
                    onLocationSelect={handleLocationSelect}
                    placeholder={t('dailyForecastPage.form.cityPlaceholder')}
                  />
                </div>

                <button type="submit" className="btn-register" disabled={loading}>
                  {loading ? t('dailyForecastPage.form.submitting') : t('dailyForecastPage.form.submit')}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {chartData && (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
          <QuickDailyForecastPanel birthData={birthData} natalChart={chartData} />
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
      )}
    </div>
  );
}

export default DailyForecastPage;