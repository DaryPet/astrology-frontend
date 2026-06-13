// src/components/AnalysisTabs.tsx
// Таб-бар переключения видов анализа на Dashboard: Натальная карта | Прогрессии.
// Натальная — всегда первая и активна по умолчанию; контент рендерит родитель.
import React from 'react';
import { useTranslation } from 'react-i18next';

export type AnalysisTabId = 'natal' | 'progressions' | 'transits';

interface AnalysisTabsProps {
  active: AnalysisTabId;
  onChange: (tab: AnalysisTabId) => void;
  showProgressions: boolean; // гейтинг: сохранённая карта + анализ + не синастрия
  showTransits?: boolean;    // тот же гейтинг
}

const AnalysisTabs: React.FC<AnalysisTabsProps> = ({ active, onChange, showProgressions, showTransits }) => {
  const { t } = useTranslation();

  const tabs: Array<{ id: AnalysisTabId; icon: string; label: string }> = [
    { id: 'natal', icon: '☉', label: t('dashboard.tabs.natal') },
  ];
  if (showProgressions) {
    tabs.push({ id: 'progressions', icon: '📈', label: t('dashboard.tabs.progressions') });
  }
  if (showTransits) {
    tabs.push({ id: 'transits', icon: '🌌', label: t('dashboard.tabs.transits') });
  }

  if (tabs.length < 2) return null;

  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: '4px',
        marginTop: '28px',
        padding: '4px',
        background: 'var(--bg-secondary, rgba(124, 58, 237, 0.06))',
        border: '1px solid var(--border)',
        borderRadius: '12px',
      }}
    >
      {tabs.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              borderRadius: '9px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s',
              background: isActive
                ? 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)'
                : 'transparent',
              color: isActive ? 'white' : 'var(--text-secondary)',
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default AnalysisTabs;
