import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import ProcessingMessage from './ProcessingMessage';

interface ChartItem {
  id: string | number;
  name?: string;
  sun_sign?: string;
  chart_data?: {
    type?: string;
    meta?: {
      birth_date?: string;
      birth_place?: string;
    };
    chart1?: {
      birth_date?: string;
      birth_place?: string;
    };
    chart2?: {
      birth_date?: string;
      birth_place?: string;
    };
  };
  chart_interpretations?: Array<{ type?: string; interpretation?: string; name?: string }>;
  created_at?: string;
}

interface SidebarProps {
  historyCharts: ChartItem[];
  historyLoading: boolean;
  onSelectChart: (chart: ChartItem) => void;
  onNewChart: () => void;
  savedChartId: string | number | null;
  renameChartId: string | number | null;
  renameChartName: string;
  renaming: boolean;
  renameError: string | null;
  onStartRename: (chart: ChartItem) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onRenameChange: (name: string) => void;
  onDeleteChart: (chart: ChartItem, e: React.MouseEvent) => void;
  getSunSignEmoji?: (sign: string) => string;
  hasUnsavedAnalysis?: boolean;
  onProtectedNavigation?: (to: string) => void;
}

const Sidebar = ({
  historyCharts,
  historyLoading,
  onSelectChart,
  onNewChart,
  savedChartId,
  renameChartId,
  renameChartName,
  renaming,
  renameError,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onRenameChange,
  onDeleteChart,
  getSunSignEmoji,
  hasUnsavedAnalysis: _hasUnsavedAnalysis,
  onProtectedNavigation,
}: SidebarProps) => {
  const navigate = useNavigate();
  const { lang } = useParams();
  const { t } = useTranslation();
  const currentLang = lang || i18n.language || 'ru';
  const [historyOpen, setHistoryOpen] = useState(true);

  return (
    <aside style={{
      width: '260px',
      minWidth: '260px',
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      minHeight: 'calc(100vh - 65px)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      gap: '8px',
      position: 'sticky',
      top: '65px',
      left: 0,
      alignSelf: 'flex-start',
      maxHeight: 'calc(100vh - 65px)',
      overflowY: 'auto',
    }}>

      {/* Новая карта — главная кнопка */}
      <button
        onClick={onNewChart}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
          color: 'white',
          padding: '12px 16px',
          border: 'none',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'}
        onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
      >
        <span style={{ fontSize: '16px' }}>✦</span>
        {t('dashboard.actions.newChart')}
      </button>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

      {/* История карт */}
      <div>
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 4px',
          }}
        >
          {t('dashboard.features.history.title')}
          <span style={{
            fontSize: '10px',
            transition: 'transform 0.2s',
            transform: historyOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>▼</span>
        </button>

        {historyOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            {historyLoading ? (
              <div style={{ padding: '8px 4px' }}>
                <ProcessingMessage size="sm" />
              </div>
            ) : historyCharts.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '8px 4px' }}>
                {t('history.empty')}
              </div>
            ) : (
              historyCharts.map((chart) => {
                const chartData = chart.chart_data;
                const isSynastry = chartData?.type === 'synastry';

                // Имя для отображения (всегда из chart.name, включая переименованные синастрии)
                const displayName = chart.name || t('dashboard.chart.defaultName');

                // Иконка
                const icon = isSynastry ? '🔮' : getSunSignEmoji ? getSunSignEmoji(chart.sun_sign || '') : '🌟';

                // Дата
                let dateDisplay;
                if (isSynastry) {
                  const date1 = chartData?.chart1?.birth_date?.split('T')[0] || '—';
                  const date2 = chartData?.chart2?.birth_date?.split('T')[0] || '—';
                  dateDisplay = `📅 ${date1} / ${date2}`;
                } else {
                  dateDisplay = `📅 ${chart.chart_data?.meta?.birth_date?.split('T')[0] || '—'}`;
                }

                // Место
                let placeDisplay;
                if (isSynastry) {
                  const place1 = chartData?.chart1?.birth_place || '—';
                  const place2 = chartData?.chart2?.birth_place || '—';
                  placeDisplay = `📍 ${place1} / ${place2}`;
                } else {
                  placeDisplay = `📍 ${chart.chart_data?.meta?.birth_place || '—'}`;
                }

                return (
                  <div
                    key={chart.id}
                    onClick={renameChartId === chart.id ? undefined : () => onSelectChart(chart)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: renameChartId === chart.id ? 'default' : 'pointer',
                      background: savedChartId === chart.id
                        ? 'rgba(124, 58, 237, 0.15)'
                        : 'transparent',
                      border: savedChartId === chart.id
                        ? '1px solid rgba(124, 58, 237, 0.3)'
                        : '1px solid transparent',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (savedChartId !== chart.id && renameChartId !== chart.id) {
                        (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-secondary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (savedChartId !== chart.id) {
                        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                      }
                    }}
                  >
                    {renameChartId === chart.id ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={renameChartName}
                          onChange={(e) => onRenameChange(e.target.value)}
                          maxLength={15}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveRename();
                            if (e.key === 'Escape') onCancelRename();
                          }}
                          style={{
                            width: '100%',
                            fontSize: '13px',
                            padding: '4px 6px',
                            border: '1px solid var(--accent)',
                            borderRadius: '4px',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            marginBottom: '4px',
                          }}
                        />
                        <div style={{ fontSize: '11px', color: renameError ? 'var(--error)' : 'var(--text-secondary)' }}>
                          {renameError || `${renameChartName.length}/15`}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                          <button onClick={onSaveRename} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                            {renaming ? '...' : '💾'}
                          </button>
                          <button onClick={onCancelRename} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>❌</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            <span style={{ fontSize: '14px' }}>{icon}</span>
                            <span style={{
                              fontSize: '13px',
                              fontWeight: savedChartId === chart.id ? '600' : '400',
                              color: savedChartId === chart.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {displayName}
                            </span>
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {dateDisplay}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {placeDisplay}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '2px', flexShrink: 0, alignItems: 'flex-start' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); onStartRename(chart); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '2px', opacity: '0.6' }}
                            onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                            onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = '0.6'}
                          >✏️</button>
                          <button
                            onClick={(e) => onDeleteChart(chart, e)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '2px', opacity: '0.6' }}
                            onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                            onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = '0.6'}
                          >🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Синастрия */}
      <button
        onClick={() => onProtectedNavigation ? onProtectedNavigation(`/${currentLang}/synastry`) : navigate(`/${currentLang}/synastry`)}
        style={{
          width: '100%',
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          color: 'var(--text-secondary)',
          padding: '10px 16px',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
        }}
      >
        <span>🔮</span>
        {t('dashboard.actions.synastry')}
      </button>

    </aside>
  );
};

export default Sidebar;