import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { astrologyAPI } from '../services/api';
import { chartsApi } from '../services/chartsApi';
import { getFullAnalysis } from '../services/analysisCache';
import i18n from '../i18n';
import Header from '../components/Header';
import ProcessingMessage from '../components/ProcessingMessage';
import MarkdownContent from '../components/MarkdownContent';
import DeleteChartModal from '../components/DeleteChartModal';
import DuplicateChartModal from '../components/DuplicateChartModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import Sidebar from '../components/Sidebar';
import PlanetTable from '../components/PlanetTable';
import PlanetAnalysisModal from '../components/PlanetAnalysisModal';
import AspectGrid, { Aspect } from '../components/AspectGrid';
import SynastryChartComponent from '../components/SynastryChartComponentV2';
import AstroChartComponent from '../components/AstroChartComponent';
import AspectAnalysisModal from '../components/AspectAnalysisModal';
import AnalysisModeToggle from '../components/AnalysisModeToggle';
// ВРЕМЕННО ОТКЛЮЧЕНО: типы отношений. Код готов и рабочий, просто пока не показываем.
// Чтобы вернуть — раскомментировать этот импорт и все блоки с пометкой
// "ВРЕМЕННО ОТКЛЮЧЕНО: типы отношений" в этом файле.
// import RelationshipTypesBar from '../components/RelationshipTypesBar';
import UnsavedAnalysisModal from '../components/UnsavedAnalysisModal';
import ProgressionsPanel from '../components/ProgressionsPanel';
import AnalysisTabs, { AnalysisTabId } from '../components/AnalysisTabs';
import TransitsPanel from '../components/TransitsPanel';
import DailyForecastPanel from '../components/DailyForecastPanel';
import type { ProgressionsData, TransitsData } from '../services/api';
import type { Location } from '../components/LocationInput';
import { isNearLimit, isAtLimit, MAX_MESSAGES, type ChatMessage } from '../services/chatStorage';

// Максимальное число AI-анализов транзитов в день (на фронте, в localStorage)
const MAX_TRANSITS_ANALYSIS_PER_DAY = 20;

interface ChartPlanet {
  full_degree?: number;
  sign?: string;
  sign_ru?: string;
  degree?: number;
  speed?: number;
  house?: number;
  house_sign?: string;
  is_retrograde?: boolean;
  aspects?: unknown[];
  name?: string;
  [key: string]: unknown;
}

interface ChartHouse {
  cusp_longitude?: number;
  sign?: string;
  sign_ru?: string;
  degree?: number;
}

interface ChartData {
  type?: string;
  name?: string;
  sun_sign?: string;
  sun_sign_ru?: string;
  moon_sign?: string;
  moon_sign_ru?: string;
  ascendant?: string;
  ascendant_ru?: string;
  mc?: string;
  mc_ru?: string;
  mc_degree?: number;
  planets?: Record<string, ChartPlanet>;
  houses?: Record<string, ChartHouse>;
  aspects?: unknown[];
  overlays?: unknown[];
  chart1?: {
    birth_date?: string;
    birth_place?: string;
    planets?: Record<string, ChartPlanet>;
    houses?: Record<string, ChartHouse>;
    [key: string]: unknown;
  };
  chart2?: {
    birth_date?: string;
    birth_place?: string;
    planets?: Record<string, ChartPlanet>;
    houses?: Record<string, ChartHouse>;
    [key: string]: unknown;
  };
  person1_name?: string;
  person2_name?: string;
  jd?: number;
  meta?: {
    birth_date?: string;
    birth_place?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    jd?: number;
  };
  [key: string]: unknown;
}

interface HistoryChart {
  id: string | number;
  name?: string;
  sun_sign?: string;
  chart_data?: ChartData;
  chart_interpretations?: Array<{ type?: string; interpretation?: string; name?: string }>;
  created_at?: string;
}

type PlanetAnalysisResponse = {
  name?: string;
  interpretation?: string;
};

interface AspectData {
  planet1: string;
  planet2: string;
  aspect: string;
  aspect_ru?: string;
  orb?: number;
}

interface PlanetData {
  full_degree?: number;
  sign?: string;
  sign_ru?: string;
  degree?: number;
  speed?: number;
  house?: number;
  house_sign?: string;
  aspects?: unknown[];
  is_retrograde?: boolean;
  [key: string]: unknown;
}

// ВРЕМЕННО ОТКЛЮЧЕНО: типы отношений. Код готов, пока закомментирован.
// interface RelationshipTypesData {
//   dominant_type?: string;
//   relationship_types?: {
//     [key: string]: { percentage?: number; label?: string; description?: string };
//   };
//   [key: string]: unknown;
// }

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useParams();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useTranslation();

  const currentLang = lang || i18n.language || 'ru';

  const chartIdFromUrl = searchParams.get('chart');

  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [chartDataForAnalysis, setChartDataForAnalysis] = useState<ChartData | null>(null);
  const [fullAnalysis, setFullAnalysis] = useState<string | null>(null);
  const [simpleAnalysis, setSimpleAnalysis] = useState<string | null>(null);
  const [advancedAnalysis, setAdvancedAnalysis] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<string>(() => {
    return location.state?.analysisMode
      || localStorage.getItem('dashboardAnalysisMode')
      || 'simple';
  });

  const pendingModeRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const isTransitsLoadingRef = useRef(false);
  const [savedChartId, setSavedChartId] = useState<string | number | null>(() => {
    // Don't restore savedChartId if there's a pending analysis job

    // ИЗМЕНЕНИЯ ЗДЕСЬ ЕСЛИ НАДО БУДЕТ ОТКАТИТЬ
    const hasPendingJob = localStorage.getItem('pendingAnalysisJob');
    if (hasPendingJob) return null;

    //     const hasPendingJob = localStorage.getItem('pendingAnalysisJob');
    // const hasPendingResult = localStorage.getItem('pendingAnalysisResult');
    // if (hasPendingJob || hasPendingResult) return null;

    // ЗДЕСЬ ЗАКНЧИЛОСЬ!
    const saved = localStorage.getItem('savedChartId');
    return saved ? parseInt(saved, 10) : null;
  });
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  // Карты, для которых сейчас летит запрос к астрологу (ответ приходит в фоне)
  const [pendingChatCharts, setPendingChatCharts] = useState<Set<number>>(new Set());
  // Актуальная карта в любой момент — для фоновых ответов чата
  const savedChartIdRef = useRef<string | number | null>(null);
  // Индикатор «печатает» только для ТЕКУЩЕЙ карты
  const chatLoading = savedChartId != null && pendingChatCharts.has(Number(savedChartId));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [historyCharts, setHistoryCharts] = useState<HistoryChart[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingSaveName, setPendingSaveName] = useState<string | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [chartToDelete, setChartToDelete] = useState<HistoryChart | null>(null);
  const [deletingChart, setDeletingChart] = useState(false);
  const [renameChartId, setRenameChartId] = useState<string | number | null>(null);
  const [renameChartName, setRenameChartName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [chartsUpdated, setChartsUpdated] = useState(false);
  const [showPlanetTable, setShowPlanetTable] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const handleTogglePlanetTable = () => {
    setShowPlanetTable(prev => {
      const next = !prev;
      if (next) setShowProgressions(false); // таблица планет и прогрессии — взаимоисключающие виды
      return next;
    });
  };
  const [selectedPlanet, setSelectedPlanet] = useState<ChartPlanet | null>(null);
  const [planetAnalysis, setPlanetAnalysis] = useState<string | null>(null);
  const [planetAnalysisLoading, setPlanetAnalysisLoading] = useState(false);
  const [planetAnalysisError, setPlanetAnalysisError] = useState<string>('');
  const [selectedAspect, setSelectedAspect] = useState<AspectData | null>(null);
  const [aspectAnalysis, setAspectAnalysis] = useState<string | null>(null);
  const [aspectLoading, setAspectLoading] = useState(false);
  const [aspectError, setAspectError] = useState<string>('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  // ВРЕМЕННО ОТКЛЮЧЕНО: типы отношений. Код готов, пока закомментирован.
  // const [relationshipTypes, setRelationshipTypes] = useState<RelationshipTypesData | null>(null);
  // const [relationshipTypesLoading, setRelationshipTypesLoading] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  // Прогрессии — доступны ТОЛЬКО для сохранённых карт (как чат)
  const [showProgressions, setShowProgressions] = useState(false);
  // Активный таб анализа: натальная карта (по умолчанию) | прогрессии
  const [analysisTab, setAnalysisTab] = useState<AnalysisTabId>('natal');
  const [progressionsData, setProgressionsData] = useState<ProgressionsData | null>(null);
  const [progressionsAnalysis, setProgressionsAnalysis] = useState<string | null>(null);
  const [progressionsLoading, setProgressionsLoading] = useState(false);
  const [progressionsError, setProgressionsError] = useState<string>('');
  // Транзиты: выбранный день (по умолчанию сегодня), выбранное место, данные, анализ
  const [transitsDate, setTransitsDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [transitsLocation, setTransitsLocation] = useState<Location | null>(null);
  const [transitsDisplayLocation, setTransitsDisplayLocation] = useState<string | null>(null);
  const [transitsData, setTransitsData] = useState<TransitsData | null>(null);
  const [transitsAnalysis, setTransitsAnalysis] = useState<string | null>(null);
  const [transitsLoading, setTransitsLoading] = useState(false);
  const [transitsError, setTransitsError] = useState<string>('');
  // transitsReady: AI-анализ транзитов получен (либо из кэша, либо явным запросом) и должен отображаться
  const [transitsReady, setTransitsReady] = useState(false);
  // Остаток дневного лимита AI-анализов транзитов (для проактивного отображения в панели)
  const [transitsRemaining, setTransitsRemaining] = useState<number>(MAX_TRANSITS_ANALYSIS_PER_DAY);

  // Держим ref в актуальном состоянии для фоновых ответов чата
  useEffect(() => {
    savedChartIdRef.current = savedChartId;
  }, [savedChartId]);

  const loadChatForChart = async (chartId: number | string) => {
    try {
      const dbMessages = await chartsApi.getChatMessages(Number(chartId));
      // Защита от гонки: пока грузили, юзер мог уйти на другую карту
      if (Number(savedChartIdRef.current) !== Number(chartId)) return;
      // Ставим историю ВСЕГДА (включая пустую) — иначе чат предыдущей карты утечёт в новую
      setChatHistory(dbMessages as ChatMessage[]);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(`/${currentLang}/login`);
    }
  }, [loading, isAuthenticated, navigate, currentLang]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (chartIdFromUrl) return;

    const savedData = localStorage.getItem('chartDataForAnalysis');
    if (savedData && !chartDataForAnalysis) {
      try {
        const parsed = JSON.parse(savedData);
        setChartDataForAnalysis(parsed);
      } catch {
      }
    }

    if (!chartIdFromUrl) {
      const savedSimple = localStorage.getItem('savedFullAnalysis_simple');
      const savedAdvanced = localStorage.getItem('savedFullAnalysis_advanced');
      if (savedSimple) setSimpleAnalysis(savedSimple);
      if (savedAdvanced) setAdvancedAnalysis(savedAdvanced);
    }
  }, [chartIdFromUrl]);

  useEffect(() => {
    // Check for pending analysis job (survives navigation during processing)
    if (chartIdFromUrl) return;

    const pendingJob = localStorage.getItem('pendingAnalysisJob');
    const pendingResult = localStorage.getItem('pendingAnalysisResult');

    // Only process if we have a pending job AND no chart loaded yet
    if (pendingJob && !chartDataForAnalysis) {
      try {
        const parsed = JSON.parse(pendingJob);
        if (parsed.chartDataForAnalysis) {
          setChartDataForAnalysis(parsed.chartDataForAnalysis);
          if (parsed.analysisMode) {
            setAnalysisMode(parsed.analysisMode);
            localStorage.setItem('dashboardAnalysisMode', parsed.analysisMode);
          }
          // Clear savedChartId since this is a pending (not yet saved) analysis
          localStorage.removeItem('savedChartId');
          setSavedChartId(null);
          savedChartIdRef.current = null;
          setShowFullAnalysis(true);
        }
      } catch {
      }
    }

    // Restore pending analysis result if we have chart data but no analysis yet
    if (pendingResult && chartDataForAnalysis && !fullAnalysis && !savedChartId) {
      const pendingMode = localStorage.getItem('dashboardAnalysisMode');
      setFullAnalysis(pendingResult);
      if (pendingMode === 'simple') setSimpleAnalysis(pendingResult);
      if (pendingMode === 'advanced') setAdvancedAnalysis(pendingResult);
    }
  }, [chartIdFromUrl, chartDataForAnalysis, fullAnalysis, savedChartId]);

  useEffect(() => {
    if (!chartIdFromUrl) return;

    const loadChartFromUrl = async () => {
      if (isLoadingRef.current) return;
      setChartLoading(true);
      try {
        const chartId = parseInt(chartIdFromUrl, 10);
        if (isNaN(chartId)) return;
        const chart = await chartsApi.getChart(chartId);
        setChartDataForAnalysis(chart.chart_data ?? null);
        setChatVisible(false);
        resetProgressions();
        setSavedChartId(chart.id);
        savedChartIdRef.current = chart.id;

        // Load chat history from database (с предварительной очисткой — без утечки между картами)
        setChatHistory([]);
        loadChatForChart(chart.id).catch(err => {
          console.error('Failed to load chat history:', err);
        });
        setChatInput('');

        const isSynastry = chart.chart_data?.type === 'synastry';

        //ИЗМЕНЕНИЯ ЗДЕСЬ ЕСЛИ НАДО БУДЕТ ОТКАТИТЬ

        // const interp = chart.chart_interpretations?.find(
        //   (i: { type?: string; interpretation?: string }) => i.type === (isSynastry ? `synastry_${analysisMode}` : `full_${analysisMode}`)
        // );

        const interp = chart.chart_interpretations?.find(
          (i: { type?: string; interpretation?: string }) => i.type === (isSynastry ? `synastry_${analysisMode}` : `full_${analysisMode}`)
        ) || chart.chart_interpretations?.find(
          (i: { type?: string; interpretation?: string }) => i.type === (isSynastry ? 'synastry_advanced' : 'full_advanced')
        ) || chart.chart_interpretations?.find(
          (i: { type?: string; interpretation?: string }) => i.type === (isSynastry ? 'synastry_simple' : 'full_simple')
        );
        // ЗДЕСЬ ЗАКНЧИЛОА!
        if (interp?.interpretation) {
          setFullAnalysis(interp.interpretation);
          if (analysisMode === 'simple') setSimpleAnalysis(interp.interpretation);
          else setAdvancedAnalysis(interp.interpretation);
          setShowFullAnalysis(true);
        }

        const interpSimple = chart.chart_interpretations?.find((i: { type?: string }) => i.type === (isSynastry ? 'synastry_simple' : 'full_simple'));
        const interpAdvanced = chart.chart_interpretations?.find((i: { type?: string }) => i.type === (isSynastry ? 'synastry_advanced' : 'full_advanced'));
        if (interpSimple?.interpretation) setSimpleAnalysis(interpSimple.interpretation);
        if (interpAdvanced?.interpretation) setAdvancedAnalysis(interpAdvanced.interpretation);

        localStorage.setItem('chartDataForAnalysis', JSON.stringify(chart.chart_data ?? {}));
        localStorage.setItem('savedChartId', String(chart.id));
        setSavedChartId(chart.id);
        savedChartIdRef.current = chart.id;

        if (!isSynastry) {
          const planetAnalyses = await chartsApi.getPlanetAnalyses(Number(chart.id));
          planetAnalyses.forEach((pa: PlanetAnalysisResponse) => {
            if (pa.name) {
              localStorage.setItem(`planetAnalysis_${chart.id}_${pa.name}`, pa.interpretation ?? '');
            }
          });
          // Восстанавливаем транзиты из кэша если есть
          restoreTransitsFromCache(chart.id);
        }
      } catch (error) {
        console.error('Failed to load chart from URL:', error);
      } finally {
        setChartLoading(false);
      }
    };

    loadChartFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartIdFromUrl]);

  const loadFullAnalysis = useCallback(async (mode = analysisMode) => {
    if (!chartDataForAnalysis) return;
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    // setFullAnalysis(null);
    setAnalysisLoading(true);
    setAnalysisError('');

    if (mode === 'simple' && simpleAnalysis) {
      setFullAnalysis(simpleAnalysis);
      return;
    }
    if (mode === 'advanced' && advancedAnalysis) {
      setFullAnalysis(advancedAnalysis);
      return;
    }

    try {
      const { analysis } = await getFullAnalysis(chartDataForAnalysis, mode, i18n.language);
      console.log('analysis received:', analysis?.substring(0, 50));
      setFullAnalysis(analysis);
      console.log('setFullAnalysis called');
      if (mode === 'simple') setSimpleAnalysis(analysis);
      else setAdvancedAnalysis(analysis);
      // localStorage.removeItem('pendingAnalysisJob');
      // localStorage.removeItem('pendingAnalysisResult');

      const currentChartId = parseInt(localStorage.getItem('savedChartId') || '0', 10) || null;
      if (currentChartId) {
        localStorage.setItem(`savedFullAnalysis_${currentChartId}_${mode}`, analysis);
        const isSynastry = chartDataForAnalysis.type === 'synastry';
        const type = isSynastry ? `synastry_${mode}` : `full_${mode}`;
        chartsApi.saveInterpretation(currentChartId, type, analysis).catch(() => {});
      }
    } catch (err) {
      const errorDetail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      if (typeof errorDetail === 'string') {
        setAnalysisError(errorDetail);
      } else if (Array.isArray(errorDetail)) {
        setAnalysisError(errorDetail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(', '));
      } else {
        setAnalysisError(t('dashboard.errors.analysisError'));
      }
    } finally {
      setAnalysisLoading(false);
      isLoadingRef.current = false;
    }
  }, [chartDataForAnalysis, t, analysisMode, simpleAnalysis, advancedAnalysis]);

  useEffect(() => {
    isLoadingRef.current = false;
  }, [chartIdFromUrl]);

  // Сброс состояния прогрессий (при смене карты / выходе)
  const resetProgressions = useCallback(() => {
    setShowProgressions(false);
    setAnalysisTab('natal');
    setProgressionsData(null);
    setProgressionsAnalysis(null);
    setProgressionsError('');
    // Транзиты сбрасываем вместе с прогрессиями (тот же жизненный цикл карты)
    setTransitsDate(new Date().toISOString().slice(0, 10));
    setTransitsLocation(null);
    setTransitsData(null);
    setTransitsAnalysis(null);
    setTransitsError('');
    setTransitsReady(false);
  }, []);

  // Остаток дневного лимита AI-анализов транзитов из localStorage (кэш-хиты его не тратят)
  const refreshTransitsRemaining = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    const usedToday = parseInt(localStorage.getItem(`transits_limit|${today}`) || '0', 10);
    setTransitsRemaining(Math.max(0, MAX_TRANSITS_ANALYSIS_PER_DAY - usedToday));
  }, []);

  useEffect(() => {
    refreshTransitsRemaining();
  }, [refreshTransitsRemaining]);

  // Восстанавливаем транзиты из localStorage-кэша при возврате на карту.
  // ВАЖНО: вызывается внутри loadChartFromUrl, когда chartDataForAnalysis/savedChartId
  // ещё не зафлашены React'ом — поэтому здесь НЕ считаем позиции (loadTransitsData),
  // только восстанавливаем уже готовый текст анализа. Позиции досчитаются отложенно,
  // когда пользователь откроет вкладку «Транзиты» (см. AnalysisTabs.onChange).
  const restoreTransitsFromCache = (chartId: string | number) => {
    const lastKey = localStorage.getItem(`transits_last_key|${chartId}`);
    if (!lastKey) return;
    const cached = localStorage.getItem(lastKey);
    if (cached) {
      setTransitsAnalysis(cached);
      const locationName = localStorage.getItem(`transits_location_name|${chartId}`);
      setTransitsDisplayLocation(locationName);
      setTransitsReady(true);
    }
  };

  // Загрузка прогрессий: расчёт позиций (дёшево, всегда свежий) +
  // AI-анализ (кэшируется в Supabase по chart_id + режим + период YYYY-MM)
  const loadProgressions = useCallback(async (mode = analysisMode) => {
    // Гейтинг — как у чата: только для сохранённых карт с готовым анализом
    if (!chartDataForAnalysis || !savedChartId) return;
    if (chartDataForAnalysis.type === 'synastry') return;

    const meta = chartDataForAnalysis.meta;
    if (!meta?.birth_date) {
      setProgressionsError(t('dashboard.progressions.noBirthData'));
      return;
    }

    setProgressionsLoading(true);
    setProgressionsError('');

    try {
      const period = new Date().toISOString().slice(0, 7); // YYYY-MM

      // 1. Расчёт прогрессивных позиций (Swiss Ephemeris, без LLM)
      const data = await astrologyAPI.calculateProgressions({
        birth_date: meta.birth_date,
        birth_place: meta.birth_place,
        latitude: meta.latitude,
        longitude: meta.longitude,
        timezone: meta.timezone,
        house_system: (chartDataForAnalysis.houses_meta as { house_system?: string } | undefined)?.house_system || 'Placidus'
      });
      console.log('🔮 Progressions data from backend (before analysis):', JSON.stringify(data, null, 2));
      console.log('🔮 Natal chart data for progressions:', JSON.stringify(chartDataForAnalysis?.planets, null, 2));
      setProgressionsData(data);

      // 2. AI-анализ: сначала из БД (по периоду и режиму)
      const cached = await chartsApi.getProgressionsAnalysis(Number(savedChartId), mode, period);
      if (cached) {
        setProgressionsAnalysis(cached);
        return;
      }

      // 3. Нет в кэше — запрашиваем LLM и сохраняем
      const result = await astrologyAPI.getProgressionsAnalysis({
        natal_chart: chartDataForAnalysis,
        progression_data: data,
        language: i18n.language || 'ru'
      }, mode);

      setProgressionsAnalysis(result.analysis);
      chartsApi.saveProgressionsAnalysis(Number(savedChartId), mode, period, result.analysis).catch(err => {
        console.error('Failed to save progressions analysis:', err);
      });
    } catch (err) {
      const errorDetail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      setProgressionsError(typeof errorDetail === 'string' ? errorDetail : t('dashboard.progressions.error'));
    } finally {
      setProgressionsLoading(false);
    }
  }, [chartDataForAnalysis, savedChartId, analysisMode, t]);

  // Транзиты: расчёт позиций (Swiss Ephemeris, без LLM, всегда свежий) —
  // считается автоматически (вкладка/дата/локация). AI-анализ — отдельно,
  // дорогой, лимит MAX_TRANSITS_ANALYSIS_PER_DAY/день, запускается ТОЛЬКО
  // по явному действию пользователя (кнопка «Дать анализ», см. runTransitsAnalysis).
  // БД не используется — транзиты слишком динамичны (меняются от дня и локации).
  // isTransitsLoadingRef блокирует двойные запросы (общий для обеих функций).
  const loadTransitsData = useCallback(async (date?: string, opts?: { keepAnalysis?: boolean }) => {
    if (!chartDataForAnalysis || !savedChartId) return;
    if (chartDataForAnalysis.type === 'synastry') return;
    if (isTransitsLoadingRef.current) return; // блокируем двойной вызов

    const meta = chartDataForAnalysis.meta;
    if (!meta?.birth_date) {
      setTransitsError(t('dashboard.progressions.noBirthData'));
      return;
    }

    const day = date || transitsDate || new Date().toISOString().slice(0, 10);

    setTransitsLoading(true);
    setTransitsError('');
    isTransitsLoadingRef.current = true;

    try {
      const data = await astrologyAPI.calculateTransits({
        birth_date: meta.birth_date,
        birth_place: meta.birth_place,
        latitude: meta.latitude,
        longitude: meta.longitude,
        timezone: meta.timezone,
        target_date: `${day}T12:00:00Z`,
        house_system: (chartDataForAnalysis.houses_meta as { house_system?: string } | undefined)?.house_system || 'Placidus',
        natal_chart: chartDataForAnalysis,
        transit_latitude: transitsLocation?.lat,
        transit_longitude: transitsLocation?.lon,
        transit_place: transitsLocation?.display_name,
      });
      setTransitsData(data);

      // Новые позиции делают старый AI-анализ неактуальным — сбрасываем,
      // кроме случая восстановления уже готового анализа (возврат на карту/вкладку).
      if (!opts?.keepAnalysis) {
        setTransitsAnalysis(null);
        setTransitsReady(false);
      }
    } catch (err) {
      const errorDetail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      setTransitsError(typeof errorDetail === 'string' ? errorDetail : t('dashboard.transits.error'));
    } finally {
      setTransitsLoading(false);
      isTransitsLoadingRef.current = false;
    }
  }, [chartDataForAnalysis, savedChartId, transitsDate, transitsLocation, t]);

  // AI-анализ транзитов: запускается только по кнопке «Дать анализ».
  // Если позиции для текущего дня/локации ещё не посчитаны — считает их первым шагом.
  const runTransitsAnalysis = useCallback(async (date?: string, mode = analysisMode) => {
    if (!chartDataForAnalysis || !savedChartId) return;
    if (chartDataForAnalysis.type === 'synastry') return;
    if (isTransitsLoadingRef.current) return; // блокируем двойной вызов

    const meta = chartDataForAnalysis.meta;
    if (!meta?.birth_date) {
      setTransitsError(t('dashboard.progressions.noBirthData'));
      return;
    }

    const day = date || transitsDate || new Date().toISOString().slice(0, 10);
    const locKey = transitsLocation ? `${transitsLocation.lat},${transitsLocation.lon}` : 'natal';
    const cacheKey = `transits_analysis|${savedChartId}|${day}|${mode}|${i18n.language}|${locKey}`;

    setTransitsLoading(true);
    setTransitsError('');
    isTransitsLoadingRef.current = true;

    try {
      // 1. Позиции нужны для запроса к LLM — считаем, если ещё не посчитаны
      let data = transitsData;
      if (!data) {
        data = await astrologyAPI.calculateTransits({
          birth_date: meta.birth_date,
          birth_place: meta.birth_place,
          latitude: meta.latitude,
          longitude: meta.longitude,
          timezone: meta.timezone,
          target_date: `${day}T12:00:00Z`,
          house_system: (chartDataForAnalysis.houses_meta as { house_system?: string } | undefined)?.house_system || 'Placidus',
          natal_chart: chartDataForAnalysis,
          transit_latitude: transitsLocation?.lat,
          transit_longitude: transitsLocation?.lon,
          transit_place: transitsLocation?.display_name,
        });
        setTransitsData(data);
      }

      // 2. localStorage-кэш (в пределах сессии браузера) — не тратит дневной лимит
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setTransitsAnalysis(cached);
        setTransitsReady(true);
        return;
      }

      // 3. Лимит: не более MAX_TRANSITS_ANALYSIS_PER_DAY AI-запросов в день
      const today = new Date().toISOString().slice(0, 10);
      const limitKey = `transits_limit|${today}`;
      const usedToday = parseInt(localStorage.getItem(limitKey) || '0', 10);
      if (usedToday >= MAX_TRANSITS_ANALYSIS_PER_DAY) {
        setTransitsError(t('dashboard.transits.limitReached', { limit: MAX_TRANSITS_ANALYSIS_PER_DAY }));
        return;
      }

      // 4. Запрос к LLM
      const result = await astrologyAPI.getTransitsAnalysis({
        natal_chart: chartDataForAnalysis,
        transit_data: data,
        language: i18n.language || 'ru',
        ...(transitsLocation && {
          transit_latitude: transitsLocation.lat,
          transit_longitude: transitsLocation.lon,
          transit_place: transitsLocation.display_name,
        }),
      }, mode);

      setTransitsAnalysis(result.analysis);
      setTransitsReady(true);

      // 5. Сохраняем в localStorage + обновляем счётчик
      localStorage.setItem(cacheKey, result.analysis);
      localStorage.setItem(`transits_last_key|${savedChartId}`, cacheKey);
      const locationName = transitsLocation?.display_name || meta.birth_place || null;
      if (locationName) localStorage.setItem(`transits_location_name|${savedChartId}`, locationName);
      setTransitsDisplayLocation(locationName);
      localStorage.setItem(limitKey, String(usedToday + 1));
      refreshTransitsRemaining();

    } catch (err) {
      const errorDetail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      setTransitsError(typeof errorDetail === 'string' ? errorDetail : t('dashboard.transits.error'));
    } finally {
      setTransitsLoading(false);
      isTransitsLoadingRef.current = false;
    }
  }, [chartDataForAnalysis, savedChartId, analysisMode, transitsDate, transitsLocation, transitsData, t, refreshTransitsRemaining]);

  // Смена дня в пикере: пересчёт позиций для нового дня. AI НЕ запускаем —
  // старый анализ был для другого дня и сбрасывается внутри loadTransitsData.
  const handleTransitsDateChange = useCallback((date: string) => {
    setTransitsDate(date);
    loadTransitsData(date);
  }, [loadTransitsData]);

  // При смене режима (simple/advanced) — перезагружаем анализ прогрессий для нового режима
  useEffect(() => {
    if (!showProgressions) return;
    setProgressionsAnalysis(null);
    loadProgressions(analysisMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisMode]);

  // При смене режима (simple/advanced) — старый анализ транзитов был для другого режима.
  // Позиции от режима не зависят, поэтому НЕ пересчитываем; AI НЕ запускаем — ждём кнопку.
  useEffect(() => {
    if (analysisTab !== 'transits') return;
    setTransitsAnalysis(null);
    setTransitsReady(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisMode]);

  // При смене места транзита — пересчитываем позиции (AI НЕ запускаем)
  useEffect(() => {
    if (analysisTab !== 'transits') return;
    if (!transitsLocation) return; // Только при выбранном альтернативном месте
    loadTransitsData(transitsDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitsLocation]);

  const sendChatMessage = useCallback(async () => {
    if (chatLoading) return;
    if (!chatInput.trim() || !chartDataForAnalysis || !fullAnalysis || !savedChartId || !user) return;

    // Фиксируем карту и юзера НА МОМЕНТ ОТПРАВКИ — ответ может прийти, когда юзер уже на другой карте
    const chartIdAtSend = Number(savedChartId);
    const userId = user.id;

    const questionText = chatInput.trim();
    const currentHistory = [...chatHistory];
    const userMessage = { role: 'user' as const, content: questionText };
    setChatHistory(prev => [...prev, userMessage]);
    // В БД пишем ТОЛЬКО новое сообщение (не всю историю) — без дублей
    chartsApi.appendChatMessages(chartIdAtSend, userId, [userMessage]).catch(err => {
      console.error('Failed to save chat message:', err);
    });
    setChatInput('');

    setPendingChatCharts(prev => new Set(prev).add(chartIdAtSend));
    try {
      const response = await astrologyAPI.chatAnalysis({
        question: questionText,
        chart_data: chartDataForAnalysis,
        summary: fullAnalysis,
        chat_history: currentHistory,
        language: i18n.language || 'ru'
      });

      const botMessage = {
        role: 'assistant' as const,
        content: (response as { data?: { answer?: string; relevant_chunks?: unknown[] } })?.data?.answer || t('dashboard.chat.noAnswer'),
        relevant_chunks: (response as { data?: { relevant_chunks?: unknown[] } })?.data?.relevant_chunks || []
      };
      // Ответ ВСЕГДА сохраняем в БД для той карты, где был задан вопрос
      chartsApi.appendChatMessages(chartIdAtSend, userId, [botMessage]).catch(err => {
        console.error('Failed to save chat message:', err);
      });
      // UI обновляем только если юзер сейчас на той же карте; иначе ответ подтянется из БД при возврате
      if (Number(savedChartIdRef.current) === chartIdAtSend) {
        setChatHistory(prev => [...prev, botMessage]);
      }
    } catch (error) {
      // Ошибку показываем только на той же карте и в БД не пишем
      if (Number(savedChartIdRef.current) === chartIdAtSend) {
        setChatHistory(prev => [...prev, {
          role: 'assistant' as const,
          content: t('dashboard.chat.errorWithDetails', { error: (error as Error).message })
        }]);
      }
    } finally {
      setPendingChatCharts(prev => {
        const next = new Set(prev);
        next.delete(chartIdAtSend);
        return next;
      });
    }
  }, [chatInput, chatLoading, chartDataForAnalysis, fullAnalysis, savedChartId, chatHistory, user, t]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  useEffect(() => {
    if (showFullAnalysis && chartDataForAnalysis && !fullAnalysis && !analysisLoading) {
      const modeToLoad = pendingModeRef.current || analysisMode;
      pendingModeRef.current = null;
      if (modeToLoad === 'simple' && simpleAnalysis) { setFullAnalysis(simpleAnalysis); return; }
      if (modeToLoad === 'advanced' && advancedAnalysis) { setFullAnalysis(advancedAnalysis); return; }
      loadFullAnalysis(modeToLoad);
    }
  }, [showFullAnalysis, chartDataForAnalysis, fullAnalysis, analysisLoading, loadFullAnalysis, analysisMode, simpleAnalysis, advancedAnalysis]);

  // Save pending analysis result for navigation persistence (only when no saved chart yet)
  useEffect(() => {
    if (fullAnalysis && !savedChartId) {
      localStorage.setItem('pendingAnalysisResult', fullAnalysis);
    }
  }, [fullAnalysis, savedChartId]);

  // ВРЕМЕННО ОТКЛЮЧЕНО: типы отношений. Код готов и рабочий, пока не запрашиваем с бэкенда.
  // useEffect(() => {
  //   setRelationshipTypes(null);
  // }, [savedChartId]);

  // useEffect(() => {
  //   if (chartDataForAnalysis?.type === 'synastry' && fullAnalysis && savedChartId && !relationshipTypes) {
  //     const storageKey = `relationshipTypes_${savedChartId}`;
  //     const cached = localStorage.getItem(storageKey);
  //     if (cached) {
  //       try {
  //         setRelationshipTypes(JSON.parse(cached));
  //         return;
  //       } catch { }
  //     }
  //     const loadRelationshipTypes = async () => {
  //       setRelationshipTypesLoading(true);
  //       try {
  //         const result = await astrologyAPI.getRelationshipTypes(fullAnalysis, i18n.language);
  //         console.log('Relationship Types Response:', result);
  //         setRelationshipTypes(result);
  //         localStorage.setItem(storageKey, JSON.stringify(result));
  //       } catch (err) {
  //         console.error('Failed to load relationship types:', err);
  //       } finally {
  //         setRelationshipTypesLoading(false);
  //       }
  //     };
  //     loadRelationshipTypes();
  //   }
  //
  // }, [chartDataForAnalysis, fullAnalysis, relationshipTypes, savedChartId]);

  const loadHistoryCharts = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const data = await chartsApi.getCharts(user.id);
      setHistoryCharts(data);
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  const handleSaveChartWithAnalysis = async () => {
    if (!user || !chartDataForAnalysis || !fullAnalysis) return;

    const isSynastry = chartDataForAnalysis.type === 'synastry';

    let chartName: string;
    if (isSynastry) {
      const p1 = chartDataForAnalysis.person1_name || '';
      const p2 = chartDataForAnalysis.person2_name || '';
      chartName = `${p1} & ${p2}`.trim();
      if (!chartName) chartName = 'Синастрия';
      if (chartName.length > 15) chartName = chartName.substring(0, 15);
    } else {
      chartName = chartDataForAnalysis.name || t('dashboard.chart.defaultName');
    }

    const planetAnalyses = isSynastry ? [] : (() => {
      const analyses: Array<{ planetName: string; analysis: string }> = [];
      if (chartDataForAnalysis.planets) {
        Object.keys(chartDataForAnalysis.planets).forEach(planetName => {
          const analysis = localStorage.getItem(`planetAnalysis_${planetName}`);
          if (analysis) {
            analyses.push({ planetName, analysis });
          }
        });
      }
      return analyses;
    })();

    setSaving(true);
    try {
      const hasLimit = await chartsApi.hasReachedLimit(user.id);
      if (hasLimit) {
        setShowDeleteModal(true);
        setSaving(false);
        return;
      }

      const existingChart = await chartsApi.checkChartByName(user.id, chartName);
      if (existingChart) {
        setPendingSaveName(chartName);
        setShowDuplicateModal(true);
        setSaving(false);
        return;
      }

      const saved = isSynastry
        ? await chartsApi.saveSynastryWithInterpretation(user.id, chartDataForAnalysis, fullAnalysis, simpleAnalysis ?? undefined, advancedAnalysis ?? undefined)
        : await chartsApi.saveChartWithInterpretation(user.id, chartDataForAnalysis, fullAnalysis, planetAnalyses, simpleAnalysis ?? undefined, advancedAnalysis ?? undefined);

      setSavedChartId(saved.id);
      savedChartIdRef.current = saved.id;
      localStorage.setItem('savedChartId', String(saved.id));

      // Save chat history to database
      if (chatHistory.length > 0) {
        try {
          await chartsApi.saveChatMessages(Number(saved.id), user.id, chatHistory);
        } catch (err) {
          console.error('Failed to save chat history:', err);
        }
      }

      // Clear pending analysis items since we've saved the chart
      localStorage.removeItem('pendingAnalysisJob');
      localStorage.removeItem('pendingAnalysisResult');

      // ВРЕМЕННО ОТКЛЮЧЕНО: типы отношений. Код готов, пока не сохраняем в БД.
      // if (isSynastry && relationshipTypes) {
      //   try {
      //     await chartsApi.saveRelationshipTypes(saved.id, relationshipTypes);
      //   } catch (err) {
      //     console.error('Failed to save relationship types to DB:', err);
      //   }
      // }

      await loadHistoryCharts();
    } catch {
      setSaving(false);
    }
  };

  const handleDuplicateConfirm = async () => {
    if (!user || !chartDataForAnalysis || !fullAnalysis || !pendingSaveName) return;

    const isSynastry = chartDataForAnalysis.type === 'synastry';

    const planetAnalyses = isSynastry ? [] : (() => {
      const analyses: Array<{ planetName: string; analysis: string }> = [];
      if (chartDataForAnalysis.planets) {
        Object.keys(chartDataForAnalysis.planets).forEach(planetName => {
          const analysis = localStorage.getItem(`planetAnalysis_${planetName}`);
          if (analysis) {
            analyses.push({ planetName, analysis });
          }
        });
      }
      return analyses;
    })();

    setShowDuplicateModal(false);
    setSaving(true);
    try {
      const existingCharts = await chartsApi.getCharts(user.id);
      const uniqueName = chartsApi.getUniqueChartName(pendingSaveName, existingCharts);

      const chartDataWithNewName = {
        ...chartDataForAnalysis,
        name: uniqueName
      };

      const saved = isSynastry
        ? await chartsApi.saveSynastryWithInterpretation(user.id, chartDataWithNewName, fullAnalysis, simpleAnalysis ?? undefined, advancedAnalysis ?? undefined)
        : await chartsApi.saveChartWithInterpretation(user.id, chartDataWithNewName, fullAnalysis, planetAnalyses, simpleAnalysis ?? undefined, advancedAnalysis ?? undefined);

      setSavedChartId(saved.id);
      savedChartIdRef.current = saved.id;
      localStorage.setItem('savedChartId', saved.id.toString());

      // Save chat history to database
      if (chatHistory.length > 0) {
        try {
          await chartsApi.saveChatMessages(Number(saved.id), user.id, chatHistory);
        } catch (err) {
          console.error('Failed to save chat history:', err);
        }
      }

      // Clear pending analysis items since we've saved the chart
      localStorage.removeItem('pendingAnalysisJob');
      localStorage.removeItem('pendingAnalysisResult');

      await loadHistoryCharts();

      setPendingSaveName(null);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleDeleted = () => {
    setShowDeleteModal(false);
    handleSaveChartWithAnalysis();
  };

  const handleNewChart = () => {
    if (hasUnsavedAnalysis) {
      setPendingNavigation(() => () => {
        localStorage.removeItem('savedChartData');
        localStorage.removeItem('chartDataForAnalysis');
        localStorage.removeItem('savedFullAnalysis');
        localStorage.removeItem('savedFullAnalysis_simple');
        localStorage.removeItem('savedFullAnalysis_advanced');
        localStorage.removeItem('savedChartId');
        localStorage.removeItem('pendingAnalysisJob');
        localStorage.removeItem('pendingAnalysisResult');
        setChatVisible(false);
        setChatHistory([]);
        setChatInput('');
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('planetAnalysis_') || key.startsWith('aspectAnalysis_')) {
            localStorage.removeItem(key);
          }
        });
        navigate(`/${currentLang}/`);
      });
      setShowUnsavedModal(true);
      return;
    }

    localStorage.removeItem('savedChartData');
    localStorage.removeItem('chartDataForAnalysis');
    localStorage.removeItem('savedFullAnalysis');
    localStorage.removeItem('savedFullAnalysis_simple');
    localStorage.removeItem('savedFullAnalysis_advanced');
    localStorage.removeItem('savedChartId');
    localStorage.removeItem('pendingAnalysisJob');
    localStorage.removeItem('pendingAnalysisResult');
    setChatVisible(false);
    setChatHistory([]);
    setChatInput('');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('planetAnalysis_') || key.startsWith('aspectAnalysis_')) {
        localStorage.removeItem(key);
      }
    });
    navigate(`/${currentLang}/`);
  };

  const handleSaveRename = async () => {
    if (!renameChartId || !renameChartName.trim()) return;

    if (renameChartName.trim().length > 15) {
      setRenameError(t('dashboard.rename.maxLength'));
      return;
    }

    setRenameError(null);

    setRenaming(true);
    try {
      const existingCharts = await chartsApi.getCharts(user!.id);
      const duplicateExists = existingCharts.some(
        chart => chart.id !== renameChartId && chart.name?.toLowerCase() === renameChartName.trim().toLowerCase()
      );

      if (duplicateExists) {
        setRenameError(t('dashboard.rename.exists'));
        setRenaming(false);
        return;
      }

      await chartsApi.updateChartName(Number(renameChartId), renameChartName.trim());
      setHistoryCharts((prevCharts) =>
        prevCharts.map((chart) =>
          chart.id !== renameChartId ? chart : { ...chart, name: renameChartName.trim() }
        )
      );
      if (savedChartId !== renameChartId) {
        setChartDataForAnalysis(prev => {
          if (!prev) return prev;
          const updated = { ...prev, name: renameChartName.trim() };
          localStorage.setItem('chartDataForAnalysis', JSON.stringify(updated));
          return updated;
        });
      }
      setChartsUpdated((prev) => !prev);
    } catch (error) {
      alert(t('dashboard.rename.error') + ': ' + ((error as Error).message || error));
    } finally {
      setRenaming(false);
      setRenameChartId(null);
      setRenameChartName('');
      setRenameError(null);
    }
  };

  const handleCancelRename = () => {
    setRenameChartId(null);
    setRenameChartName('');
  };

  const handlePlanetClick = async (planetData: ChartPlanet) => {
    const planetName = t('planets.names.' + planetData.name);
    setSelectedPlanet({ ...planetData, name: planetName });
    setPlanetAnalysis(null);
    setPlanetAnalysisError('');
    setPlanetAnalysisLoading(true);

    const chartId = typeof savedChartId === 'number' ? savedChartId : (savedChartId ? parseInt(String(savedChartId), 10) : null);

    const storageKey = chartId ? `planetAnalysis_${chartId}_${planetData.name}_${analysisMode}` : null;
    const savedAnalysis = storageKey ? localStorage.getItem(storageKey) : null;
    if (savedAnalysis) {
      setPlanetAnalysis(savedAnalysis);
      setPlanetAnalysisLoading(false);
      if (chartId) {
        chartsApi.savePlanetAnalysis(chartId, planetData.name ?? '', savedAnalysis)
          .catch(err => console.error('DB save error:', err));
      }
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

      if (storageKey) {
        localStorage.setItem(storageKey, result.analysis);
      }
      if (chartId) {
        chartsApi.savePlanetAnalysis(chartId, planetData.name ?? '', result.analysis)
          .catch(err => console.error('DB save error:', err));
      }

      setPlanetAnalysis(result.analysis);
    } catch (err) {
      const errorDetail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      if (typeof errorDetail === 'string') {
        setPlanetAnalysisError(errorDetail);
      } else if (Array.isArray(errorDetail)) {
        setPlanetAnalysisError(errorDetail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(', '));
      } else if (errorDetail && typeof errorDetail === 'object' && 'msg' in errorDetail) {
        setPlanetAnalysisError((errorDetail as { msg: string }).msg);
      } else {
        setPlanetAnalysisError('Failed to load planet analysis');
      }
    } finally {
      setPlanetAnalysisLoading(false);
    }
  };

  const handleClosePlanetAnalysis = () => {
    setSelectedPlanet(null);
    setPlanetAnalysis(null);
    setPlanetAnalysisError('');
  };

  const handleAspectClick = async (aspect: AspectData) => {
    setSelectedAspect(aspect);
    setAspectLoading(true);
    setAspectError('');

    const storageKey = `aspectAnalysis_${aspect.planet1}_${aspect.planet2}_${aspect.aspect}_${analysisMode}`;
    const savedAnalysis = localStorage.getItem(storageKey);
    if (savedAnalysis) {
      setAspectAnalysis(savedAnalysis);
      setAspectLoading(false);
      return;
    }

    setAspectAnalysis(null);

    try {
      const result = await astrologyAPI.getSynastryAspectAnalysis({
        planet1: aspect.planet1,
        planet2: aspect.planet2,
        aspect_name: aspect.aspect,
        aspect_name_ru: aspect.aspect_ru || aspect.aspect,
        orb: aspect.orb,
        language: i18n.language
      }, analysisMode);

      localStorage.setItem(storageKey, result.analysis);
      setAspectAnalysis(result.analysis);
    } catch (err) {
      const errorDetail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      if (typeof errorDetail === 'string') {
        setAspectError(errorDetail);
      } else if (Array.isArray(errorDetail)) {
        setAspectError(errorDetail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(', '));
      } else {
        setAspectError(t('analysis.error'));
      }
    } finally {
      setAspectLoading(false);
    }
  };

  useEffect(() => {
    if (chartsUpdated && user) {
      loadHistoryCharts();
    }
  }, [chartsUpdated, user, loadHistoryCharts]);

  const handleSelectChart = (chart: HistoryChart) => {
    if (hasUnsavedAnalysis) {
      setPendingNavigation(() => () => {
        setChartDataForAnalysis(chart.chart_data ?? null);
        setChatVisible(false);
        resetProgressions();
        setSavedChartId(chart.id);
        savedChartIdRef.current = chart.id;
        setChatInput('');
        // Чат: очистка + загрузка истории выбранной карты из БД
        setChatHistory([]);
        loadChatForChart(chart.id).catch(err => {
          console.error('Failed to load chat history:', err);
        });
        setShowPlanetTable(false);
        setSimpleAnalysis(null);
        setAdvancedAnalysis(null);

        const isSynastry = chart.chart_data?.type === 'synastry';

        const interp = chart.chart_interpretations?.find(
          i => i.type === (isSynastry ? `synastry_${analysisMode}` : `full_${analysisMode}`)
        );

        if (interp?.interpretation) {
          setFullAnalysis(interp.interpretation);
          if (analysisMode === 'simple') setSimpleAnalysis(interp.interpretation);
          else setAdvancedAnalysis(interp.interpretation);
          setShowFullAnalysis(true);
        }

        const interpSimple = chart.chart_interpretations?.find(i => i.type === (isSynastry ? 'synastry_simple' : 'full_simple'));
        const interpAdvanced = chart.chart_interpretations?.find(i => i.type === (isSynastry ? 'synastry_advanced' : 'full_advanced'));
        if (interpSimple?.interpretation) setSimpleAnalysis(interpSimple.interpretation);
        if (interpAdvanced?.interpretation) setAdvancedAnalysis(interpAdvanced.interpretation);

        localStorage.setItem('chartDataForAnalysis', JSON.stringify(chart.chart_data ?? {}));
        localStorage.setItem('savedChartId', String(chart.id));

        if (!isSynastry) {
          chartsApi.getPlanetAnalyses(Number(chart.id)).then(planetAnalyses => {
            planetAnalyses.forEach((pa) => {
              if (pa.name) {
                localStorage.setItem(`planetAnalysis_${chart.id}_${pa.name}`, pa.interpretation);
              }
            });
          }).catch(err => {
            console.error('Failed to load planet analyses:', err);
          });
          restoreTransitsFromCache(chart.id);
        }

        navigate(`/${currentLang}/dashboard?chart=${chart.id}`);
      });
      setShowUnsavedModal(true);
      return;
    }

    setChartDataForAnalysis(chart.chart_data ?? null);
    setChatVisible(false);
    resetProgressions();
    setSavedChartId(chart.id);
    savedChartIdRef.current = chart.id;

    // Load chat history from database (с предварительной очисткой — без утечки между картами)
    setChatHistory([]);
    loadChatForChart(chart.id).catch(err => {
      console.error('Failed to load chat history:', err);
    });
    setChatInput('');
    setShowPlanetTable(false);
    setSimpleAnalysis(null);
    setAdvancedAnalysis(null);

    const isSynastry = chart.chart_data?.type === 'synastry';

    const interp = chart.chart_interpretations?.find(
      i => i.type === (isSynastry ? `synastry_${analysisMode}` : `full_${analysisMode}`)
    );

    if (interp?.interpretation) {
      setFullAnalysis(interp.interpretation);
      if (analysisMode === 'simple') setSimpleAnalysis(interp.interpretation);
      else setAdvancedAnalysis(interp.interpretation);
      setShowFullAnalysis(true);
    }

    const interpSimple = chart.chart_interpretations?.find(i => i.type === (isSynastry ? 'synastry_simple' : 'full_simple'));
    const interpAdvanced = chart.chart_interpretations?.find(i => i.type === (isSynastry ? 'synastry_advanced' : 'full_advanced'));
    if (interpSimple?.interpretation) setSimpleAnalysis(interpSimple.interpretation);
    if (interpAdvanced?.interpretation) setAdvancedAnalysis(interpAdvanced.interpretation);

    localStorage.setItem('chartDataForAnalysis', JSON.stringify(chart.chart_data ?? {}));
    localStorage.setItem('savedChartId', String(chart.id));

    if (!isSynastry) {
      chartsApi.getPlanetAnalyses(Number(chart.id)).then(planetAnalyses => {
        planetAnalyses.forEach((pa) => {
          if (pa.name) {
            localStorage.setItem(`planetAnalysis_${chart.id}_${pa.name}`, pa.interpretation);
          }
        });
      }).catch(err => {
        console.error('Failed to load planet analyses:', err);
      });
      restoreTransitsFromCache(chart.id);
    }

    navigate(`/${currentLang}/dashboard?chart=${chart.id}`);
  };

  const handleDeleteFromHistory = (chart: HistoryChart, e: React.MouseEvent) => {
    e.stopPropagation();
    setChartToDelete(chart);
    setConfirmDeleteModal(true);
  };

  const handleConfirmDeleteFromHistory = async () => {
    if (!chartToDelete) return;
    setDeletingChart(true);
    try {
      await chartsApi.deleteChart(Number(chartToDelete.id));
      // Clear chat if currently viewing the deleted chart
      if (savedChartId === chartToDelete.id) {
        setChatHistory([]);
      }
      setConfirmDeleteModal(false);
      setChartToDelete(null);
      loadHistoryCharts();
    } catch {
    } finally {
      setDeletingChart(false);
    }
  };

  const getSunSignEmoji = (sign: string) => {
    const fireSigns = ['Aries', 'Leo', 'Sagittarius'];
    const earthSigns = ['Taurus', 'Virgo', 'Capricorn'];
    const airSigns = ['Gemini', 'Libra', 'Aquarius'];
    const waterSigns = ['Cancer', 'Scorpio', 'Pisces'];
    if (fireSigns.includes(sign)) return '🔥';
    if (earthSigns.includes(sign)) return '🌍';
    if (airSigns.includes(sign)) return '💨';
    if (waterSigns.includes(sign)) return '💧';
    return '🌟';
  };

  const handleStartRename = (chart: HistoryChart) => {
    setRenameChartId(chart.id);
    setRenameChartName(chart.name || '');
    setRenameError(null);
  };

  const handleRenameChange = (value: string) => {
    setRenameChartName(value);
    if (value.length > 15) {
      setRenameError(t('dashboard.rename.maxLength'));
    } else {
      setRenameError(null);
    }
  };

  useEffect(() => {
    if (user) {
      loadHistoryCharts();
    }
  }, [user, loadHistoryCharts]);

  const hasUnsavedAnalysis = !!fullAnalysis && !savedChartId;

  const clearUnsavedAnalysis = useCallback(() => {
    localStorage.removeItem('chartDataForAnalysis');
    localStorage.removeItem('savedFullAnalysis_simple');
    localStorage.removeItem('savedFullAnalysis_advanced');
    localStorage.removeItem('pendingAnalysisJob');
    localStorage.removeItem('pendingAnalysisResult');
    localStorage.removeItem('dashboardAnalysisMode');
  }, []);

  const protectedNavigate = useCallback((to: string) => {
    if (hasUnsavedAnalysis) {
      setPendingNavigation(() => () => navigate(to));
      setShowUnsavedModal(true);
    } else {
      navigate(to);
    }
  }, [hasUnsavedAnalysis, navigate]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedAnalysis) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedAnalysis]);

  if (loading) {
    return (
      <div className="dashboard">
        <Header />
        <div className="container">
          <div className="loading">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  console.log('render: fullAnalysis=', !!fullAnalysis, 'showFullAnalysis=', showFullAnalysis, 'analysisLoading=', analysisLoading, 'chartData=', !!chartDataForAnalysis, 'savedChartId=', savedChartId);

  return (
    <div className="dashboard">
      <Header hasUnsavedAnalysis={hasUnsavedAnalysis} onProtectedNavigate={protectedNavigate} />

      <div style={{
        position: 'fixed',
        top: '65px',
        left: 0,
        width: '260px',
        minWidth: '260px',
        maxHeight: 'calc(100vh - 65px)',
        zIndex: 50,
      }}>
        <Sidebar
          historyCharts={historyCharts}
          historyLoading={historyLoading}
          onSelectChart={handleSelectChart}
          onNewChart={handleNewChart}
          savedChartId={savedChartId}
          renameChartId={renameChartId}
          renameChartName={renameChartName}
          renaming={renaming}
          renameError={renameError}
          onStartRename={handleStartRename}
          onSaveRename={handleSaveRename}
          onCancelRename={handleCancelRename}
          onRenameChange={handleRenameChange}
          onDeleteChart={handleDeleteFromHistory}
          getSunSignEmoji={getSunSignEmoji}
          hasUnsavedAnalysis={hasUnsavedAnalysis}
          onProtectedNavigation={protectedNavigate}
        />
      </div>

      <div className="container" style={{ paddingTop: '40px', marginLeft: '260px' }}>
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 600px' }}>
            <div className="dashboard-content">
              {chartLoading && chartIdFromUrl && (
                <div style={{ marginTop: '40px' }}>
                  <ProcessingMessage size="sm" />
                </div>
              )}
              {!chartIdFromUrl && !chartDataForAnalysis && !showFullAnalysis && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '60px 20px',
                  textAlign: 'center',
                  gap: '20px'
                }}>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '16px',
                    marginBottom: '10px'
                  }}>
                    {t('dashboard.emptyState.selectChart')}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => protectedNavigate(`/${currentLang}/`)}
                      style={{
                        background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                        color: 'white',
                        padding: '12px 20px',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'}
                      onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                    >
                      <span>✦</span>
                      {t('dashboard.actions.newChart')}
                    </button>
                    <button
                      type="button"
                      onClick={() => protectedNavigate(`/${currentLang}/synastry`)}
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
                        justifyContent: 'center',
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
                  </div>
                </div>
              )}
              {chartDataForAnalysis && isAuthenticated && !fullAnalysis && !savedChartId && !showFullAnalysis && (
                <div style={{ textAlign: 'center' }}>
                  <AnalysisModeToggle
                    value={analysisMode}
                    onChange={(val) => {
                      setAnalysisMode(val);
                      localStorage.setItem('dashboardAnalysisMode', val);
                      pendingModeRef.current = val;
                      setFullAnalysis(null);
                      setShowFullAnalysis(true);
                    }}
                  />
                  <button
                    type="button"
                    className="btn-full-analysis"
                    onClick={() => {
                      setShowFullAnalysis(true);
                      loadFullAnalysis();
                    }}
                    disabled={analysisLoading}
                    style={{
                      marginTop: '24px',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: analysisLoading ? '30px 28px' : '14px 28px',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: analysisLoading ? 'default' : 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      opacity: analysisLoading ? 0.8 : 1,
                      minWidth: '280px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {t('home.getFullAnalysis')}
                  </button>
                </div>
              )}

              {showFullAnalysis && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <h2 style={{ margin: 0 }}>
                      {chartDataForAnalysis?.type === 'synastry' ? (
                        <>
                          {chartDataForAnalysis.person1_name} / {chartDataForAnalysis.person2_name}: {' '}
                          {t('synastry.fullAnalysis.title')}
                        </>
                      ) : (
                        <>
                          {chartDataForAnalysis?.name && (
                            <span style={{ fontWeight: '500', marginRight: '10px' }}>
                              {chartDataForAnalysis.name}
                            </span>
                          )}
                          {t('dashboard.fullAnalysis.title')}
                        </>
                      )}
                    </h2>
                    <AnalysisModeToggle
                      value={analysisMode}
                      onChange={(val) => {
                        setAnalysisMode(val);
                        localStorage.setItem('dashboardAnalysisMode', val);
                        if (val === 'simple' && simpleAnalysis) {
                          setFullAnalysis(simpleAnalysis);
                        } else if (val === 'advanced' && advancedAnalysis) {
                          setFullAnalysis(advancedAnalysis);
                        } else {
                          pendingModeRef.current = val;
                          setFullAnalysis(null);
                        }
                      }}
                    />
                  </div>

                  {/* Колесо синастрии. Рисуется только при наличии домов: у карт,
                      сохранённых до появления houses в chart_data, куспидов нет —
                      без них зодиак не повернуть по ASC и домовую сетку не построить. */}
                  {chartDataForAnalysis?.type === 'synastry'
                    && chartDataForAnalysis.chart1?.planets
                    && chartDataForAnalysis.chart2?.planets
                    && chartDataForAnalysis.chart1?.houses && (
                    <div style={{ marginBottom: '30px' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }}></div>
                          <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                            {chartDataForAnalysis.person1_name || t('synastry.person1')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
                          <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                            {chartDataForAnalysis.person2_name || t('synastry.person2')}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <SynastryChartComponent
                          chart1={chartDataForAnalysis.chart1}
                          chart2={chartDataForAnalysis.chart2}
                          aspects={chartDataForAnalysis.aspects as unknown as Aspect[] | undefined}
                          size={560}
                          name1={chartDataForAnalysis.person1_name}
                          name2={chartDataForAnalysis.person2_name}
                        />
                      </div>
                    </div>
                  )}

                  {/* Колесо натальной карты. Данные (planets/houses/houses_meta) уже лежат
                      в chart_data, ничего досохранять не потребовалось. */}
                  {chartDataForAnalysis
                    && chartDataForAnalysis.type !== 'synastry'
                    && chartDataForAnalysis.planets
                    && chartDataForAnalysis.houses && (
                    <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center' }}>
                      <AstroChartComponent
                        chartData={{
                          planets: chartDataForAnalysis.planets,
                          houses: chartDataForAnalysis.houses,
                          // На главной в компонент уходит сырой ответ API, где vertex лежит
                          // в корне. В сохранённых данных он внутри houses_meta — пробрасываем,
                          // иначе точка Vx не отрисуется.
                          vertex: (chartDataForAnalysis.houses_meta as { vertex?: { longitude: number } } | undefined)?.vertex,
                          houses_meta: chartDataForAnalysis.houses_meta as { pars_fortuna?: { longitude: number } } | undefined,
                        }}
                        size={560}
                      />
                    </div>
                  )}

                  {/* ВРЕМЕННО ОТКЛЮЧЕНО: типы отношений. Код готов и рабочий, пока не показываем. */}
                  {/* {chartDataForAnalysis?.type === 'synastry' && fullAnalysis && relationshipTypes && !relationshipTypesLoading && (
                    <div style={{ marginTop: '30px', marginBottom: '20px' }}>
                      <RelationshipTypesBar
                        data={relationshipTypes?.relationship_types || {}}
                        dominantType={relationshipTypes?.dominant_type}
                      />
                    </div>
                  )} */}

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
                    {savedChartId && fullAnalysis && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowPlanetTable(false);
                          setAnalysisTab('natal');
                          setShowProgressions(false);
                          setTimeout(() => {
                            const el = document.getElementById('chat-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 100);
                        }}
                        style={{
                          flex: 1,
                          minWidth: '200px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          padding: '10px 16px',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {t('dashboard.chat.open')}
                      </button>
                    )}

                    <button
                      onClick={handleTogglePlanetTable}
                      style={{
                        flex: 1,
                        minWidth: '200px',
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        color: 'var(--text-secondary)',
                        padding: '10px 16px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <span>{showPlanetTable ? '📊' : '🪐'}</span>
                      {showPlanetTable ? t('dashboard.actions.fullAnalysis') : (chartDataForAnalysis?.type === 'synastry' ? t('dashboard.actions.aspectAnalysis') : t('dashboard.actions.planetAnalysis'))}
                    </button>
                  </div>

                  {/* Табы видов анализа: Натальная карта | Прогрессии (outlet-паттерн внутри страницы) */}
                  {!showPlanetTable && (
                    <AnalysisTabs
                      active={analysisTab}
                      showProgressions={!!(savedChartId && fullAnalysis && chartDataForAnalysis?.type !== 'synastry')}
                      showTransits={!!(savedChartId && fullAnalysis && chartDataForAnalysis?.type !== 'synastry')}
                      showDailyForecast={!!(savedChartId && fullAnalysis && chartDataForAnalysis?.type !== 'synastry')}
                      onChange={(tab) => {
                        setAnalysisTab(tab);
                        setShowProgressions(tab === 'progressions');
                        if (tab === 'progressions' && !progressionsData) {
                          loadProgressions();
                        }
                        // Транзиты: позиции считаем автоматически при открытии вкладки
                        // (дёшево, без LLM); AI-анализ — только по кнопке «Дать анализ».
                        // keepAnalysis сохраняет уже восстановленный из кэша анализ карты.
                        if (tab === 'transits' && !transitsData) {
                          loadTransitsData(transitsDate, { keepAnalysis: transitsReady });
                        }
                      }}
                    />
                  )}

                  {/* Outlet «Прогрессии»: натальный анализ при этом скрыт (см. условие ниже) */}
                  {analysisTab === 'progressions' && !showPlanetTable && savedChartId && (
                    <div id="progressions-section">
                      <ProgressionsPanel
                        data={progressionsData}
                        analysis={progressionsAnalysis}
                        loading={progressionsLoading}
                        error={progressionsError}
                      />
                    </div>
                  )}

                  {/* Outlet «Транзиты»: выбор дня, выбор места */}
                  {analysisTab === 'transits' && !showPlanetTable && savedChartId && (
                    <div id="transits-section">
                      <TransitsPanel
                        data={transitsData}
                        analysis={transitsAnalysis}
                        transitsReady={transitsReady}
                        loading={transitsLoading}
                        error={transitsError}
                        selectedDate={transitsDate}
                        onDateChange={handleTransitsDateChange}
                        onLocationChange={setTransitsLocation}
                        transitsLocation={transitsLocation}
                        birthPlace={chartDataForAnalysis?.meta?.birth_place}
                        analysisLocation={transitsDisplayLocation}
                        onRunAnalysis={() => runTransitsAnalysis()}
                        transitsRemaining={transitsRemaining}
                        transitsLimit={MAX_TRANSITS_ANALYSIS_PER_DAY}
                      />
                    </div>
                  )}

                  {/* Outlet «Прогноз дня»: оценка 1-10, категория, summary */}
                  {analysisTab === 'dailyForecast' && !showPlanetTable && savedChartId && (
                    <div id="daily-forecast-section">
                      <DailyForecastPanel natalChart={chartDataForAnalysis} />
                    </div>
                  )}

                  {/* Outlet «Натальная карта» — таб по умолчанию */}
                  {!showPlanetTable && analysisTab === 'natal' && (
                    <>
                      {analysisLoading && (
                        <div style={{ marginTop: '40px' }}>
                          <ProcessingMessage />
                        </div>
                      )}

                      {analysisError && (
                        <div className="error-message" style={{ marginTop: '20px' }}>
                          {analysisError}
                        </div>
                      )}

                      {fullAnalysis && (
                        <div style={{ marginTop: '40px', lineHeight: '2', fontSize: '16px' }}>
                          {!savedChartId && !analysisLoading && (
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                              <button className="btn btn-primary" onClick={handleSaveChartWithAnalysis} disabled={saving}>
                                {saving ? '...' : t('dashboard.actions.save')}
                              </button>
                            </div>
                          )}
                          <MarkdownContent content={fullAnalysis} />

                          <div id="chat-section">
                            {savedChartId && (
                              <>
                                {!chatVisible && (
                                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                    <button onClick={() => setChatVisible(true)} className="btn btn-primary" style={{ maxWidth: '300px' }} disabled={!fullAnalysis}>
                                      {chatHistory.length > 0 ? t('dashboard.chat.open') : t('dashboard.chat.start')}
                                    </button>
                                  </div>
                                )}

                                {chatVisible && (
                                  <div style={{ marginTop: '30px', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                                    <div style={{ marginBottom: '20px' }}>
                                      <h3 style={{ margin: '0 0 15px 0' }}>{t('dashboard.chat.title')}</h3>
                                      <div style={{ minHeight: '100px', height: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '15px', background: 'var(--bg-secondary)' }}>
                                        {chatHistory.length === 0 ? null : (
                                          chatHistory.map((message, index) => (
                                            <div key={index} style={{ marginBottom: '15px', padding: '10px', borderRadius: '8px', background: message.role === 'user' ? 'var(--bg-primary)' : 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                                              <strong style={{ color: message.role === 'user' ? '#4CAF50' : '#2196F3', marginRight: '10px' }}>
                                                {message.role === 'user' ? t('dashboard.chat.user') : t('dashboard.chat.assistant')}
                                              </strong>
                                              <div className="chat-message-content">
                                                <MarkdownContent content={message.content} />
                                              </div>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                    {isNearLimit(chatHistory) && (
                                      <div style={{ padding: '8px 12px', marginBottom: '10px', borderRadius: '8px', background: isAtLimit(chatHistory) ? 'rgba(244,67,54,0.1)' : 'rgba(255,152,0,0.1)', border: `1px solid ${isAtLimit(chatHistory) ? '#f44336' : '#ff9800'}`, color: isAtLimit(chatHistory) ? '#f44336' : '#ff9800', fontSize: '13px', textAlign: 'center' }}>
                                        {isAtLimit(chatHistory) ? t('dashboard.chat.limitReached', { limit: MAX_MESSAGES }) : t('dashboard.chat.messagesLeft', { count: MAX_MESSAGES - chatHistory.length })}
                                      </div>
                                    )}
                                    <textarea
                                      value={chatInput}
                                      onChange={(e) => setChatInput(e.target.value)}
                                      onKeyPress={handleKeyPress}
                                      onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) => { const textarea = e.target; textarea.style.height = 'auto'; textarea.style.height = textarea.scrollHeight + 'px'; }}
                                      placeholder={t('dashboard.chat.placeholder')}
                                      maxLength={200}
                                      disabled={chatLoading}
                                      style={{ width: '100%', minHeight: '40px', height: '40px', resize: 'none', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', marginBottom: '10px', overflowY: 'hidden', boxSizing: 'border-box' }}
                                    />
                                    <button onClick={sendChatMessage} disabled={!chatInput.trim() || chatLoading || isAtLimit(chatHistory)} className="btn btn-primary" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                                      {chatLoading ? t('dashboard.chat.sending') : t('dashboard.chat.send')}
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {showPlanetTable && chartDataForAnalysis && (
                    <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '30px', marginTop: '30px' }}>
                      <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>
                        {chartDataForAnalysis.type === 'synastry' ? t('planets.aspects.title') : t('planets.title')}
                      </h3>
                      <div style={{ marginBottom: '40px' }}>
                        {chartDataForAnalysis.type === 'synastry' ? (
                          <AspectGrid
                            aspects={chartDataForAnalysis.aspects as unknown as Aspect[] | undefined}
                            onAspectClick={handleAspectClick as (aspect: Aspect) => void}
                          />
                        ) : (
                          <PlanetTable
                            planets={chartDataForAnalysis.planets as unknown as Record<string, PlanetData>}
                            houses={chartDataForAnalysis.houses}
                            onPlanetClick={handlePlanetClick}
                          />
                        )}
                      </div>
                      {chartDataForAnalysis.type === 'synastry' ? (
                        <AspectAnalysisModal
                          aspect={selectedAspect}
                          analysis={aspectAnalysis}
                          isOpen={!!selectedAspect}
                          onClose={() => setSelectedAspect(null)}
                          loading={aspectLoading}
                          error={aspectError}
                        />
                      ) : (
                        <PlanetAnalysisModal
                          planet={selectedPlanet ?? undefined}
                          analysis={planetAnalysis}
                          isOpen={!!selectedPlanet}
                          onClose={handleClosePlanetAnalysis}
                          loading={planetAnalysisLoading}
                          error={planetAnalysisError}
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '32px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          ↑
        </button>
      )}

      <DeleteChartModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDeleted={handleDeleted}
      />

      <DuplicateChartModal
        isOpen={showDuplicateModal}
        chartName={pendingSaveName}
        onClose={() => setShowDuplicateModal(false)}
        onConfirm={handleDuplicateConfirm}
      />

      <ConfirmDeleteModal
        isOpen={confirmDeleteModal}
        onClose={() => setConfirmDeleteModal(false)}
        onConfirm={handleConfirmDeleteFromHistory}
        chartName={chartToDelete?.name}
        deleting={deletingChart}
      />

      <UnsavedAnalysisModal
        isOpen={showUnsavedModal}
        onSave={() => {
          setShowUnsavedModal(false);
          handleSaveChartWithAnalysis();
        }}
        onCancel={() => setShowUnsavedModal(false)}
        onLeave={() => {
          setShowUnsavedModal(false);
          clearUnsavedAnalysis();
          setFullAnalysis(null);
          setSimpleAnalysis(null);
          setAdvancedAnalysis(null);
          setChartDataForAnalysis(null);
          resetProgressions();
          localStorage.removeItem('savedChartId');
          setSavedChartId(null);
          savedChartIdRef.current = null;
          pendingNavigation?.();
          setPendingNavigation(null);
        }}
        saving={saving}
      />
    </div>
  );
};

export default Dashboard;