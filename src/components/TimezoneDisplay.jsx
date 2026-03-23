import React from 'react'

/**
 * Компонент для отображения автоматически определенной таймзоны
 * 
 * @param {Object} props
 * @param {string} props.timezone - Таймзона в формате IANA (например, "Europe/Moscow")
 * @param {number} props.lat - Широта (опционально, для отображения координат)
 * @param {number} props.lon - Долгота (опционально, для отображения координат)
 * @param {string} props.label - Label для поля
 */
const TimezoneDisplay = ({
  timezone = 'UTC',
  lat = null,
  lon = null,
  label = 'Часовой пояс'
}) => {
  const hasCoordinates = lat !== null && lon !== null
  const displayTimezone = timezone.replace('_', ' ')
  
  // Форматируем координаты для отображения
  const formatCoordinates = () => {
    if (!hasCoordinates) return null
    return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`
  }

  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{
        padding: '12px 16px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        color: hasCoordinates ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: '1rem',
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center'
      }}>
        {hasCoordinates ? (
          <>
            <span style={{ color: 'var(--accent-glow)', marginRight: '8px' }}>✓</span>
            {displayTimezone}
            <span style={{ 
              marginLeft: 'auto', 
              fontSize: '12px', 
              color: 'var(--text-secondary)' 
            }}>
              Автоматически
            </span>
          </>
        ) : (
          'Выберите город для определения часового пояса'
        )}
      </div>
      
      <div style={{
        marginTop: '4px',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>
          {hasCoordinates 
            ? `Координаты: ${formatCoordinates()}`
            : 'Часовой пояс будет определен автоматически после выбора города'
          }
        </span>
        {hasCoordinates && (
          <span style={{
            fontSize: '10px',
            padding: '2px 6px',
            background: 'rgba(124, 58, 237, 0.2)',
            borderRadius: '4px',
            color: 'var(--accent-glow)'
          }}>
            ✓ Готово для расчета
          </span>
        )}
      </div>
    </div>
  )
}

export default TimezoneDisplay
