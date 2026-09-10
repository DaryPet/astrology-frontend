import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface Aspect {
  planet1: string;
  planet2: string;
  aspect: string;
  orb?: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface AspectGridProps {
  aspects: Aspect[] | undefined;
  _planets?: Record<string, any>;
  onAspectClick?: (aspect: Aspect) => void;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

const ASPECT_COLORS: Record<string, string> = {
  'Conjunction': '#FFD700', 'Opposition': '#FF4500', 'Trine': '#32CD32',
  'Square': '#FF6347', 'Sextile': '#1E90FF', 'Quincunx': '#9370DB'
};

// On touch devices `mouseenter` is emulated on tap, and the lifted card stays
// lifted until a tap elsewhere — it reads as "selected". A media query cannot
// switch this off: the handler writes an inline style, which outranks any CSS.
// The check is one-shot, inside the handler — not a matchMedia subscription
// (design.md, Non-Goals).
const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

const AspectGrid = ({ aspects, _planets, onAspectClick, title, emptyTitle, emptyDescription }: AspectGridProps) => {
  const { t } = useTranslation();
  const [selectedAspect, setSelectedAspect] = useState<number | null>(null);

  if (!aspects || aspects.length === 0) {
    return (
      <div className="ui-card" style={{ textAlign: 'center', padding: 'var(--space-9) var(--space-5)' }}>
        <div className="ui-muted" style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>
          ☊
        </div>
        <h3 className="ui-subtitle">
          {emptyTitle || t('planets.aspects.notFound')}
        </h3>
        <p className="ui-meta" style={{ margin: 0 }}>
          {emptyDescription || t('planets.aspects.notFoundDesc')}
        </p>
      </div>
    );
  }

  const getPlanetName = (planet: string) => {
    const key = `planets.names.${planet}`;
    const translated = t(key);
    return translated !== key ? translated : planet;
  };

  const getAspectName = (aspectName: string) => {
    const key = `planets.aspectNames.${aspectName}`;
    const translated = t(key);
    return translated !== key ? translated : aspectName;
  };

  return (
    <div className="ui-card">
      <h3 className="ui-subtitle ui-row ui-row--tight" style={{ marginBottom: 'var(--space-5)' }}>
        <span className="ui-dot">
          △
        </span>
        {title || t('planets.aspects.title')} ({aspects.length})
      </h3>

      <div className="ui-grid ui-grid--loose">
        {aspects.map((aspect, index) => {
          const aspectColor = ASPECT_COLORS[aspect.aspect || ''] || '#7c3aed';
          const isSelected = selectedAspect === index;

          const aspectName = getAspectName(aspect.aspect || '');

          const planet1Name = getPlanetName(aspect.planet1 || '');
          const planet2Name = getPlanetName(aspect.planet2 || '');

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
              onClick={() => { setSelectedAspect(isSelected ? null : index); onAspectClick && onAspectClick(aspect); }}
              onMouseEnter={(e) => {
                if (!canHover()) return;
                if (!isSelected) {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${aspectColor}40`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }
              }}>
              <div className="ui-row ui-row--between" style={{ marginBottom: 'var(--space-3)', flexWrap: 'nowrap' }}>
                <div className="ui-row">
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
                    {(aspect.aspect || '').substring(0, 2)}
                  </div>
                  <div>
                    <div style={{
                      color: aspectColor,
                      fontSize: '16px',
                      fontWeight: 'bold',
                      marginBottom: '4px'
                    }}>
                      {aspectName}
                    </div>
                    <div className="ui-aspect-orb" style={{ marginLeft: 0 }}>
                      {t('planets.orb')}: <span style={{ fontWeight: 'bold', color: aspectColor }}>{aspect.orb}°</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ui-row ui-row--between" style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', flexWrap: 'nowrap' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div className="ui-table__strong" style={{ marginBottom: 'var(--space-1)' }}>
                    {planet1Name}
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
                  <div className="ui-table__strong" style={{ marginBottom: 'var(--space-1)' }}>
                    {planet2Name}
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