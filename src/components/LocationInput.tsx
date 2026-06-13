
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { geocodeAPI } from '../services/api';
import { useTranslation } from 'react-i18next';

export interface Location {
  lat: number;
  lon: number;
  display_name: string;
  timezone?: string;
  name?: string;
  country?: string;
}

interface LocationInfo {
  lat?: string | number;
  lon?: string | number;
  display_name?: string;
  timezone?: string;
  name?: string;
  country?: string;
  [key: string]: unknown;
}

interface LocationInputProps {
  value: string;
  onChange?: (value: string) => void;
  onLocationSelect?: (location: Location) => void;
  placeholder?: string;
  required?: boolean;
  label?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

const LocationInput = ({
  value,
  onChange,
  onLocationSelect,
  placeholder,
  required = false,
  label,
  style = {},
  disabled = false
}: LocationInputProps) => {
  const { t } = useTranslation();
  const [locations, setLocations] = useState<LocationInfo[]>([]);
  const [showLocations, setShowLocations] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string>('');
  const [internalValue, setInternalValue] = useState(value || '');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  const searchLocation = useCallback(async (query: string) => {
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
    } catch {
      setSearchError(t('home.form.locationErrorService'));
      setLocations([]);
    } finally {
      setSearchLoading(false);
    }
  }, [t]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
    setSearchError('');

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(newValue);
    }, 350);
  };

  const handleSelectLocation = useCallback(async (location: LocationInfo) => {
    const displayName = location.display_name || location.name || '';

    setInternalValue(displayName);
    onChange?.(displayName);

    if (onLocationSelect) {
      const locationData: Location = {
        lat: typeof location.lat === 'number' ? location.lat : (location.lat ? parseFloat(String(location.lat)) : 0),
        lon: typeof location.lon === 'number' ? location.lon : (location.lon ? parseFloat(String(location.lon)) : 0),
        display_name: displayName || '',
        timezone: location.timezone || 'UTC'
      };

      onLocationSelect(locationData);
    }

    setShowLocations(false);
    setLocations([]);
    setSearchError('');
  }, [onChange, onLocationSelect]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowLocations(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      {!internalValue && !searchLoading && (
        <div style={{
          marginTop: '8px',
          color: 'var(--text-secondary)',
          fontSize: '12px'
        }}>
          {t('home.form.locationHint')}
        </div>
      )}

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
export { Location };