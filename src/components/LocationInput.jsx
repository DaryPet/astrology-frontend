import React, { useState, useEffect, useRef, useCallback } from 'react';
import { geocodeAPI } from '../services/api';
import { useTranslation } from 'react-i18next';

/**
 * Компонент для ввода города с автокомплитом
 *
 * @param {Object} props
 * @param {string} props.value - Текущее значение
 * @param {Function} props.onChange - Обработчик изменения значения
 * @param {Function} props.onLocationSelect - Обработчик выбора города (получает объект location)
 * @param {string} props.placeholder - Placeholder для инпута
 * @param {boolean} props.required - Обязательное поле
 * @param {string} props.label - Label для поля
 * @param {Object} props.style - Дополнительные стили
 */
const LocationInput = ({
  value,
  onChange,
  onLocationSelect,
  placeholder,
  required = false,
  label,
  style = {},
  disabled = false
}) => {
  const { t } = useTranslation();
  const [locations, setLocations] = useState([]);
  const [showLocations, setShowLocations] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [internalValue, setInternalValue] = useState(value || '');

  const containerRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Синхронизация внешнего и внутреннего значения
  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  // Дебаунс поиска городов
  const searchLocation = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setLocations([]);
      setSearchError('');
      return;
    }

    setSearchLoading(true);
    setSearchError('');

    try {
      const results = await geocodeAPI.autocomplete(query);

      if (results.length === 0) {
        setSearchError(t('home.form.locationErrorNotFound'));
      }

      setLocations(results.slice(0, 8));
      setShowLocations(true);
    } catch (err) {
      console.error('Geocode autocomplete error:', err);
      setSearchError(t('home.form.locationErrorService'));
      setLocations([]);
    } finally {
      setSearchLoading(false);
    }
  }, [t]);

  // Обработчик изменения значения
  const handleChange = (e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
    setSearchError('');

    // Дебаунс поиска
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(newValue);
    }, 350);
  };

  // Выбор города из списка
  const handleSelectLocation = useCallback(async (location) => {
    const displayName = location.display_name || location.name || '';

    setInternalValue(displayName);
    onChange?.(displayName);

    // Вызываем callback с полной информацией о местоположении
    if (onLocationSelect) {
      const locationData = {
        ...location,
        lat: parseFloat(location.lat),
        lon: parseFloat(location.lon),
        timezone: location.timezone || 'UTC'
      };

      onLocationSelect(locationData);
    }

    setShowLocations(false);
    setLocations([]);
    setSearchError('');
  }, [onChange, onLocationSelect]);

  // Обработчик клика вне компонента
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowLocations(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="form-group" ref={containerRef} style={{ position: 'relative', ...style }}>
      {label && <label>{label}{required && ' *'}</label>}

      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        onFocus={() => locations.length > 0 && setShowLocations(true)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        style={{ width: '100%' }}
      />

      {/* Индикатор загрузки поиска */}
      {searchLoading && (
        <div style={{
          position: 'absolute',
          right: '12px',
          top: label ? '38px' : '12px',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          {t('common.loading')}
        </div>
      )}

      {/* Сообщения об ошибках поиска */}
      {searchError && !showLocations && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--error)',
          borderRadius: '6px',
          color: 'var(--error)',
          fontSize: '13px'
        }}>
          {searchError}
        </div>
      )}

      {/* Подсказка для пользователя */}
      {!internalValue && !searchLoading && (
        <div style={{
          marginTop: '8px',
          color: 'var(--text-secondary)',
          fontSize: '12px'
        }}>
          {t('home.form.locationHint')}
        </div>
      )}

      {/* Список найденных городов */}
      {showLocations && locations.length > 0 && (
        <div className="autocomplete-dropdown">
          {locations.map((location, index) => (
            <div
              key={`${location.display_name}-${index}`}
              className="autocomplete-item"
              onClick={() => handleSelectLocation(location)}
            >
              <div className="autocomplete-name">
                {location.display_name || location.name}
              </div>
              <div className="autocomplete-details">
                {location.country && <span>{location.country}</span>}
                {location.timezone && (
                  <span style={{ marginLeft: '8px', color: 'var(--accent-glow)' }}>
                    {location.timezone.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Сообщение "ничего не найдено" */}
      {showLocations && locations.length === 0 && !searchLoading && (
        <div className="autocomplete-dropdown" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {t('home.form.locationNoResults')}
            <ul style={{ marginTop: '8px', paddingLeft: '20px', textAlign: 'left' }}>
              <li>{t('home.form.locationNoResultsTip1')}</li>
              <li>{t('home.form.locationNoResultsTip2')}</li>
              <li>{t('home.form.locationNoResultsTip3')}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationInput;
