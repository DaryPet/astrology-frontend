import React, { useState } from 'react';

const ASPECT_COLORS = {
  'Conjunction': '#FFD700', 'Opposition': '#FF4500', 'Trine': '#32CD32',
  'Square': '#FF6347', 'Sextile': '#1E90FF', 'Quincunx': '#9370DB'
};

const AspectGrid = ({ aspects, planets }) => {
  const [selectedAspect, setSelectedAspect] = useState(null);

  if (!aspects || aspects.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '12px',
        padding: '40px 20px',
        border: '1px solid var(--border)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          ☊
        </div>
        <h3 style={{ marginTop: 0, marginBottom: '8px', color: 'var(--text-primary)' }}>
          Аспекты не найдены
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
          В этой карте нет значимых аспектов между планетами
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid var(--border)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    }}>
      <h3 style={{
        marginTop: 0,
        marginBottom: '20px',
        color: 'var(--text-primary)',
        fontSize: '18px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: '#fff'
        }}>
          △
        </span>
        Аспекты планет ({aspects.length})
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '16px'
      }}>
        {aspects.map((aspect, index) => {
          const aspectColor = ASPECT_COLORS[aspect.aspect] || '#7c3aed';
          const isSelected = selectedAspect === index;

          return (
            <div
              key={index}
              style={{
                background: 'var(--bg-primary)',
                borderRadius: '10px',
                padding: '16px',
                border: `2px solid ${isSelected ? aspectColor : aspectColor + '40'}`,
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={() => setSelectedAspect(isSelected ? null : index)}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 8px 24px ${aspectColor}40`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: aspectColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: '#fff',
                    fontWeight: 'bold'
                  }}>
                    {aspect.aspect.substring(0, 2)}
                  </div>
                  <div>
                    <div style={{
                      color: aspectColor,
                      fontSize: '16px',
                      fontWeight: 'bold',
                      marginBottom: '4px'
                    }}>
                      {aspect.aspect}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)'
                    }}>
                      Орбис: <span style={{ fontWeight: 'bold', color: aspectColor }}>{aspect.orb}°</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                padding: '12px',
                background: 'var(--bg-secondary)',
                borderRadius: '8px'
              }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: 'var(--text-primary)',
                    marginBottom: '4px'
                  }}>
                    {aspect.planet1}
                  </div>
                </div>

                <div style={{
                  fontSize: '20px',
                  color: aspectColor,
                  fontWeight: 'bold',
                  padding: '0 16px'
                }}>
                  ⇄
                </div>

                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: 'var(--text-primary)',
                    marginBottom: '4px'
                  }}>
                    {aspect.planet2}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AspectGrid;
