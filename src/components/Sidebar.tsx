import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { Menu, X, Sparkles, ChevronDown, Pencil, Trash2, Check, Users, Calendar, MapPin } from 'lucide-react';
import '../styles/dashboard.css';

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
  // The drawer lives here, not in Dashboard, so Dashboard.tsx stays untouched
  // (openspec/changes/premium-design-system, Decision 5). On desktop the class
  // does nothing — all the mobile mechanics are inside @media.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      <button
        type="button"
        className={`db-sidebar-burger${drawerOpen ? ' db-sidebar-burger--hidden' : ''}`}
        onClick={() => setDrawerOpen(true)}
        aria-label={t('dashboard.actions.openMenu')}
        aria-expanded={drawerOpen}
      >
        <Menu size={18} strokeWidth={2} />
      </button>

      {drawerOpen && (
        <div className="db-sidebar-overlay" onClick={closeDrawer} aria-hidden="true" />
      )}

      <aside className={`db-sidebar${drawerOpen ? ' db-sidebar--open' : ''}`}>

        <button
          type="button"
          className="db-sidebar__close"
          onClick={closeDrawer}
          aria-label={t('dashboard.actions.closeMenu')}
        >
          <X size={16} strokeWidth={2} />
        </button>

        <button onClick={() => { closeDrawer(); onNewChart(); }} className="db-sidebar__new-btn">
          <Sparkles size={16} strokeWidth={2.2} />
          {t('dashboard.actions.newChart')}
        </button>

        <div className="db-sidebar__divider" />

        <div>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="db-sidebar__section-header"
          >
            {t('dashboard.features.history.title')}
            <ChevronDown
              size={13}
              strokeWidth={2.5}
              className={`db-sidebar__section-chevron${historyOpen ? ' db-sidebar__section-chevron--open' : ''}`}
            />
          </button>

          {historyOpen && (
            <div className="db-sidebar__chart-list">
              {historyLoading ? (
                <div className="db-sidebar__skeleton-list">
                  <div className="db-skeleton db-skeleton--chart-item" />
                  <div className="db-skeleton db-skeleton--chart-item" />
                  <div className="db-skeleton db-skeleton--chart-item" />
                </div>
              ) : historyCharts.length === 0 ? (
                <div className="db-sidebar__empty">{t('history.empty')}</div>
              ) : (
                historyCharts.map((chart) => {
                  const chartData = chart.chart_data;
                  const isSynastry = chartData?.type === 'synastry';
                  const isActive = savedChartId === chart.id;
                  const isEditing = renameChartId === chart.id;
                  const displayName = chart.name || t('dashboard.chart.defaultName');
                  const icon = isSynastry ? '🔮' : getSunSignEmoji ? getSunSignEmoji(chart.sun_sign || '') : '🌟';

                  let dateDisplay: string;
                  if (isSynastry) {
                    const date1 = chartData?.chart1?.birth_date?.split('T')[0] || '—';
                    const date2 = chartData?.chart2?.birth_date?.split('T')[0] || '—';
                    dateDisplay = `${date1} / ${date2}`;
                  } else {
                    dateDisplay = chart.chart_data?.meta?.birth_date?.split('T')[0] || '—';
                  }

                  let placeDisplay: string;
                  if (isSynastry) {
                    const place1 = chartData?.chart1?.birth_place || '—';
                    const place2 = chartData?.chart2?.birth_place || '—';
                    placeDisplay = `${place1} / ${place2}`;
                  } else {
                    placeDisplay = chart.chart_data?.meta?.birth_place || '—';
                  }

                  return (
                    <div
                      key={chart.id}
                      onClick={isEditing ? undefined : () => { closeDrawer(); onSelectChart(chart); }}
                      className={[
                        'db-sidebar__chart-item',
                        isActive ? 'db-sidebar__chart-item--active' : '',
                        isEditing ? 'db-sidebar__chart-item--editing' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {isEditing ? (
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
                            className="db-sidebar__rename-input"
                          />
                          <div className={`db-sidebar__rename-counter ${renameError ? 'db-sidebar__rename-counter--error' : 'db-sidebar__rename-counter--ok'}`}>
                            {renameError || `${renameChartName.length}/15`}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                            <button onClick={onSaveRename} className="db-sidebar__icon-btn">
                              {renaming ? '…' : <Check size={14} strokeWidth={2.4} />}
                            </button>
                            <button onClick={onCancelRename} className="db-sidebar__icon-btn">
                              <X size={14} strokeWidth={2.4} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                              <span style={{ fontSize: '14px', flexShrink: 0 }}>{icon}</span>
                              <span className={`db-sidebar__chart-name ${isActive ? 'db-sidebar__chart-name--active' : 'db-sidebar__chart-name--inactive'}`}>
                                {displayName}
                              </span>
                            </div>
                            <div className="db-sidebar__chart-meta">
                              <Calendar size={11} strokeWidth={2} />
                              <span>{dateDisplay}</span>
                            </div>
                            <div className="db-sidebar__chart-meta">
                              <MapPin size={11} strokeWidth={2} />
                              <span>{placeDisplay}</span>
                            </div>
                          </div>
                          <div className="db-sidebar__chart-actions">
                            <button
                              onClick={(e) => { e.stopPropagation(); onStartRename(chart); }}
                              className="db-sidebar__icon-btn"
                            ><Pencil size={13} strokeWidth={2} /></button>
                            <button
                              onClick={(e) => onDeleteChart(chart, e)}
                              className="db-sidebar__icon-btn"
                            ><Trash2 size={13} strokeWidth={2} /></button>
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

        <button
          onClick={() => {
            closeDrawer();
            if (onProtectedNavigation) onProtectedNavigation(`/${currentLang}/synastry`);
            else navigate(`/${currentLang}/synastry`);
          }}
          className="db-sidebar__nav-btn"
        >
          <Users size={15} strokeWidth={2} />
          {t('dashboard.actions.synastry')}
        </button>

      </aside>
    </>
  );
};

export default Sidebar;
