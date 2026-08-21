import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { astrologyAPI } from '../services/api';
import { chartsApi } from '../services/chartsApi';
import { getFullAnalysis } from '../services/analysisCache';
import {
  streamFullAnalysis, type FullAnalysisPayload,
  streamSynastryAnalysis, type SynastryAnalysisPayload,
  streamProgressionsAnalysis,
  streamProgressedSynastryAnalysis,
  streamTransitsAnalysis,
  streamPlanetAnalysis,
  streamSynastryAspectAnalysis,
  streamChatAnalysis,
} from '../services/streamApi';
import { useStreamedText, type StreamPhase } from '../hooks/useStreamedText';
import i18n from '../i18n';
import Header from '../components/Header';
import ProcessingMessage from '../components/ProcessingMessage';
import LiveSkyFrame from '../components/LiveSkyFrame';
import LiveSkyCarousel from '../components/LiveSkyCarousel';
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
import UnsavedAnalysisModal from '../components/UnsavedAnalysisModal';
import ProgressionsPanel from '../components/ProgressionsPanel';
import ProgressedSynastryPanel from '../components/ProgressedSynastryPanel';
import AnalysisTabs, { AnalysisTabId } from '../components/AnalysisTabs';
import TransitsPanel from '../components/TransitsPanel';
// v1.2: daily forecast temporarily hidden from the natal chart, do not delete
// import DailyForecastPanel from '../components/DailyForecastPanel';
import type { ProgressionsData, TransitsData, ProgressedSynastryData } from '../services/api';
import type { Location } from '../components/LocationInput';
import { isNearLimit, isAtLimit, MAX_MESSAGES, type ChatMessage } from '../services/chatStorage';
import { isInFlight, markInFlight, clearInFlight, waitForClear } from '../utils/inFlightRegistry';
import { appendStreamText, getStreamText, clearStreamText } from '../utils/streamTextRegistry';

const MAX_TRANSITS_ANALYSIS_PER_DAY = 5;
// Cap on how many completed transits analyses per chart we keep browsable
// in the history list (plans/transits-analysis-history-list.md) — each
// entry's full text lives under its own localStorage key, so an unbounded
// list would grow storage without limit at a 20/day cap.
const MAX_TRANSITS_HISTORY = 15;

interface TransitsHistoryEntry {
  cacheKey: string;
  day: string;
  locationName: string | null;
  mode: string;
  lang: string;
  createdAt: number;
  // Key under which the raw planetary positions (TransitsData) for this
  // entry's day+location are stored — separate from cacheKey because
  // positions don't depend on mode/lang, so same-day regenerations in a
  // different mode share one copy instead of duplicating it. Optional:
  // entries written before this field existed simply won't have a table
  // to show when browsed (handled gracefully, not an error).
  dataKey?: string;
}

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
    birth_time?: string;
    birth_place?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    house_system?: string;
    planets?: Record<string, ChartPlanet>;
    houses?: Record<string, ChartHouse>;
    [key: string]: unknown;
  };
  chart2?: {
    birth_date?: string;
    birth_time?: string;
    birth_place?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    house_system?: string;
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

// Reads what to show for this chart's transits form BEFORE any React state
// exists — used both as a useState lazy initializer (so the very first
// render already has the right date/location/lock, no post-mount flash of
// defaults) and from restoreTransitsFromCache (chart switch without a full
// remount). See plans/transits-date-location-persistence.md.
//
// Two sources, checked in order:
// 1. transits_pending|{chartId} + isInFlight — a background analysis for
//    this chart is still actually running (isInFlight survives a Dashboard
//    remount, see utils/inFlightRegistry.ts) -> restore ITS params, locked.
// 2. transits_last_date/transits_last_location|{chartId} — the most
//    recently completed analysis for this chart -> restore its params,
//    unlocked.
function readInitialTransitsState(
  chartId: string | number | null
): { day: string; location: Location | null; locked: boolean } | null {
  if (chartId === null || chartId === '') return null;
  const numericId = typeof chartId === 'number' ? chartId : parseInt(chartId, 10);
  if (isNaN(numericId)) return null;

  const pendingRaw = localStorage.getItem(`transits_pending|${numericId}`);
  if (pendingRaw) {
    try {
      const pending = JSON.parse(pendingRaw) as {
        day: string; mode: string; location: Location | null; registryKey: string;
      };
      if (isInFlight(pending.registryKey)) {
        return { day: pending.day, location: pending.location, locked: true };
      }
    } catch {
      // Stale/corrupt marker — fall through to the last-completed-analysis check.
    }
  }

  const lastDate = localStorage.getItem(`transits_last_date|${numericId}`);
  if (lastDate) {
    const lastLocationRaw = localStorage.getItem(`transits_last_location|${numericId}`);
    let location: Location | null = null;
    if (lastLocationRaw) {
      try {
        location = JSON.parse(lastLocationRaw);
      } catch {
        // noop — treat as "use birth location"
      }
    }
    return { day: lastDate, location, locked: false };
  }

  return null;
}

// Reads the browsable history of completed transits analyses for a chart —
// see plans/transits-analysis-history-list.md. The full text of each entry
// still lives under its own `entry.cacheKey`; this is just the index.
function readTransitsHistory(chartId: string | number): TransitsHistoryEntry[] {
  try {
    const raw = localStorage.getItem(`transits_history|${chartId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Adds/refreshes one entry in that index and evicts the oldest ones (index
// entry + its full-text cacheKey) past MAX_TRANSITS_HISTORY. Called once per
// completed generation, right where transits_last_key/transits_last_date
// already get written.
function appendTransitsHistory(chartId: string | number, entry: TransitsHistoryEntry): TransitsHistoryEntry[] {
  const historyKey = `transits_history|${chartId}`;
  const history = readTransitsHistory(chartId).filter(e => e.cacheKey !== entry.cacheKey);
  history.push(entry);
  history.sort((a, b) => a.createdAt - b.createdAt);
  while (history.length > MAX_TRANSITS_HISTORY) {
    const evicted = history.shift();
    if (!evicted) continue;
    localStorage.removeItem(evicted.cacheKey);
    // dataKey is shared across entries with the same day+location but a
    // different mode/lang (positions don't depend on those) — only delete
    // it if nothing still in the list needs it.
    if (evicted.dataKey && !history.some(e => e.dataKey === evicted.dataKey)) {
      localStorage.removeItem(evicted.dataKey);
    }
  }
  localStorage.setItem(historyKey, JSON.stringify(history));
  return history;
}

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
  // Streaming for the full analysis — natal and synastry (see
  // plans/streaming-analysis-frontend.md, plans/streaming-analysis-frontend-phase2.md).
  // Doesn't touch progressions/transits — they have their own machinery, see useStreamedText.
  const [streamPhase, setStreamPhase] = useState<'idle' | 'searching' | 'generating' | 'typing' | 'done' | 'error'>('idle');
  const [displayedText, setDisplayedText] = useState('');
  const verifiedTextRef = useRef('');
  const streamDeltaReceivedRef = useRef(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const finalTextRef = useRef<string | null>(null);
  const finishStreamRef = useRef<((analysis: string) => void) | null>(null);
  const [finalReceived, setFinalReceived] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<string>(() => {
    return location.state?.analysisMode
      || localStorage.getItem('dashboardAnalysisMode')
      || 'simple';
  });

  const pendingModeRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const isTransitsLoadingRef = useRef(false);
  // Set by the transits_pending reconnect effect below, once it has restored
  // transitsDate/transitsLocation from localStorage and is waiting for that
  // state to actually land before calling runTransitsAnalysis (its closure
  // needs the fresh values to rebuild the same registryKey — see the effect
  // for why calling it immediately would race a stale closure).
  const transitsReconnectRef = useRef<{ day: string; mode: string; location: Location | null } | null>(null);
  const [savedChartId, setSavedChartId] = useState<string | number | null>(() => {


    const hasPendingJob = localStorage.getItem('pendingAnalysisJob');
    if (hasPendingJob) return null;

    const saved = localStorage.getItem('savedChartId');
    return saved ? parseInt(saved, 10) : null;
  });
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [pendingChatCharts, setPendingChatCharts] = useState<Set<number>>(new Set());
  const savedChartIdRef = useRef<string | number | null>(null);
  const chatLoading = savedChartId != null && pendingChatCharts.has(Number(savedChartId));
  // Same reentrancy guard as isLoadingRef/isTransitsLoadingRef/
  // planetInFlightRef/aspectInFlightRef above — a ref (not state) so the
  // check is synchronous. Without it, loadChatForChart entered twice for
  // the same chart while its resume is still running (React.StrictMode
  // double-invokes effects in dev; the same could happen from any other
  // double call) starts two independent replay loops into the single
  // shared chatStream, interleaving two copies of the same text.
  const chatResumeInFlightRef = useRef<Record<string, boolean>>({});
  // Cosmetic only (typewriter catch-up) — persistence happens synchronously
  // in sendChatMessage's onFinal instead, see the comment there.
  const chatStream = useStreamedText(() => {});
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
      if (next) setShowProgressions(false);
      return next;
    });
  };
  const [selectedPlanet, setSelectedPlanet] = useState<ChartPlanet | null>(null);
  const [selectedPlanetKey, setSelectedPlanetKey] = useState<string | null>(null);
  const selectedPlanetKeyRef = useRef<string | null>(null);
  const [planetAnalysis, setPlanetAnalysis] = useState<string | null>(null);
  const [planetAnalysisLoading, setPlanetAnalysisLoading] = useState(false);
  const [planetAnalysisError, setPlanetAnalysisError] = useState<string>('');
  // Each planet card writes into its own cell keyed by planet name — cards
  // are clicked in parallel and independently, same as before streaming, so
  // one shared buffer/ref for all of them caused text to mix up between planets.
  const [planetLiveStreams, setPlanetLiveStreams] = useState<Record<string, { phase: StreamPhase; text: string }>>({});
  // If the same card is reopened before its first stream has finished landing —
  // the second call gets a higher generation number, and the first call's
  // callbacks stop writing to the live cell/state (the requests themselves aren't cancelled).
  const planetGenerationRef = useRef<Record<string, number>>({});
  // While a request for this planet is already in flight, a repeat click on it
  // won't start a new one (unlike the generation counter above, this blocks
  // instead of superseding).
  const planetInFlightRef = useRef<Record<string, boolean>>({});
  const [selectedAspect, setSelectedAspect] = useState<AspectData | null>(null);
  const [selectedAspectKey, setSelectedAspectKey] = useState<string | null>(null);
  const selectedAspectKeyRef = useRef<string | null>(null);
  const [aspectAnalysis, setAspectAnalysis] = useState<string | null>(null);
  const [aspectLoading, setAspectLoading] = useState(false);
  const [aspectError, setAspectError] = useState<string>('');
  const [aspectLiveStreams, setAspectLiveStreams] = useState<Record<string, { phase: StreamPhase; text: string }>>({});
  const aspectGenerationRef = useRef<Record<string, number>>({});
  // While a request for this aspect is already in flight, a repeat click on it
  // won't start a new one (same as planetInFlightRef for planets).
  const aspectInFlightRef = useRef<Record<string, boolean>>({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [showProgressions, setShowProgressions] = useState(false);
  const [analysisTab, setAnalysisTab] = useState<AnalysisTabId>('natal');
  const [progressionsData, setProgressionsData] = useState<ProgressionsData | null>(null);
  const [progressionsAnalysis, setProgressionsAnalysis] = useState<string | null>(null);
  // Natal progressions only — kept per mode (like simpleAnalysis/advancedAnalysis
  // for the natal chart) so switching modes shows the already-fetched text
  // instantly instead of clearing and regenerating. Progressed synastry is out
  // of scope here and keeps its single shared progressionsAnalysis behavior.
  const [progressionsSimpleAnalysis, setProgressionsSimpleAnalysis] = useState<string | null>(null);
  const [progressionsAdvancedAnalysis, setProgressionsAdvancedAnalysis] = useState<string | null>(null);
  const [progressionsLoading, setProgressionsLoading] = useState(false);
  const [progressionsError, setProgressionsError] = useState<string>('');
  const [progressedSynastryData, setProgressedSynastryData] = useState<ProgressedSynastryData | null>(null);
  const [progressedSynastryAnalysis, setProgressedSynastryAnalysis] = useState<string | null>(null);
  // Same per-mode client cache as progressionsSimpleAnalysis/progressionsAdvancedAnalysis
  // above, just for progressed synastry.
  const [progressedSynastrySimpleAnalysis, setProgressedSynastrySimpleAnalysis] = useState<string | null>(null);
  const [progressedSynastryAdvancedAnalysis, setProgressedSynastryAdvancedAnalysis] = useState<string | null>(null);
  const progressionsFinishRef = useRef<((analysis: string) => void) | null>(null);
  const progressionsStream = useStreamedText((analysis) => progressionsFinishRef.current?.(analysis));
  // Computed once, synchronously, from the chart id already in the URL —
  // see readInitialTransitsState. This is what makes the very first render
  // already show the right date/location/lock instead of flashing today's
  // date + an enabled button for one tick before an effect catches up.
  const [initialTransitsState] = useState(() => readInitialTransitsState(chartIdFromUrl));
  const [transitsDate, setTransitsDate] = useState<string>(
    () => initialTransitsState?.day ?? new Date().toISOString().slice(0, 10)
  );
  const [transitsLocation, setTransitsLocation] = useState<Location | null>(
    () => initialTransitsState?.location ?? null
  );
  const [transitsDisplayLocation, setTransitsDisplayLocation] = useState<string | null>(null);
  // Frozen date the currently-shown analysis text was actually computed
  // for — separate from transitsDate, which the picker can move forward
  // without re-running anything (mirrors transitsDisplayLocation).
  const [transitsAnalysisDate, setTransitsAnalysisDate] = useState<string | null>(null);
  const [transitsData, setTransitsData] = useState<TransitsData | null>(null);
  // What day+location transitsData actually represents ("{day}|{locKey}") —
  // see plans/transits-stale-data-and-loading-flag-bugs.md (bug 1).
  const [transitsDataKey, setTransitsDataKey] = useState<string | null>(null);
  const [transitsAnalysis, setTransitsAnalysis] = useState<string | null>(null);
  const [transitsLoading, setTransitsLoading] = useState<boolean>(() => initialTransitsState?.locked ?? false);
  const [transitsError, setTransitsError] = useState<string>('');
  const [transitsReady, setTransitsReady] = useState(false);
  // Persistent "is a transits generation for THIS chart running somewhere in
  // the background" flag — independent of the currently-picked date/location
  // in the form, so the "Дать анализ" button stays disabled even if the user
  // moves the date picker away from the in-flight job's date. See
  // plans/transits-date-location-persistence.md.
  const [transitsGenerationLocked, setTransitsGenerationLocked] = useState<boolean>(
    () => initialTransitsState?.locked ?? false
  );
  // Browsable list of previously completed transits analyses for this chart
  // (plans/transits-analysis-history-list.md). transitsViewingCacheKey marks
  // which history entry's cacheKey corresponds to the LIVE slot below
  // (transitsAnalysis et al) — used only to de-duplicate that entry out of
  // the plain history list (it gets its own pinned "current" row instead).
  const [transitsHistory, setTransitsHistory] = useState<TransitsHistoryEntry[]>([]);
  const [transitsViewingCacheKey, setTransitsViewingCacheKey] = useState<string | null>(null);
  // What the panel actually displays: null = the live slot (transitsAnalysis/
  // transitsAnalysisDate/... — spinner while generating, streaming while
  // typing, full text once done, exactly as before). Non-null = a specific
  // past history entry's static text, browsed via the list — clicking a
  // history row only ever sets this, it never touches the live slot, so the
  // live generation keeps progressing untouched underneath and "Текущий" in
  // the list always leads back to it.
  const [historyViewOverride, setHistoryViewOverride] = useState<string | null>(null);
  const transitsFinishRef = useRef<((analysis: string) => void) | null>(null);
  const transitsStream = useStreamedText((analysis) => transitsFinishRef.current?.(analysis));
  const [transitsRemaining, setTransitsRemaining] = useState<number>(MAX_TRANSITS_ANALYSIS_PER_DAY);

  useEffect(() => {
    savedChartIdRef.current = savedChartId;
  }, [savedChartId]);

  const loadChatForChart = async (chartId: number | string) => {
    try {
      const dbMessages = await chartsApi.getChatMessages(Number(chartId));
      if (Number(savedChartIdRef.current) !== Number(chartId)) return;
      setChatHistory(dbMessages as ChatMessage[]);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }

    // A question sent before a Dashboard remount (navigating away and back —
    // Dashboard remounts on every navigation via key={location.key} in
    // App.tsx) may still be answering in the background: sendChatMessage's
    // fetch isn't aborted on unmount, it just lost the component instance
    // that was going to display it (see inFlightRegistry.ts /
    // streamTextRegistry.ts, same pattern as loadFullAnalysis above).
    // Reconnect instead of leaving the chat panel looking dead.
    const numericChartId = Number(chartId);
    const registryKey = `chat:${numericChartId}`;
    if (!isInFlight(registryKey)) return;
    if (chatResumeInFlightRef.current[registryKey]) return;
    chatResumeInFlightRef.current[registryKey] = true;

    setPendingChatCharts(prev => new Set(prev).add(numericChartId));
    chatStream.reset();

    let seenLength = 0;
    const replay = () => {
      // Stop touching the (single, shared) chatStream once the user has
      // navigated to a different chart — otherwise this chart's replayed
      // text would bleed into whatever chart is now on screen.
      if (Number(savedChartIdRef.current) !== numericChartId) return;
      const current = getStreamText(registryKey);
      if (current.length > seenLength) {
        chatStream.handleDelta(current.slice(seenLength));
        seenLength = current.length;
      }
    };
    replay();
    const replayInterval = window.setInterval(replay, 400);

    waitForClear(registryKey, async () => {
      window.clearInterval(replayInterval);
      delete chatResumeInFlightRef.current[registryKey];
      try {
        const dbMessages = await chartsApi.getChatMessages(numericChartId);
        if (Number(savedChartIdRef.current) === numericChartId) {
          setChatHistory(dbMessages as ChatMessage[]);
        }
      } catch (err) {
        console.error('Failed to reload chat history:', err);
      } finally {
        setPendingChatCharts(prev => {
          const next = new Set(prev);
          next.delete(numericChartId);
          return next;
        });
      }
    }, {
      // Chat answers normally take seconds, not minutes — 5 minutes is a
      // generous ceiling so a real answer never gets cut off, while still
      // giving up instead of spinning forever if something went wrong.
      intervalMs: 5000,
      maxAttempts: 60,
      onTimeout: () => {
        window.clearInterval(replayInterval);
        delete chatResumeInFlightRef.current[registryKey];
        setPendingChatCharts(prev => {
          const next = new Set(prev);
          next.delete(numericChartId);
          return next;
        });
        if (Number(savedChartIdRef.current) === numericChartId) {
          setChatHistory(prev => [...prev, {
            role: 'assistant' as const,
            content: t('dashboard.chat.timeout'),
          }]);
        }
      },
    });
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
    if (chartIdFromUrl) return;

    const pendingJob = localStorage.getItem('pendingAnalysisJob');
    const pendingResult = localStorage.getItem('pendingAnalysisResult');

    if (pendingJob && !chartDataForAnalysis) {
      try {
        const parsed = JSON.parse(pendingJob);
        if (parsed.chartDataForAnalysis) {
          setChartDataForAnalysis(parsed.chartDataForAnalysis);
          if (parsed.analysisMode) {
            setAnalysisMode(parsed.analysisMode);
            localStorage.setItem('dashboardAnalysisMode', parsed.analysisMode);
          }
          localStorage.removeItem('savedChartId');
          setSavedChartId(null);
          savedChartIdRef.current = null;
          setShowFullAnalysis(true);
        }
      } catch {
      }
    }

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

        // Load chat history from database (clearing it first — no leakage between charts)
        setChatHistory([]);
        loadChatForChart(chart.id).catch(err => {
          console.error('Failed to load chat history:', err);
        });
        setChatInput('');

        const isSynastry = chart.chart_data?.type === 'synastry';

        const interp = chart.chart_interpretations?.find(
          (i: { type?: string; interpretation?: string }) => i.type === (isSynastry ? `synastry_${analysisMode}` : `full_${analysisMode}`)
        ) || chart.chart_interpretations?.find(
          (i: { type?: string; interpretation?: string }) => i.type === (isSynastry ? 'synastry_advanced' : 'full_advanced')
        ) || chart.chart_interpretations?.find(
          (i: { type?: string; interpretation?: string }) => i.type === (isSynastry ? 'synastry_simple' : 'full_simple')
        );
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

  const runAxiosAnalysis = useCallback(async (mode: string) => {
    if (!chartDataForAnalysis) return;
    // Same captured-chart-id reasoning as runFullAnalysisStream above — this
    // fallback can complete after the component that started it unmounted.
    const targetChartId = savedChartId;
    const registryKey = targetChartId ? `full:${targetChartId}:${mode}` : null;
    try {
      const { analysis } = await getFullAnalysis(chartDataForAnalysis, mode, i18n.language);
      console.log('analysis received:', analysis?.substring(0, 50));
      setFullAnalysis(analysis);
      console.log('setFullAnalysis called');
      if (mode === 'simple') setSimpleAnalysis(analysis);
      else setAdvancedAnalysis(analysis);

      if (targetChartId) {
        localStorage.setItem(`savedFullAnalysis_${targetChartId}_${mode}`, analysis);
        const isSynastry = chartDataForAnalysis?.type === 'synastry';
        const type = isSynastry ? `synastry_${mode}` : `full_${mode}`;
        chartsApi.saveInterpretation(Number(targetChartId), type, analysis).catch(() => {});
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
      if (registryKey) clearStreamText(registryKey);
      if (registryKey) clearInFlight(registryKey);
    }
  }, [chartDataForAnalysis, t, savedChartId]);

  const runFullAnalysisStream = useCallback(async (mode: string) => {
    if (!chartDataForAnalysis) return;

    // Only meaningful for saved charts — see inFlightRegistry.ts. A new,
    // unsaved chart aborts on leave (see the unmount cleanup effect below)
    // and doesn't need this. Captured from this render's savedChartId, not
    // re-read from localStorage at completion time below, so a background
    // request started for THIS chart can't end up writing its result onto
    // whatever chart happens to be saved by the time it finishes.
    const targetChartId = savedChartId;
    const registryKey = targetChartId ? `full:${targetChartId}:${mode}` : null;

    verifiedTextRef.current = '';
    finalTextRef.current = null;
    streamDeltaReceivedRef.current = false;
    setFinalReceived(false);
    setDisplayedText('');
    setStreamPhase('searching');

    streamAbortRef.current?.abort();
    const abortCtrl = new AbortController();
    streamAbortRef.current = abortCtrl;

    const isSynastry = chartDataForAnalysis.type === 'synastry';

    // Cosmetic reveal only — gated behind the typewriter effect visually
    // catching up (see the useEffect on displayedText/finalReceived below).
    // Persistence lives in onFinal instead, see the comment there.
    finishStreamRef.current = (analysis: string) => {
      setFullAnalysis(analysis);
      if (mode === 'simple') setSimpleAnalysis(analysis);
      else setAdvancedAnalysis(analysis);
      setAnalysisLoading(false);
      isLoadingRef.current = false;
    };

    const callbacks = {
      onStage: (stage: string) => {
        setStreamPhase(prev => {
          if (prev === 'typing' || prev === 'done') return prev;
          return stage === 'generating' ? 'generating' : 'searching';
        });
      },
      onDelta: (text: string) => {
        // Kept for a remounted instance to replay — see loadFullAnalysis's
        // isInFlight branch above and streamTextRegistry.ts.
        if (registryKey) appendStreamText(registryKey, text);
        streamDeltaReceivedRef.current = true;
        verifiedTextRef.current += text;
        setStreamPhase(prev => (prev === 'searching' || prev === 'generating') ? 'typing' : prev);
      },
      onFinal: (result: { analysis: string }) => {
        // Save + clear the in-flight marker the instant the real result is
        // known — do NOT wait for finishStreamRef, which only fires once the
        // typewriter effect visually catches up via a setInterval inside a
        // useEffect. That timer stalls whenever the tab is backgrounded (the
        // browser throttles/freezes it) or the component has unmounted, so
        // waiting for it here would leave registryKey stuck "in flight"
        // until the next visit times out with a false error despite the
        // backend having succeeded (see inFlightRegistry.ts).
        if (targetChartId) {
          localStorage.setItem(`savedFullAnalysis_${targetChartId}_${mode}`, result.analysis);
          const type = isSynastry ? `synastry_${mode}` : `full_${mode}`;
          chartsApi.saveInterpretation(Number(targetChartId), type, result.analysis).catch(() => {});
        }
        if (registryKey) clearStreamText(registryKey);
        if (registryKey) clearInFlight(registryKey);

        verifiedTextRef.current = result.analysis;
        finalTextRef.current = result.analysis;
        setFinalReceived(true);
        setStreamPhase(prev => prev === 'done' ? prev : 'typing');
      },
      onError: (detail: string) => {
        if (!streamDeltaReceivedRef.current) {
          runAxiosAnalysis(mode);
          return;
        }
        setStreamPhase('error');
        setDisplayedText('');
        verifiedTextRef.current = '';
        setAnalysisError(detail || t('dashboard.errors.analysisError'));
        setAnalysisLoading(false);
        isLoadingRef.current = false;
        if (registryKey) clearStreamText(registryKey);
        if (registryKey) clearInFlight(registryKey);
      },
    };

    if (isSynastry) {
      const payload: SynastryAnalysisPayload = {
        chart1: (chartDataForAnalysis.chart1 ?? {}) as Record<string, unknown>,
        chart2: (chartDataForAnalysis.chart2 ?? {}) as Record<string, unknown>,
        aspects: chartDataForAnalysis.aspects,
        overlays: chartDataForAnalysis.overlays,
        language: i18n.language,
        top_k_per_book: 5,
        mode,
        relationship_context: chartDataForAnalysis.relationship_context as string | undefined,
      };
      await streamSynastryAnalysis(payload, callbacks, abortCtrl.signal);
      return;
    }

    const payload: FullAnalysisPayload = {
      chart_data: chartDataForAnalysis as unknown as Record<string, unknown>,
      language: i18n.language,
      top_books: 5,
      mode,
      birth_date: chartDataForAnalysis.meta?.birth_date || null,
      birth_place: chartDataForAnalysis.meta?.birth_place || null,
    };
    await streamFullAnalysis(payload, callbacks, abortCtrl.signal);
  }, [chartDataForAnalysis, runAxiosAnalysis, t, savedChartId]);

  const loadFullAnalysis = useCallback(async (mode = analysisMode) => {
    if (!chartDataForAnalysis) return;
    if (isLoadingRef.current) return;

    // Only meaningful for saved charts — see inFlightRegistry.ts. Blocks a
    // fresh mount from re-starting a generation that's still running in the
    // background from a previous visit to this same chart.
    const registryKey = savedChartId ? `full:${savedChartId}:${mode}` : null;
    if (registryKey && isInFlight(registryKey)) {
      // Blocked because a background generation from a previous visit to
      // this chart is still running. simpleAnalysis/advancedAnalysis on THIS
      // mount were only hydrated once at chart-load time, so they can't have
      // picked up a result that was still being generated back then.
      //
      // Reconnect the typewriter to that background generation instead of
      // sitting on a bare spinner: replay whatever text it has already sent
      // (streamTextRegistry.ts, kept in sync by runFullAnalysisStream's
      // onDelta) and keep polling for more while it's still running — same
      // pattern as loadProgressions/loadTransitsData. Do NOT re-run
      // loadFullAnalysis itself once it clears: the clear could be from a
      // failure just as easily as a success, and blindly retrying would
      // silently fire another real generation on every failure instead of
      // surfacing it.
      setAnalysisLoading(true);
      setAnalysisError('');
      verifiedTextRef.current = '';
      finalTextRef.current = null;
      setFinalReceived(false);
      setDisplayedText('');
      setStreamPhase('searching');

      let seenLength = 0;
      const replay = () => {
        const current = getStreamText(registryKey);
        if (current.length > seenLength) {
          verifiedTextRef.current = current;
          seenLength = current.length;
          setStreamPhase(prev => (prev === 'searching' || prev === 'generating') ? 'typing' : prev);
        }
      };
      replay();
      const replayInterval = window.setInterval(replay, 400);

      finishStreamRef.current = (analysis: string) => {
        setFullAnalysis(analysis);
        if (mode === 'simple') setSimpleAnalysis(analysis);
        else setAdvancedAnalysis(analysis);
        setAnalysisLoading(false);
        isLoadingRef.current = false;
      };

      waitForClear(registryKey, async () => {
        window.clearInterval(replayInterval);
        replay();
        try {
          const chart = await chartsApi.getChart(Number(savedChartId));
          const isSynastryChart = chart.chart_data?.type === 'synastry';
          const type = isSynastryChart ? `synastry_${mode}` : `full_${mode}`;
          const interp = chart.chart_interpretations?.find(i => i.type === type);
          if (interp?.interpretation) {
            verifiedTextRef.current = interp.interpretation;
            finalTextRef.current = interp.interpretation;
            setFinalReceived(true);
            setStreamPhase(prev => prev === 'done' ? prev : 'typing');
          } else {
            // The background attempt cleared without saving anything (it
            // failed) — surface that instead of silently starting another
            // real generation.
            setStreamPhase('error');
            setDisplayedText('');
            verifiedTextRef.current = '';
            setAnalysisLoading(false);
            setAnalysisError(t('dashboard.errors.analysisError'));
          }
        } catch {
          setStreamPhase('error');
          setDisplayedText('');
          verifiedTextRef.current = '';
          setAnalysisLoading(false);
          setAnalysisError(t('dashboard.errors.analysisError'));
        }
      }, {
        // Full analysis generation can run several minutes — the old 80s
        // default timed out long before it finished, showing a false error
        // while the backend was still working. ~12.5 minutes covers
        // realistic generation time.
        intervalMs: 5000,
        maxAttempts: 150,
        onTimeout: () => {
          window.clearInterval(replayInterval);
          setStreamPhase('error');
          setDisplayedText('');
          verifiedTextRef.current = '';
          setAnalysisLoading(false);
          setAnalysisError(t('dashboard.errors.analysisError'));
        },
      });
      return;
    }

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

    if (registryKey) markInFlight(registryKey);
    await runFullAnalysisStream(mode);
  }, [chartDataForAnalysis, analysisMode, simpleAnalysis, advancedAnalysis, runFullAnalysisStream, savedChartId]);

  useEffect(() => {
    if (streamPhase !== 'searching' && streamPhase !== 'generating' && streamPhase !== 'typing') {
      return;
    }
    const TICK_MS = 35;
    const id = window.setInterval(() => {
      setDisplayedText(prev => {
        const target = verifiedTextRef.current;
        const backlog = target.length - prev.length;
        if (backlog <= 0) return prev;
        const step = Math.min(backlog, 1 + Math.floor(backlog / 20));
        return target.slice(0, prev.length + step);
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [streamPhase]);

  useEffect(() => {
    if (!finalReceived || finalTextRef.current == null) return;
    if (displayedText.length < finalTextRef.current.length) return;
    setStreamPhase('done');
    finishStreamRef.current?.(finalTextRef.current);
    finishStreamRef.current = null;
  }, [displayedText, finalReceived]);

  useEffect(() => {
    return () => {
      // Only abort for a new, unsaved chart — leaving loses nothing there
      // that can't be regenerated (see the unsaved-analysis warning modal).
      // For a saved chart, let it finish in the background: the in-flight
      // registry above (see runFullAnalysisStream/loadFullAnalysis) stops a
      // fresh mount from duplicating it if the user comes back before it's
      // done, and the result still gets saved when it completes.
      if (!savedChartIdRef.current) {
        streamAbortRef.current?.abort();
      }
    };
  }, []);

  useEffect(() => {
    isLoadingRef.current = false;
  }, [chartIdFromUrl]);

  const resetProgressions = useCallback(() => {
    setShowProgressions(false);
    setAnalysisTab('natal');
    setProgressionsData(null);
    setProgressionsAnalysis(null);
    setProgressionsSimpleAnalysis(null);
    setProgressionsAdvancedAnalysis(null);
    setProgressionsError('');
    setProgressedSynastryData(null);
    setProgressedSynastryAnalysis(null);
    setProgressedSynastrySimpleAnalysis(null);
    setProgressedSynastryAdvancedAnalysis(null);
    setTransitsDate(new Date().toISOString().slice(0, 10));
    setTransitsLocation(null);
    setTransitsData(null);
    setTransitsDataKey(null);
    setTransitsAnalysis(null);
    setTransitsAnalysisDate(null);
    setTransitsError('');
    setTransitsReady(false);
    setTransitsLoading(false);
    setTransitsGenerationLocked(false);
    setTransitsHistory([]);
    setTransitsViewingCacheKey(null);
    setHistoryViewOverride(null);
  }, []);

  const refreshTransitsRemaining = useCallback(async () => {
    if (!user?.id) return;
    try {
      const usedToday = await chartsApi.getTransitsUsageToday(user.id);
      setTransitsRemaining(Math.max(0, MAX_TRANSITS_ANALYSIS_PER_DAY - usedToday));
    } catch (err) {
      console.error('Failed to load transits usage:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshTransitsRemaining();
  }, [refreshTransitsRemaining]);

  const restoreTransitsFromCache = (chartId: string | number) => {
    // Re-derive date/location/lock for this specific chart (resetProgressions,
    // called right before this, wiped them to defaults) — same source of
    // truth as the mount-time lazy init, so a chart switch without a full
    // remount lands on the same result. See readInitialTransitsState.
    const restored = readInitialTransitsState(chartId);
    if (restored) {
      setTransitsDate(restored.day);
      setTransitsLocation(restored.location);
      setTransitsGenerationLocked(restored.locked);
      setTransitsLoading(restored.locked);
    }

    setTransitsHistory(readTransitsHistory(chartId));

    // If a DIFFERENT (or the same) generation is currently locked/in-flight
    // for this chart, do NOT show the last-completed text here — it would
    // be the previous result, not the one that matches the just-restored
    // date. Leave the live slot empty so the spinner (loading is already
    // true from `restored.locked` above) and the reconnect effect below
    // take over instead. See plans/transits-analysis-history-list.md.
    if (restored?.locked) return;

    const lastKey = localStorage.getItem(`transits_last_key|${chartId}`);
    if (!lastKey) return;
    const cached = localStorage.getItem(lastKey);
    if (cached) {
      setTransitsAnalysis(cached);
      const locationName = localStorage.getItem(`transits_location_name|${chartId}`);
      setTransitsDisplayLocation(locationName);
      const lastDate = localStorage.getItem(`transits_last_date|${chartId}`);
      setTransitsAnalysisDate(lastDate);
      setTransitsReady(true);
      setTransitsViewingCacheKey(lastKey);
    }
  };

  const loadProgressions = useCallback(async (mode = analysisMode) => {
    if (!chartDataForAnalysis || !savedChartId) return;

    const isSynastry = chartDataForAnalysis.type === 'synastry';
    // Survives a Dashboard remount (leaving this chart and coming back) —
    // unlike a plain useRef, so a background request that's still running
    // after the component unmounted won't get duplicated on return.
    const registryKey = `${isSynastry ? 'progressed-synastry' : 'progressions'}:${savedChartId}:${mode}`;
    if (isInFlight(registryKey)) {
      // Blocked because a background request from a previous visit to this
      // chart is still running — it belongs to an unmounted instance, but it
      // has been writing every chunk it received into streamTextRegistry.ts
      // (see the live onDelta below) the whole time. Reconnect the
      // typewriter to that buffer right away — replay whatever's already
      // there, then keep polling it for new text — instead of sitting on a
      // bare spinner until the whole response is done: by spec, returning to
      // this chart mid-generation should show the printer picking up where
      // it left off, exactly like the Network tab already shows.
      setProgressionsLoading(true);
      setProgressionsError('');
      progressionsStream.reset();
      let seenLength = 0;
      const replay = () => {
        const current = getStreamText(registryKey);
        if (current.length > seenLength) {
          progressionsStream.handleDelta(current.slice(seenLength));
          seenLength = current.length;
        }
      };
      replay();
      const replayInterval = window.setInterval(replay, 400);

      progressionsFinishRef.current = (analysis: string) => {
        if (isSynastry) {
          setProgressedSynastryAnalysis(analysis);
          if (mode === 'simple') setProgressedSynastrySimpleAnalysis(analysis);
          else setProgressedSynastryAdvancedAnalysis(analysis);
        } else {
          setProgressionsAnalysis(analysis);
          if (mode === 'simple') setProgressionsSimpleAnalysis(analysis);
          else setProgressionsAdvancedAnalysis(analysis);
        }
        setProgressionsLoading(false);
      };

      // Do NOT re-run loadProgressions itself once this clears — the clear
      // could be from a failure just as easily as a success, and blindly
      // retrying the whole function would silently fire another real
      // generation on every failure instead of surfacing it.
      waitForClear(registryKey, async () => {
        window.clearInterval(replayInterval);
        replay(); // catch any text that landed between the last tick and clearing
        try {
          const cached = isSynastry
            ? await chartsApi.getProgressedSynastryAnalysis(Number(savedChartId), mode, new Date().toISOString().slice(0, 7))
            : await chartsApi.getProgressionsAnalysis(Number(savedChartId), mode, new Date().toISOString().slice(0, 7));
          if (cached) {
            progressionsStream.handleFinal(cached);
          } else {
            // The background attempt cleared without saving anything (it
            // failed) — surface that instead of silently starting another
            // real generation.
            progressionsStream.handleError();
            setProgressionsLoading(false);
            setProgressionsError(t('dashboard.progressions.error'));
          }
        } catch {
          progressionsStream.handleError();
          setProgressionsLoading(false);
          setProgressionsError(t('dashboard.progressions.error'));
        }
      }, {
        // Progressions/progressed-synastry generation genuinely runs several
        // minutes (see the Network tab) — the old 80s default timed out long
        // before it, showing a false error while the backend was still
        // working. ~12.5 minutes covers realistic generation time.
        intervalMs: 5000,
        maxAttempts: 150,
        onTimeout: () => {
          window.clearInterval(replayInterval);
          progressionsStream.handleError();
          setProgressionsLoading(false);
          setProgressionsError(t('dashboard.progressions.error'));
        },
      });
      return;
    }
    markInFlight(registryKey);

    setProgressionsLoading(true);
    setProgressionsError('');

    try {
      if (isSynastry) {
        const { chart1, chart2 } = chartDataForAnalysis;
        if (!chart1?.birth_date || !chart2?.birth_date) {
          setProgressionsError(t('dashboard.progressions.noBirthData'));
          setProgressionsLoading(false);
          clearInFlight(registryKey);
          return;
        }

        const buildPersonInput = (c: NonNullable<typeof chart1>) => ({
          birth_date: c.birth_date,
          birth_time: c.birth_time,
          birth_place: c.birth_place,
          latitude: c.latitude,
          longitude: c.longitude,
          timezone: c.timezone,
          house_system: c.house_system || 'Placidus'
        });

        const data = await astrologyAPI.calculateProgressedSynastry({
          chart1: buildPersonInput(chart1),
          chart2: buildPersonInput(chart2),
          house_system: chart1.house_system || 'Placidus'
        });
        setProgressedSynastryData(data);

        // Already fetched this mode client-side — switch instantly, no DB
        // round-trip, no regeneration.
        if (mode === 'simple' && progressedSynastrySimpleAnalysis) {
          setProgressedSynastryAnalysis(progressedSynastrySimpleAnalysis);
          setProgressionsLoading(false);
          clearInFlight(registryKey);
          return;
        }
        if (mode === 'advanced' && progressedSynastryAdvancedAnalysis) {
          setProgressedSynastryAnalysis(progressedSynastryAdvancedAnalysis);
          setProgressionsLoading(false);
          clearInFlight(registryKey);
          return;
        }

        const cached = await chartsApi.getProgressedSynastryAnalysis(Number(savedChartId), mode, data.period);
        if (cached) {
          setProgressedSynastryAnalysis(cached);
          if (mode === 'simple') setProgressedSynastrySimpleAnalysis(cached);
          else setProgressedSynastryAdvancedAnalysis(cached);
          setProgressionsLoading(false);
          clearInFlight(registryKey);
          return;
        }
        progressionsStream.reset();
        // Only the cosmetic reveal — see the non-synastry branch below for
        // why persistence isn't done here.
        progressionsFinishRef.current = (analysis: string) => {
          setProgressedSynastryAnalysis(analysis);
          if (mode === 'simple') setProgressedSynastrySimpleAnalysis(analysis);
          else setProgressedSynastryAdvancedAnalysis(analysis);
          setProgressionsLoading(false);
        };

        await streamProgressedSynastryAnalysis(
          { progressed_synastry_data: data as unknown as Record<string, unknown>, language: i18n.language || 'ru', mode },
          {
            onStage: progressionsStream.handleStage,
            onDelta: (text) => {
              // Kept for a remounted instance to replay — see the isInFlight
              // branch above and streamTextRegistry.ts.
              appendStreamText(registryKey, text);
              progressionsStream.handleDelta(text);
            },
            onFinal: (result) => {
              // See the non-synastry branch's onFinal below — same reasoning:
              // persist and clear the in-flight marker immediately, not gated
              // behind the typewriter catch-up which stalls whenever the tab
              // is backgrounded or the component has unmounted.
              chartsApi.saveProgressedSynastryAnalysis(Number(savedChartId), mode, data.period, result.analysis).catch(err => {
                console.error('Failed to save progressed synastry analysis:', err);
              });
              clearStreamText(registryKey);
              clearInFlight(registryKey);
              progressionsStream.handleFinal(result.analysis);
            },
            onError: async (detail) => {
              if (!progressionsStream.hasDelta()) {
                try {
                  const result = await astrologyAPI.getProgressedSynastryAnalysis({
                    progressed_synastry_data: data,
                    language: i18n.language || 'ru'
                  }, mode);
                  setProgressedSynastryAnalysis(result.analysis);
                  if (mode === 'simple') setProgressedSynastrySimpleAnalysis(result.analysis);
                  else setProgressedSynastryAdvancedAnalysis(result.analysis);
                  chartsApi.saveProgressedSynastryAnalysis(Number(savedChartId), mode, data.period, result.analysis).catch(err => {
                    console.error('Failed to save progressed synastry analysis:', err);
                  });
                } catch (err) {
                  const errorDetail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
                  setProgressionsError(typeof errorDetail === 'string' ? errorDetail : t('dashboard.progressions.error'));
                } finally {
                  setProgressionsLoading(false);
                  clearStreamText(registryKey);
                  clearInFlight(registryKey);
                }
                return;
              }
              progressionsStream.handleError();
              setProgressionsError(detail || t('dashboard.progressions.error'));
              setProgressionsLoading(false);
              clearStreamText(registryKey);
              clearInFlight(registryKey);
            },
          }
        );
        return;
      }

      const meta = chartDataForAnalysis.meta;
      if (!meta?.birth_date) {
        setProgressionsError(t('dashboard.progressions.noBirthData'));
        setProgressionsLoading(false);
        clearInFlight(registryKey);
        return;
      }

      // Already fetched this mode client-side — switch instantly, no request,
      // no regeneration (mirrors simpleAnalysis/advancedAnalysis for natal).
      if (mode === 'simple' && progressionsSimpleAnalysis) {
        setProgressionsAnalysis(progressionsSimpleAnalysis);
        setProgressionsLoading(false);
        clearInFlight(registryKey);
        return;
      }
      if (mode === 'advanced' && progressionsAdvancedAnalysis) {
        setProgressionsAnalysis(progressionsAdvancedAnalysis);
        setProgressionsLoading(false);
        clearInFlight(registryKey);
        return;
      }

      const period = new Date().toISOString().slice(0, 7); // YYYY-MM
      const data = await astrologyAPI.calculateProgressions({
        birth_date: meta.birth_date,
        birth_place: meta.birth_place,
        latitude: meta.latitude,
        longitude: meta.longitude,
        timezone: meta.timezone,
        house_system: (chartDataForAnalysis.houses_meta as { house_system?: string } | undefined)?.house_system || 'Placidus'
      });
      setProgressionsData(data);

      const cached = await chartsApi.getProgressionsAnalysis(Number(savedChartId), mode, period);
      if (cached) {
        setProgressionsAnalysis(cached);
        if (mode === 'simple') setProgressionsSimpleAnalysis(cached);
        else setProgressionsAdvancedAnalysis(cached);
        setProgressionsLoading(false);
        clearInFlight(registryKey);
        return;
      }

      progressionsStream.reset();
      // Only the cosmetic reveal (show the text, drop the spinner) — kept
      // gated behind the typewriter effect catching up. Persistence lives in
      // onFinal below instead, see the comment there.
      progressionsFinishRef.current = (analysis: string) => {
        setProgressionsAnalysis(analysis);
        if (mode === 'simple') setProgressionsSimpleAnalysis(analysis);
        else setProgressionsAdvancedAnalysis(analysis);
        setProgressionsLoading(false);
      };

      await streamProgressionsAnalysis(
        { natal_chart: chartDataForAnalysis as unknown as Record<string, unknown>, progression_data: data as unknown as Record<string, unknown>, language: i18n.language || 'ru', mode },
        {
          onStage: progressionsStream.handleStage,
          onDelta: (text) => {
            // Kept for a remounted instance to replay — see the isInFlight
            // branch above and streamTextRegistry.ts.
            appendStreamText(registryKey, text);
            progressionsStream.handleDelta(text);
          },
          onFinal: (result) => {
            // Save + clear the in-flight marker the instant the real result is
            // known — do NOT wait for progressionsFinishRef, which only fires
            // once the typewriter effect visually catches up. That catch-up
            // runs off a setInterval inside a useEffect, which stalls
            // whenever the tab is backgrounded (throttled/frozen by the
            // browser) or the component has unmounted — so if that happens
            // while the stream is still running, doing this there would
            // leave registryKey stuck "in flight" until the next visit times
            // out 80s later with a false "Не вдалося розрахувати прогресії"
            // error, even though the backend finished successfully (see
            // inFlightRegistry.ts).
            chartsApi.saveProgressionsAnalysis(Number(savedChartId), mode, period, result.analysis).catch(err => {
              console.error('Failed to save progressions analysis:', err);
            });
            clearStreamText(registryKey);
            clearInFlight(registryKey);
            progressionsStream.handleFinal(result.analysis);
          },
          onError: async (detail) => {
            if (!progressionsStream.hasDelta()) {
              try {
                const result = await astrologyAPI.getProgressionsAnalysis({
                  natal_chart: chartDataForAnalysis,
                  progression_data: data,
                  language: i18n.language || 'ru'
                }, mode);
                setProgressionsAnalysis(result.analysis);
                if (mode === 'simple') setProgressionsSimpleAnalysis(result.analysis);
                else setProgressionsAdvancedAnalysis(result.analysis);
                chartsApi.saveProgressionsAnalysis(Number(savedChartId), mode, period, result.analysis).catch(err => {
                  console.error('Failed to save progressions analysis:', err);
                });
              } catch (err) {
                const errorDetail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
                setProgressionsError(typeof errorDetail === 'string' ? errorDetail : t('dashboard.progressions.error'));
              } finally {
                setProgressionsLoading(false);
                clearStreamText(registryKey);
                clearInFlight(registryKey);
              }
              return;
            }
            progressionsStream.handleError();
            setProgressionsError(detail || t('dashboard.progressions.error'));
            setProgressionsLoading(false);
            clearStreamText(registryKey);
            clearInFlight(registryKey);
          },
        }
      );
    } catch (err) {
      const errorDetail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      setProgressionsError(typeof errorDetail === 'string' ? errorDetail : t('dashboard.progressions.error'));
      setProgressionsLoading(false);
      clearInFlight(registryKey);
    }
  }, [chartDataForAnalysis, savedChartId, analysisMode, t, progressionsStream, progressionsSimpleAnalysis, progressionsAdvancedAnalysis, progressedSynastrySimpleAnalysis, progressedSynastryAdvancedAnalysis]);


  const loadTransitsData = useCallback(async (date?: string, opts?: { keepAnalysis?: boolean }) => {
    if (!chartDataForAnalysis || !savedChartId) return;
    if (chartDataForAnalysis.type === 'synastry') return;
    if (isTransitsLoadingRef.current) return;
    // transitsGenerationLocked is already correct from the very first render
    // (lazy init from transits_pending, see readInitialTransitsState) — long
    // before runTransitsAnalysis's reconnect branch gets a chance to run and
    // set isTransitsLoadingRef. Without this, the transitsLocation effect
    // right below can fire loadTransitsData in that gap, and its own
    // setTransitsLoading(false) clobbers the reconnect's spinner before it
    // even starts. See plans/transits-stale-data-and-loading-flag-bugs.md.
    if (transitsGenerationLocked) return;

    const meta = chartDataForAnalysis.meta;
    if (!meta?.birth_date) {
      setTransitsError(t('dashboard.progressions.noBirthData'));
      return;
    }

    const day = date || transitsDate || new Date().toISOString().slice(0, 10);
    const locKey = transitsLocation ? `${transitsLocation.lat},${transitsLocation.lon}` : 'natal';

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
      // Tags what day+location this actually represents — runTransitsAnalysis
      // below only reuses transitsData when this matches, instead of trusting
      // "not null" (which could be stale from an earlier date). See
      // plans/transits-stale-data-and-loading-flag-bugs.md.
      setTransitsDataKey(`${day}|${locKey}`);

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
  }, [chartDataForAnalysis, savedChartId, transitsDate, transitsLocation, transitsGenerationLocked, t]);

  const runTransitsAnalysis = useCallback(async (date?: string, mode = analysisMode) => {
    if (!chartDataForAnalysis || !savedChartId) return;
    if (chartDataForAnalysis.type === 'synastry') return;
    if (isTransitsLoadingRef.current) return;

    const meta = chartDataForAnalysis.meta;
    if (!meta?.birth_date) {
      setTransitsError(t('dashboard.progressions.noBirthData'));
      return;
    }

    const day = date || transitsDate || new Date().toISOString().slice(0, 10);
    const locKey = transitsLocation ? `${transitsLocation.lat},${transitsLocation.lon}` : 'natal';
    const cacheKey = `transits_analysis|${savedChartId}|${day}|${mode}|${i18n.language}|${locKey}`;

    // Survives a Dashboard remount (leaving this chart and coming back) —
    // see inFlightRegistry.ts. isTransitsLoadingRef alone only protects
    // within the current mount and also guards mutual exclusion with
    // loadTransitsData above.
    const registryKey = `transits:${savedChartId}:${day}:${locKey}:${mode}`;
    // Lets a fresh mount (chart reload, or just returning to the Транзити
    // tab) discover that a background run is still going WITHOUT the user
    // having to re-enter the same city/date and click "Дати аналіз" again —
    // see the pendingKey-driven reconnect effect below. isInFlight(registryKey)
    // alone only says THAT something is running, not what params to rebuild
    // it with, since transitsLocation/transitsDate don't survive a remount.
    const pendingKey = `transits_pending|${savedChartId}`;
    const releaseTransitsLock = () => {
      localStorage.removeItem(pendingKey);
      clearInFlight(registryKey);
      setTransitsGenerationLocked(false);
    };

    if (transitsGenerationLocked && !isInFlight(registryKey)) {
      // A transits job for THIS chart is already running in the background
      // under different params (date/location/mode) — refuse to start a
      // second, parallel stream: it would overwrite the single pendingKey
      // slot and race two results into the same state. See
      // plans/transits-date-location-persistence.md.
      setTransitsError(t('dashboard.transits.generationInProgress'));
      return;
    }

    if (isInFlight(registryKey)) {
      // Same reasoning as loadProgressions above — reconnect the typewriter
      // to the still-running background stream by replaying
      // streamTextRegistry.ts instead of sitting on a bare spinner, then
      // wait for the background request to clear and pick up the saved
      // result. Do NOT re-run runTransitsAnalysis itself once it clears: the
      // clear could be from a failure just as easily as a success, and
      // blindly retrying would silently fire another real generation on
      // every failure instead of surfacing it.
      setTransitsLoading(true);
      setTransitsGenerationLocked(true);
      setTransitsError('');
      // Reconnecting to a job whose date/location may differ from whatever
      // was shown before (e.g. restoreTransitsFromCache intentionally left
      // this empty when locked) — make sure the live slot reflects "still
      // generating" (spinner) rather than a stale previous result, and stop
      // browsing any history entry so the reconnect is actually visible.
      // transitsViewingCacheKey also has to go — it still names whatever
      // WAS the live entry before this job started, and clicking that now-
      // historical row compares its cacheKey against this stale value in
      // handleSelectTransitsHistoryEntry, silently treating it as "already
      // viewing this" and refusing to open it.
      setTransitsAnalysis(null);
      setTransitsReady(false);
      setHistoryViewOverride(null);
      setTransitsViewingCacheKey(null);
      // Without this, loadTransitsData (fired e.g. by the transitsLocation
      // effect right below this same reconnect restoring transitsLocation
      // on a fresh mount) sees the ref still false and isn't blocked — it
      // runs to completion (fast, no LLM) and its own setTransitsLoading(false)
      // clobbers this reconnect's spinner state, even though the real
      // generation is still running in the background. transitsGenerationLocked
      // then stays true (only cleared below on actual completion) while
      // transitsLoading goes stuck false — panel shows neither spinner nor
      // text. See plans/transits-stale-data-and-loading-flag-bugs.md (bug 2).
      isTransitsLoadingRef.current = true;

      // This branch used to only reconnect the TEXT stream — the planet
      // positions table was never (re)calculated here, so any request that
      // landed in this branch (isInFlight was already true for this exact
      // registryKey, e.g. a background run from earlier in the same tab)
      // permanently showed an empty table below the text. Same reuse-or-
      // calculate check as the fresh branch below: skip if already correct.
      if (transitsDataKey !== `${day}|${locKey}`) {
        try {
          const positions = await astrologyAPI.calculateTransits({
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
          setTransitsData(positions);
          setTransitsDataKey(`${day}|${locKey}`);
        } catch {
          // Non-fatal — the text reconnect below still works even if this
          // fails; the table just stays empty, same as before this fix.
        }
      }

      transitsStream.reset();
      let seenLength = 0;
      const replay = () => {
        const current = getStreamText(registryKey);
        if (current.length > seenLength) {
          transitsStream.handleDelta(current.slice(seenLength));
          seenLength = current.length;
        }
      };
      replay();
      const replayInterval = window.setInterval(replay, 400);

      transitsFinishRef.current = (analysis: string) => {
        setTransitsAnalysis(analysis);
        setTransitsAnalysisDate(day);
        setTransitsDisplayLocation(transitsLocation?.display_name || meta.birth_place || null);
        setTransitsReady(true);
        setTransitsLoading(false);
        isTransitsLoadingRef.current = false;
        setTransitsViewingCacheKey(cacheKey);
        // The instance that actually owns the request wrote the history
        // entry via its own persistTransitsResult — pick it up here too.
        if (savedChartId) setTransitsHistory(readTransitsHistory(savedChartId));
      };

      waitForClear(registryKey, () => {
        window.clearInterval(replayInterval);
        replay();
        setTransitsGenerationLocked(false);
        localStorage.removeItem(pendingKey);
        const result = localStorage.getItem(cacheKey);
        if (result) {
          transitsStream.handleFinal(result);
          // The instance that actually owned the request already recorded
          // usage in Supabase (persistTransitsResult) — this instance just
          // needs to re-ask for the current count so its own "Залишилось
          // X з Y" isn't stuck at whatever it showed before reconnecting.
          refreshTransitsRemaining();
        } else {
          transitsStream.handleError();
          setTransitsLoading(false);
          isTransitsLoadingRef.current = false;
          setTransitsError(t('dashboard.transits.error'));
        }
      }, {
        // Transits generation can run several minutes — the old 80s default
        // timed out long before it finished, showing a false error while the
        // backend was still working. ~12.5 minutes covers realistic
        // generation time.
        intervalMs: 5000,
        maxAttempts: 150,
        onTimeout: () => {
          window.clearInterval(replayInterval);
          setTransitsGenerationLocked(false);
          localStorage.removeItem(pendingKey);
          transitsStream.handleError();
          setTransitsLoading(false);
          isTransitsLoadingRef.current = false;
          setTransitsError(t('dashboard.transits.error'));
        },
      });
      return;
    }
    markInFlight(registryKey);
    localStorage.setItem(pendingKey, JSON.stringify({ day, mode, location: transitsLocation, registryKey }));

    setTransitsLoading(true);
    setTransitsGenerationLocked(true);
    setTransitsError('');
    // A genuinely new generation is starting — clear the live slot so the
    // spinner/typewriter show instead of whatever was there before. Nothing
    // is lost: the previous result (if any) is already in transitsHistory.
    // Also stop browsing any history entry, so this is actually visible, and
    // forget which cacheKey used to be "live" — otherwise it keeps naming
    // the now-historical entry and clicking that row in the list silently
    // no-ops (handleSelectTransitsHistoryEntry mistakes it for "already
    // viewing this").
    setTransitsAnalysis(null);
    setTransitsReady(false);
    setHistoryViewOverride(null);
    setTransitsViewingCacheKey(null);
    isTransitsLoadingRef.current = true;

    try {
      // Only reuse transitsData if it's actually tagged for THIS day+location
      // — being merely non-null isn't enough, it could be stale from an
      // earlier date if loadTransitsData's own recalculation for the current
      // pick hasn't landed yet. See plans/transits-stale-data-and-loading-flag-bugs.md.
      let data = transitsDataKey === `${day}|${locKey}` ? transitsData : null;
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
        setTransitsDataKey(`${day}|${locKey}`);
      }

      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setTransitsAnalysis(cached);
        setTransitsAnalysisDate(day);
        setTransitsReady(true);
        setTransitsLoading(false);
        isTransitsLoadingRef.current = false;
        setTransitsViewingCacheKey(cacheKey);
        setHistoryViewOverride(null);
        releaseTransitsLock();
        return;
      }

      if (!user?.id) {
        setTransitsError(t('dashboard.transits.error'));
        setTransitsLoading(false);
        isTransitsLoadingRef.current = false;
        releaseTransitsLock();
        return;
      }
      // Real count of today's rows in Supabase, not a localStorage counter —
      // see plans/transits-daily-limit-server-side.md. Still a client-side
      // check (not enforced on the backend before the LLM call), but no
      // longer editable via DevTools the way the old localStorage value was.
      const usedToday = await chartsApi.getTransitsUsageToday(user.id);
      if (usedToday >= MAX_TRANSITS_ANALYSIS_PER_DAY) {
        setTransitsError(t('dashboard.transits.limitReached', { limit: MAX_TRANSITS_ANALYSIS_PER_DAY }));
        setTransitsLoading(false);
        isTransitsLoadingRef.current = false;
        releaseTransitsLock();
        return;
      }

      const locationName = transitsLocation?.display_name || meta.birth_place || null;
      // Doesn't depend on mode/lang — a same-day regeneration in a different
      // mode reuses this instead of writing a duplicate copy of the same
      // planetary positions.
      const dataKey = `transits_positions|${savedChartId}|${day}|${locKey}`;

      // Writes the result somewhere durable (localStorage cache + daily
      // counter) — must not wait for the typewriter effect to catch up, see
      // onFinal below. Async now (was fire-and-forget): refreshTransitsRemaining
      // re-queries the Supabase COUNT right after, so the insert must actually
      // land first — firing both in parallel raced the SELECT ahead of the
      // INSERT and kept showing the stale "5 of 5" until a reload re-read it.
      const persistTransitsResult = async (analysis: string) => {
        localStorage.setItem(cacheKey, analysis);
        localStorage.setItem(`transits_last_key|${savedChartId}`, cacheKey);
        localStorage.setItem(`transits_last_date|${savedChartId}`, day);
        localStorage.setItem(`transits_last_location|${savedChartId}`, JSON.stringify(transitsLocation));
        if (locationName) localStorage.setItem(`transits_location_name|${savedChartId}`, locationName);
        try {
          await chartsApi.recordTransitsUsage(user.id, savedChartId);
        } catch (err) {
          console.error('Failed to record transits usage:', err);
        }
        await refreshTransitsRemaining();
        // Raw planetary positions for this day+location — lets a browsed
        // history entry show its own matching table/lunar-phase cards
        // instead of always whatever's currently in transitsData. See
        // the "а записывать в локал сторедж вместе с анализом?" fix.
        localStorage.setItem(dataKey, JSON.stringify(data));
        // Add to the browsable history list (plans/transits-analysis-history-list.md)
        // — caps + evicts the oldest entry (and its full text) past
        // MAX_TRANSITS_HISTORY.
        const updatedHistory = appendTransitsHistory(savedChartId as string | number, {
          cacheKey,
          day,
          locationName,
          mode,
          lang: i18n.language || 'ru',
          createdAt: Date.now(),
          dataKey,
        });
        setTransitsHistory(updatedHistory);
      };

      // Cosmetic reveal only — gated behind the typewriter effect visually
      // catching up (via transitsFinishRef below), so it's a no-op once the
      // component has unmounted, which is fine: nobody's watching.
      const revealTransitsResult = (analysis: string) => {
        setTransitsAnalysis(analysis);
        setTransitsAnalysisDate(day);
        setTransitsReady(true);
        setTransitsDisplayLocation(locationName);
        setTransitsViewingCacheKey(cacheKey);
      };

      transitsStream.reset();
      transitsFinishRef.current = (analysis: string) => {
        revealTransitsResult(analysis);
        setTransitsLoading(false);
        isTransitsLoadingRef.current = false;
      };

      await streamTransitsAnalysis(
        {
          natal_chart: chartDataForAnalysis as unknown as Record<string, unknown>,
          transit_data: data as unknown as Record<string, unknown>,
          language: i18n.language || 'ru',
          mode,
          ...(transitsLocation && {
            transit_latitude: transitsLocation.lat,
            transit_longitude: transitsLocation.lon,
            transit_place: transitsLocation.display_name,
          }),
        },
        {
          onStage: transitsStream.handleStage,
          onDelta: (text) => {
            // Kept for a remounted instance to replay — see the isInFlight
            // branch above and streamTextRegistry.ts.
            appendStreamText(registryKey, text);
            transitsStream.handleDelta(text);
          },
          onFinal: (result) => {
            // Persist + clear the in-flight marker immediately — the
            // typewriter catch-up that drives transitsFinishRef runs off a
            // setInterval inside a useEffect that stalls whenever the tab is
            // backgrounded or the component has unmounted. Waiting for it
            // here would mean a request that finishes while the tab isn't
            // focused never gets saved or unblocked, and the next visit
            // times out with a false error despite the backend having
            // succeeded (see inFlightRegistry.ts).
            persistTransitsResult(result.analysis);
            clearStreamText(registryKey);
            releaseTransitsLock();
            transitsStream.handleFinal(result.analysis);
          },
          onError: async (detail) => {
            if (!transitsStream.hasDelta()) {
              try {
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
                persistTransitsResult(result.analysis);
                revealTransitsResult(result.analysis);
              } catch (err) {
                const errorDetail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
                setTransitsError(typeof errorDetail === 'string' ? errorDetail : t('dashboard.transits.error'));
              } finally {
                setTransitsLoading(false);
                isTransitsLoadingRef.current = false;
                clearStreamText(registryKey);
                releaseTransitsLock();
              }
              return;
            }
            transitsStream.handleError();
            setTransitsError(detail || t('dashboard.transits.error'));
            setTransitsLoading(false);
            isTransitsLoadingRef.current = false;
            clearStreamText(registryKey);
            releaseTransitsLock();
          },
        }
      );

    } catch (err) {
      const errorDetail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      setTransitsError(typeof errorDetail === 'string' ? errorDetail : t('dashboard.transits.error'));
      setTransitsLoading(false);
      isTransitsLoadingRef.current = false;
      releaseTransitsLock();
    }
  }, [chartDataForAnalysis, savedChartId, analysisMode, transitsDate, transitsLocation, transitsData, transitsDataKey, transitsGenerationLocked, user?.id, t, refreshTransitsRemaining, transitsStream]);

  const handleTransitsDateChange = useCallback((date: string) => {
    setTransitsDate(date);
    // Moving the date picker implicitly means "show me what's live for
    // this pick" — stop browsing whatever history entry was open.
    setHistoryViewOverride(null);
    loadTransitsData(date);
  }, [loadTransitsData]);

  // Selects what the panel displays: a specific past entry from the list
  // (by cacheKey), or null to go back to the live slot ("Текущий" row).
  // Never touches transitsAnalysis/transitsReady/etc — the live generation
  // (if any) keeps progressing untouched underneath, so it's always there
  // to come back to. See plans/transits-analysis-history-list.md.
  const handleSelectTransitsHistoryEntry = useCallback((entry: TransitsHistoryEntry) => {
    if (entry.cacheKey === transitsViewingCacheKey) {
      // This entry IS the live one — just point back at it instead of
      // pinning to a frozen copy of the same text.
      setHistoryViewOverride(null);
      return;
    }
    setHistoryViewOverride(entry.cacheKey);
  }, [transitsViewingCacheKey]);

  // "Текущий" — the pinned row in the history list that always leads back
  // to the live slot. Derived fresh on every render (not stored state): the
  // date/location picker can be moved around while a DIFFERENT job is
  // locked/generating (the guard in runTransitsAnalysis only blocks
  // starting a second stream, it doesn't freeze the picker), so reading the
  // in-flight job's own day/location straight out of transits_pending is
  // the only way this can't drift from what's actually running.
  const transitsCurrentEntry = (() => {
    if (transitsGenerationLocked) {
      if (!savedChartId) return null;
      try {
        const raw = localStorage.getItem(`transits_pending|${savedChartId}`);
        if (!raw) return null;
        const pending = JSON.parse(raw) as { day: string; location: Location | null };
        return { day: pending.day, locationName: pending.location?.display_name ?? null, status: 'locked' as const };
      } catch {
        return null;
      }
    }
    if (transitsReady && transitsAnalysis) {
      return {
        day: transitsAnalysisDate ?? transitsDate,
        locationName: transitsDisplayLocation ?? null,
        status: 'ready' as const,
      };
    }
    return null;
  })();

  // Same entry, once it completes, also lands in transitsHistory (written by
  // persistTransitsResult) — filter it out of the plain list since it's
  // already shown as the pinned row above.
  const transitsHistoryForList = transitsHistory.filter(e => !(
    transitsCurrentEntry && e.day === transitsCurrentEntry.day && e.locationName === transitsCurrentEntry.locationName
  ));

  // What the panel actually renders: the live slot (untouched, exactly as
  // before) unless the user clicked a specific past entry in the list.
  const transitsViewingHistoryEntry = historyViewOverride
    ? transitsHistory.find(e => e.cacheKey === historyViewOverride) ?? null
    : null;
  const transitsViewingHistoryText = transitsViewingHistoryEntry
    ? localStorage.getItem(transitsViewingHistoryEntry.cacheKey)
    : null;
  const transitsPanelAnalysis = transitsViewingHistoryEntry ? transitsViewingHistoryText : transitsAnalysis;
  const transitsPanelAnalysisDate = transitsViewingHistoryEntry ? transitsViewingHistoryEntry.day : transitsAnalysisDate;
  const transitsPanelAnalysisLocation = transitsViewingHistoryEntry ? transitsViewingHistoryEntry.locationName : transitsDisplayLocation;
  const transitsPanelReady = transitsViewingHistoryEntry ? true : transitsReady;
  const transitsPanelLoading = transitsViewingHistoryEntry ? false : transitsLoading;
  const transitsPanelPhase: StreamPhase = transitsViewingHistoryEntry ? 'done' : transitsStream.phase;
  const transitsPanelDisplayedText = transitsViewingHistoryEntry ? (transitsPanelAnalysis ?? '') : transitsStream.displayedText;

  // Every "an analysis is being generated right now" condition on this page.
  // Each line is the exact condition its own spinner already uses, so the
  // wheel's alive state (glow pulse + drag-to-spin) turns on and off in sync
  // with them. Deliberately NOT scoped to the open tab: if the transits
  // stream is running while the user is on the natal tab, generation really
  // is happening (see plans/live-sky-panels-parity.md, D1).
  const natalWaiting = analysisLoading && streamPhase !== 'typing' && !fullAnalysis;
  const progressionsWaiting = progressionsLoading && progressionsStream.phase !== 'typing'
    && !(chartDataForAnalysis?.type === 'synastry' ? progressedSynastryAnalysis : progressionsAnalysis);
  const transitsWaiting = transitsPanelLoading && transitsPanelPhase !== 'typing' && !transitsPanelAnalysis;
  const wheelAlive = natalWaiting || progressionsWaiting || transitsWaiting;
  // The planet table / lunar phase cards below the text — same live-vs-
  // browsing split as the analysis text above, but for the raw positions
  // (transits_positions|... written by persistTransitsResult, see the
  // "а записывать в локал сторедж вместе с анализом?" fix). Entries saved
  // before this existed just won't have a table when browsed — data stays
  // null, TransitsPanel already renders nothing for that case.
  let transitsPanelData = transitsData;
  if (transitsViewingHistoryEntry) {
    transitsPanelData = null;
    if (transitsViewingHistoryEntry.dataKey) {
      const raw = localStorage.getItem(transitsViewingHistoryEntry.dataKey);
      if (raw) {
        try {
          transitsPanelData = JSON.parse(raw);
        } catch {
          // stale/corrupt — leave as null, same as "never saved"
        }
      }
    }
  }

  useEffect(() => {
    if (!showProgressions) return;
    setProgressionsAnalysis(null);
    setProgressedSynastryAnalysis(null);
    loadProgressions(analysisMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisMode]);

  useEffect(() => {
    if (analysisTab !== 'transits') return;
    setTransitsAnalysis(null);
    setTransitsReady(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisMode]);

  useEffect(() => {
    if (analysisTab !== 'transits') return;
    if (!transitsLocation) return;
    loadTransitsData(transitsDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitsLocation]);

  // Returning to the Транзити tab while a background analysis from a
  // previous visit is still running (see the pendingKey writes in
  // runTransitsAnalysis) restores the params it was started with — city and
  // date don't survive a remount on their own — so the effect below can
  // rebuild the exact same registryKey and reconnect (spinner + typewriter)
  // instead of showing a blank, seemingly idle form.
  useEffect(() => {
    if (analysisTab !== 'transits') return;
    if (!savedChartId) return;
    const pendingKey = `transits_pending|${savedChartId}`;
    const raw = localStorage.getItem(pendingKey);
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as { day: string; mode: string; location: Location | null; registryKey: string };
      if (!isInFlight(pending.registryKey)) {
        // Stale marker left over from a crash/interrupted cleanup — nothing
        // to reconnect to.
        localStorage.removeItem(pendingKey);
        return;
      }
      transitsReconnectRef.current = { day: pending.day, mode: pending.mode, location: pending.location };
      setTransitsDate(pending.day);
      setTransitsLocation(pending.location);
    } catch {
      localStorage.removeItem(pendingKey);
    }
  }, [analysisTab, savedChartId]);

  // Fires once transitsDate/transitsLocation actually reflect what the
  // effect above just restored (state updates land on the NEXT render, so
  // calling runTransitsAnalysis directly from that effect would close over
  // the stale pre-restore values and rebuild the wrong registryKey). Until
  // then this is a no-op on every render.
  useEffect(() => {
    const pending = transitsReconnectRef.current;
    if (!pending) return;
    const locationMatches = JSON.stringify(transitsLocation) === JSON.stringify(pending.location);
    if (transitsDate !== pending.day || !locationMatches) return;
    transitsReconnectRef.current = null;
    runTransitsAnalysis(pending.day, pending.mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitsLocation, transitsDate]);

  const sendChatMessage = useCallback(async () => {
    if (chatLoading) return;
    if (!chatInput.trim() || !chartDataForAnalysis || !fullAnalysis || !savedChartId || !user) return;

    const chartIdAtSend = Number(savedChartId);
    const userId = user.id;
    const registryKey = `chat:${chartIdAtSend}`;

    const questionText = chatInput.trim();
    const currentHistory = [...chatHistory];
    const userMessage = { role: 'user' as const, content: questionText };
    setChatHistory(prev => [...prev, userMessage]);
    chartsApi.appendChatMessages(chartIdAtSend, userId, [userMessage]).catch(err => {
      console.error('Failed to save chat message:', err);
    });
    setChatInput('');

    setPendingChatCharts(prev => new Set(prev).add(chartIdAtSend));

    const chatPayload = {
      question: questionText,
      chart_data: chartDataForAnalysis as unknown as Record<string, unknown>,
      summary: fullAnalysis,
      chat_history: currentHistory,
      language: i18n.language || 'ru'
    };

    const finishPending = () => {
      clearStreamText(registryKey);
      clearInFlight(registryKey);
      setPendingChatCharts(prev => {
        const next = new Set(prev);
        next.delete(chartIdAtSend);
        return next;
      });
    };

    // Defensive: a buffer left over from an earlier request that never
    // reached finishPending() (see the onFinal comment below) must not
    // bleed into this new question's deltas.
    clearStreamText(registryKey);
    markInFlight(registryKey);
    chatStream.reset();

    await streamChatAnalysis(
      chatPayload,
      {
        onStage: chatStream.handleStage,
        onDelta: (text: string) => {
          // Kept for a remounted instance to replay — see loadChatForChart's
          // isInFlight branch above and streamTextRegistry.ts.
          appendStreamText(registryKey, text);
          chatStream.handleDelta(text);
        },
        onFinal: (result) => {
          // Cosmetic only — keeps the on-screen typewriter animating to the
          // end. Do NOT hang persistence off chatStream's onDone: that only
          // fires once the typewriter visually catches up via a setInterval
          // inside a useEffect, and that effect is cancelled the instant
          // this component unmounts (leaving the chart before the answer
          // finished typing) — it never runs again, so the answer never
          // got saved and finishPending() never cleared the registry.
          // Save + clear the instant the real result is known instead,
          // same as runFullAnalysisStream's onFinal above.
          chatStream.handleFinal(result.answer);

          const botMessage = {
            role: 'assistant' as const,
            content: result.answer || t('dashboard.chat.noAnswer'),
            relevant_chunks: result.relevant_chunks || []
          };
          chartsApi.appendChatMessages(chartIdAtSend, userId, [botMessage]).catch(err => {
            console.error('Failed to save chat message:', err);
          });
          if (Number(savedChartIdRef.current) === chartIdAtSend) {
            setChatHistory(prev => [...prev, botMessage]);
          }
          finishPending();
        },
        onError: async (detail) => {
          if (!chatStream.hasDelta()) {
            try {
              const response = await astrologyAPI.chatAnalysis(chatPayload);
              const botMessage = {
                role: 'assistant' as const,
                content: (response as { data?: { answer?: string; relevant_chunks?: unknown[] } })?.data?.answer || t('dashboard.chat.noAnswer'),
                relevant_chunks: (response as { data?: { relevant_chunks?: unknown[] } })?.data?.relevant_chunks || []
              };
              chartsApi.appendChatMessages(chartIdAtSend, userId, [botMessage]).catch(err => {
                console.error('Failed to save chat message:', err);
              });
              if (Number(savedChartIdRef.current) === chartIdAtSend) {
                setChatHistory(prev => [...prev, botMessage]);
              }
            } catch (error) {
              if (Number(savedChartIdRef.current) === chartIdAtSend) {
                setChatHistory(prev => [...prev, {
                  role: 'assistant' as const,
                  content: t('dashboard.chat.errorWithDetails', { error: (error as Error).message })
                }]);
              }
            } finally {
              finishPending();
            }
            return;
          }
          chatStream.handleError();
          if (Number(savedChartIdRef.current) === chartIdAtSend) {
            setChatHistory(prev => [...prev, {
              role: 'assistant' as const,
              content: t('dashboard.chat.errorWithDetails', { error: detail })
            }]);
          }
          finishPending();
        },
      }
    );
  }, [chatInput, chatLoading, chartDataForAnalysis, fullAnalysis, savedChartId, chatHistory, user, t, chatStream]);

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

  useEffect(() => {
    if (fullAnalysis && !savedChartId) {
      localStorage.setItem('pendingAnalysisResult', fullAnalysis);
    }
  }, [fullAnalysis, savedChartId]);

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
      localStorage.removeItem('pendingAnalysisJob');
      localStorage.removeItem('pendingAnalysisResult');
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

      if (chatHistory.length > 0) {
        try {
          await chartsApi.saveChatMessages(Number(saved.id), user.id, chatHistory);
        } catch (err) {
          console.error('Failed to save chat history:', err);
        }
      }

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
    // Card key is the raw (untranslated) planet name. Each click only works
    // with its own planetLiveStreams[planetKey] cell — parallel clicks on
    // other planets don't interfere with each other, nothing gets cancelled.
    const planetKey = planetData.name ?? '';
    const planetName = t('planets.names.' + planetData.name);
    setSelectedPlanet({ ...planetData, name: planetName });
    setSelectedPlanetKey(planetKey);
    selectedPlanetKeyRef.current = planetKey;

    const chartId = typeof savedChartId === 'number' ? savedChartId : (savedChartId ? parseInt(String(savedChartId), 10) : null);
    // Survives a Dashboard remount (leaving this chart and coming back) —
    // see inFlightRegistry.ts. planetInFlightRef alone only protects within
    // the current mount.
    const registryKey = `planet:${chartId}:${planetKey}`;

    // A repeat click on this same planet while its request is already in
    // flight (within this same mount) doesn't start a new one — it just
    // reopens the card on the current progress.
    if (planetInFlightRef.current[planetKey]) return;

    const storageKey = chartId ? `planetAnalysis_${chartId}_${planetData.name}_${analysisMode}` : null;

    if (isInFlight(registryKey)) {
      // Blocked because a background request from a previous visit to this
      // chart is still running — poll until it clears, then check the cache
      // ONCE. Do NOT re-run handlePlanetClick itself: the clear could be
      // from a failure just as easily as a success, and blindly retrying
      // would silently fire another real generation on every failure
      // instead of surfacing it.
      setPlanetAnalysis(null);
      setPlanetAnalysisError('');
      setPlanetAnalysisLoading(true);
      waitForClear(registryKey, () => {
        const result = storageKey ? localStorage.getItem(storageKey) : null;
        if (result) {
          setPlanetAnalysis(result);
        } else {
          setPlanetAnalysisError('Failed to load planet analysis');
        }
        setPlanetAnalysisLoading(false);
      }, {
        onTimeout: () => {
          setPlanetAnalysisLoading(false);
          setPlanetAnalysisError('Failed to load planet analysis');
        },
      });
      return;
    }

    setPlanetAnalysis(null);
    setPlanetAnalysisError('');
    setPlanetAnalysisLoading(true);

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

    planetInFlightRef.current[planetKey] = true;
    markInFlight(registryKey);

    const planetPayload = {
      planet: planetData.name ?? '',
      sign: planetData.sign,
      degree: planetData.degree,
      house: planetData.house,
      house_sign: planetData.house_sign,
      aspects: planetData.aspects,
      is_retrograde: planetData.is_retrograde,
      language: i18n.language
    };

    const persistPlanetAnalysis = (analysis: string) => {
      if (storageKey) {
        localStorage.setItem(storageKey, analysis);
      }
      if (chartId) {
        chartsApi.savePlanetAnalysis(chartId, planetData.name ?? '', analysis)
          .catch(err => console.error('DB save error:', err));
      }
    };

    const reportPlanetError = (err: unknown) => {
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
    };

    // Generation number for this specific call for planetKey — if the card was
    // closed and reopened before the response came back, the new call gets a
    // higher generation, and the old call's callbacks stop writing to the
    // live cell/visible state.
    const myGeneration = (planetGenerationRef.current[planetKey] ?? 0) + 1;
    planetGenerationRef.current[planetKey] = myGeneration;
    const isCurrentGeneration = () => planetGenerationRef.current[planetKey] === myGeneration;
    const isStillOpen = () => isCurrentGeneration() && selectedPlanetKeyRef.current === planetKey;
    const clearLive = () => {
      if (!isCurrentGeneration()) return;
      setPlanetLiveStreams(prev => {
        if (!(planetKey in prev)) return prev;
        const next = { ...prev };
        delete next[planetKey];
        return next;
      });
    };

    let accumulated = '';
    await streamPlanetAnalysis(
      { ...planetPayload, mode: analysisMode },
      {
        onStage: (stage) => {
          if (!isCurrentGeneration()) return;
          setPlanetLiveStreams(prev => {
            const cur = prev[planetKey];
            if (cur?.phase === 'typing') return prev;
            return { ...prev, [planetKey]: { phase: stage === 'generating' ? 'generating' : 'searching', text: cur?.text ?? '' } };
          });
        },
        onDelta: (text) => {
          accumulated += text;
          if (!isCurrentGeneration()) return;
          setPlanetLiveStreams(prev => ({ ...prev, [planetKey]: { phase: 'typing', text: accumulated } }));
        },
        onFinal: (result) => {
          persistPlanetAnalysis(result.analysis);
          clearLive();
          planetInFlightRef.current[planetKey] = false;
          clearInFlight(registryKey);
          if (isStillOpen()) {
            setPlanetAnalysis(result.analysis);
            setPlanetAnalysisLoading(false);
          }
        },
        onError: async (detail) => {
          if (!accumulated) {
            try {
              const result = await astrologyAPI.getPlanetAnalysis(planetPayload, analysisMode);
              persistPlanetAnalysis(result.analysis);
              if (isStillOpen()) setPlanetAnalysis(result.analysis);
            } catch (err) {
              if (isStillOpen()) reportPlanetError(err);
            } finally {
              clearLive();
              planetInFlightRef.current[planetKey] = false;
              clearInFlight(registryKey);
              if (isStillOpen()) setPlanetAnalysisLoading(false);
            }
            return;
          }
          clearLive();
          planetInFlightRef.current[planetKey] = false;
          clearInFlight(registryKey);
          if (isStillOpen()) {
            setPlanetAnalysisError(detail || 'Failed to load planet analysis');
            setPlanetAnalysisLoading(false);
          }
        },
      }
    );
  };

  const handleClosePlanetAnalysis = () => {
    setSelectedPlanet(null);
    setSelectedPlanetKey(null);
    selectedPlanetKeyRef.current = null;
    setPlanetAnalysis(null);
    setPlanetAnalysisError('');
  };

  const handleAspectClick = async (aspect: AspectData) => {
    // Aspect card key — same as in storageKey. Same idea as with planets: its
    // own cell in aspectLiveStreams per click, nothing gets cancelled.
    const aspectKey = `${aspect.planet1}_${aspect.planet2}_${aspect.aspect}`;
    setSelectedAspect(aspect);
    setSelectedAspectKey(aspectKey);
    selectedAspectKeyRef.current = aspectKey;

    // Survives a Dashboard remount (leaving this chart and coming back) —
    // see inFlightRegistry.ts. aspectInFlightRef alone only protects within
    // the current mount.
    const registryKey = `aspect:${savedChartId}:${aspectKey}`;

    // A repeat click on this same aspect while its request is already in
    // flight (within this same mount) doesn't start a new one — it just
    // reopens the card on the current progress.
    if (aspectInFlightRef.current[aspectKey]) return;

    const storageKey = `aspectAnalysis_${aspect.planet1}_${aspect.planet2}_${aspect.aspect}_${analysisMode}`;

    if (isInFlight(registryKey)) {
      // Blocked because a background request from a previous visit to this
      // chart is still running — poll until it clears, then check the cache
      // ONCE. Do NOT re-run handleAspectClick itself: the clear could be
      // from a failure just as easily as a success, and blindly retrying
      // would silently fire another real generation on every failure
      // instead of surfacing it.
      setAspectAnalysis(null);
      setAspectError('');
      setAspectLoading(true);
      waitForClear(registryKey, () => {
        const result = localStorage.getItem(storageKey);
        if (result) {
          setAspectAnalysis(result);
        } else {
          setAspectError(t('analysis.error'));
        }
        setAspectLoading(false);
      }, {
        onTimeout: () => {
          setAspectLoading(false);
          setAspectError(t('analysis.error'));
        },
      });
      return;
    }

    setAspectLoading(true);
    setAspectError('');

    const savedAnalysis = localStorage.getItem(storageKey);
    if (savedAnalysis) {
      setAspectAnalysis(savedAnalysis);
      setAspectLoading(false);
      return;
    }

    aspectInFlightRef.current[aspectKey] = true;
    markInFlight(registryKey);
    setAspectAnalysis(null);

    const aspectPayload = {
      planet1: aspect.planet1 ?? '',
      planet2: aspect.planet2 ?? '',
      aspect_name: aspect.aspect ?? '',
      aspect_name_ru: aspect.aspect_ru || aspect.aspect,
      orb: aspect.orb,
      language: i18n.language
    };

    const reportAspectError = (err: unknown) => {
      const errorDetail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      if (typeof errorDetail === 'string') {
        setAspectError(errorDetail);
      } else if (Array.isArray(errorDetail)) {
        setAspectError(errorDetail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(', '));
      } else {
        setAspectError(t('analysis.error'));
      }
    };

    const myGeneration = (aspectGenerationRef.current[aspectKey] ?? 0) + 1;
    aspectGenerationRef.current[aspectKey] = myGeneration;
    const isCurrentGeneration = () => aspectGenerationRef.current[aspectKey] === myGeneration;
    const isStillOpen = () => isCurrentGeneration() && selectedAspectKeyRef.current === aspectKey;
    const clearLive = () => {
      if (!isCurrentGeneration()) return;
      setAspectLiveStreams(prev => {
        if (!(aspectKey in prev)) return prev;
        const next = { ...prev };
        delete next[aspectKey];
        return next;
      });
    };

    let accumulated = '';
    await streamSynastryAspectAnalysis(
      { ...aspectPayload, mode: analysisMode },
      {
        onStage: (stage) => {
          if (!isCurrentGeneration()) return;
          setAspectLiveStreams(prev => {
            const cur = prev[aspectKey];
            if (cur?.phase === 'typing') return prev;
            return { ...prev, [aspectKey]: { phase: stage === 'generating' ? 'generating' : 'searching', text: cur?.text ?? '' } };
          });
        },
        onDelta: (text) => {
          accumulated += text;
          if (!isCurrentGeneration()) return;
          setAspectLiveStreams(prev => ({ ...prev, [aspectKey]: { phase: 'typing', text: accumulated } }));
        },
        onFinal: (result) => {
          localStorage.setItem(storageKey, result.analysis);
          clearLive();
          aspectInFlightRef.current[aspectKey] = false;
          clearInFlight(registryKey);
          if (isStillOpen()) {
            setAspectAnalysis(result.analysis);
            setAspectLoading(false);
          }
        },
        onError: async (detail) => {
          if (!accumulated) {
            try {
              const result = await astrologyAPI.getSynastryAspectAnalysis(aspectPayload, analysisMode);
              localStorage.setItem(storageKey, result.analysis);
              if (isStillOpen()) setAspectAnalysis(result.analysis);
            } catch (err) {
              if (isStillOpen()) reportAspectError(err);
            } finally {
              clearLive();
              aspectInFlightRef.current[aspectKey] = false;
              clearInFlight(registryKey);
              if (isStillOpen()) setAspectLoading(false);
            }
            return;
          }
          clearLive();
          aspectInFlightRef.current[aspectKey] = false;
          clearInFlight(registryKey);
          if (isStillOpen()) {
            setAspectError(detail || t('analysis.error'));
            setAspectLoading(false);
          }
        },
      }
    );
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
        // Chat: clear + load the selected chart's history from the DB
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

  const hasUnsavedAnalysis = (analysisLoading || !!fullAnalysis) && !savedChartId;

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
                      localStorage.removeItem('pendingAnalysisResult');
                      pendingModeRef.current = val;
                      setFullAnalysis(null);
                      setShowFullAnalysis(true);
                    }}
                    disabled={analysisLoading}
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
                          localStorage.removeItem('pendingAnalysisResult');
                          pendingModeRef.current = val;
                          setFullAnalysis(null);
                        }
                      }}
                      disabled={analysisLoading || progressionsLoading}
                    />
                  </div>

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
                        <LiveSkyFrame active={wheelAlive}>
                          <SynastryChartComponent
                            chart1={chartDataForAnalysis.chart1}
                            chart2={chartDataForAnalysis.chart2}
                            aspects={chartDataForAnalysis.aspects as unknown as Aspect[] | undefined}
                            size={560}
                            name1={chartDataForAnalysis.person1_name}
                            name2={chartDataForAnalysis.person2_name}
                          />
                        </LiveSkyFrame>
                      </div>
                    </div>
                  )}

                  {chartDataForAnalysis
                    && chartDataForAnalysis.type !== 'synastry'
                    && chartDataForAnalysis.planets
                    && chartDataForAnalysis.houses && (
                    <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center' }}>
                      <LiveSkyFrame active={wheelAlive}>
                        <AstroChartComponent
                          chartData={{
                            planets: chartDataForAnalysis.planets,
                            houses: chartDataForAnalysis.houses,
                            vertex: (chartDataForAnalysis.houses_meta as { vertex?: { longitude: number } } | undefined)?.vertex,
                            houses_meta: chartDataForAnalysis.houses_meta as { pars_fortuna?: { longitude: number } } | undefined,
                          }}
                          size={560}
                        />
                      </LiveSkyFrame>
                    </div>
                  )}
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

                  {!showPlanetTable && (
                    <AnalysisTabs
                      active={analysisTab}
                      firstTabLabel={chartDataForAnalysis?.type === 'synastry' ? t('dashboard.tabs.synastryMain') : undefined}
                      showProgressions={!!(savedChartId && fullAnalysis)}
                      showTransits={!!(savedChartId && fullAnalysis && chartDataForAnalysis?.type !== 'synastry')}
                      // v1.2: daily forecast temporarily hidden from the natal chart, do not delete
                      // showDailyForecast={!!(savedChartId && fullAnalysis && chartDataForAnalysis?.type !== 'synastry')}
                      showDailyForecast={false}
                      onChange={(tab) => {
                        setAnalysisTab(tab);
                        setShowProgressions(tab === 'progressions');
                        const hasProgressionsData = chartDataForAnalysis?.type === 'synastry'
                          ? !!progressedSynastryData
                          : !!progressionsData;
                        if (tab === 'progressions' && !hasProgressionsData) {
                          loadProgressions();
                        }
                        if (tab === 'transits' && !transitsData) {
                          loadTransitsData(transitsDate, { keepAnalysis: transitsReady });
                        }
                      }}
                    />
                  )}

                  {analysisTab === 'progressions' && !showPlanetTable && savedChartId && (
                    <div id="progressions-section">
                      {chartDataForAnalysis?.type === 'synastry' ? (
                        <ProgressedSynastryPanel
                          data={progressedSynastryData}
                          analysis={progressedSynastryAnalysis}
                          displayedText={progressionsStream.displayedText}
                          phase={progressionsStream.phase}
                          loading={progressionsLoading}
                          error={progressionsError}
                          name1={chartDataForAnalysis.person1_name}
                          name2={chartDataForAnalysis.person2_name}
                        />
                      ) : (
                        <ProgressionsPanel
                          data={progressionsData}
                          analysis={progressionsAnalysis}
                          displayedText={progressionsStream.displayedText}
                          phase={progressionsStream.phase}
                          loading={progressionsLoading}
                          error={progressionsError}
                        />
                      )}
                    </div>
                  )}

                  {analysisTab === 'transits' && !showPlanetTable && savedChartId && (
                    <div id="transits-section">
                      <TransitsPanel
                        data={transitsPanelData}
                        analysis={transitsPanelAnalysis}
                        transitsReady={transitsPanelReady}
                        displayedText={transitsPanelDisplayedText}
                        phase={transitsPanelPhase}
                        loading={transitsPanelLoading}
                        error={transitsError}
                        selectedDate={transitsDate}
                        onDateChange={handleTransitsDateChange}
                        onLocationChange={setTransitsLocation}
                        transitsLocation={transitsLocation}
                        birthPlace={chartDataForAnalysis?.meta?.birth_place}
                        analysisLocation={transitsPanelAnalysisLocation}
                        analysisDate={transitsPanelAnalysisDate}
                        onRunAnalysis={() => { setHistoryViewOverride(null); runTransitsAnalysis(); }}
                        transitsRemaining={transitsRemaining}
                        transitsLimit={MAX_TRANSITS_ANALYSIS_PER_DAY}
                        generationLocked={transitsGenerationLocked}
                        history={transitsHistoryForList}
                        viewingCacheKey={historyViewOverride}
                        onSelectHistoryEntry={handleSelectTransitsHistoryEntry}
                        currentEntry={transitsCurrentEntry}
                        onSelectCurrent={() => setHistoryViewOverride(null)}
                      />
                    </div>
                  )}

                  {/* v1.2: daily forecast temporarily hidden from the natal chart, do not delete
                  {analysisTab === 'dailyForecast' && !showPlanetTable && savedChartId && (
                    <div id="daily-forecast-section">
                      <DailyForecastPanel natalChart={chartDataForAnalysis} />
                    </div>
                  )}
                  */}

                  {!showPlanetTable && analysisTab === 'natal' && (
                    <>
                      {analysisLoading && streamPhase !== 'typing' && !fullAnalysis && (
                        <div style={{ marginTop: '40px' }}>
                          <ProcessingMessage
                            title={streamPhase === 'generating' ? t('dashboard.fullAnalysis.generating') : t('dashboard.fullAnalysis.searching')}
                            phase={streamPhase === 'generating' ? 'generating' : 'searching'}
                            intro={t('liveSky.greeting')}
                          />
                          <LiveSkyCarousel
                            people={chartDataForAnalysis?.type === 'synastry'
                              ? [
                                { label: chartDataForAnalysis.person1_name, planets: chartDataForAnalysis.chart1?.planets ?? {} },
                                { label: chartDataForAnalysis.person2_name, planets: chartDataForAnalysis.chart2?.planets ?? {} },
                              ]
                              : chartDataForAnalysis?.planets
                                ? [{ planets: chartDataForAnalysis.planets }]
                                : []}
                          />
                        </div>
                      )}

                      {analysisError && (
                        <div className="error-message" style={{ marginTop: '20px' }}>
                          {analysisError}
                        </div>
                      )}

                      {(fullAnalysis || streamPhase === 'typing') && (
                        <div style={{ marginTop: '40px', lineHeight: '2', fontSize: '16px' }}>
                          {!savedChartId && !analysisLoading && (
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                              <button className="btn btn-primary" onClick={handleSaveChartWithAnalysis} disabled={saving}>
                                {saving ? '...' : t('dashboard.actions.save')}
                              </button>
                            </div>
                          )}
                          <MarkdownContent content={fullAnalysis ?? displayedText} />
                          {!fullAnalysis && streamPhase === 'typing' && (
                            <span className="typing-cursor" aria-hidden="true">▍</span>
                          )}

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
                                        {chatLoading && chatStream.phase === 'typing' && (
                                          <div style={{ marginBottom: '15px', padding: '10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                                            <strong style={{ color: '#2196F3', marginRight: '10px' }}>
                                              {t('dashboard.chat.assistant')}
                                            </strong>
                                            <div className="chat-message-content">
                                              <MarkdownContent content={chatStream.displayedText} />
                                              <span className="typing-cursor" aria-hidden="true">▍</span>
                                            </div>
                                          </div>
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
                          displayedText={(selectedAspectKey && aspectLiveStreams[selectedAspectKey]?.text) || ''}
                          phase={(selectedAspectKey && aspectLiveStreams[selectedAspectKey]?.phase) || 'idle'}
                          isOpen={!!selectedAspect}
                          onClose={() => {
                            setSelectedAspect(null);
                            setSelectedAspectKey(null);
                            selectedAspectKeyRef.current = null;
                          }}
                          loading={aspectLoading}
                          error={aspectError}
                        />
                      ) : (
                        <PlanetAnalysisModal
                          planet={selectedPlanet ?? undefined}
                          analysis={planetAnalysis}
                          displayedText={(selectedPlanetKey && planetLiveStreams[selectedPlanetKey]?.text) || ''}
                          phase={(selectedPlanetKey && planetLiveStreams[selectedPlanetKey]?.phase) || 'idle'}
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
        showSave={!!fullAnalysis}
        title={analysisLoading && !fullAnalysis ? t('unsavedModal.processingTitle') : undefined}
        message={analysisLoading && !fullAnalysis ? t('unsavedModal.processingMessage') : undefined}
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