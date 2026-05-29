import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { astrologyAPI } from '../services/api';
import { chartsApi } from '../services/chartsApi';
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
import AspectAnalysisModal from '../components/AspectAnalysisModal';
import AnalysisModeToggle from '../components/AnalysisModeToggle';
import RelationshipTypesBar from '../components/RelationshipTypesBar';
import { loadChatHistory, saveChatHistory, isNearLimit, isAtLimit, MAX_MESSAGES, type ChatMessage } from '../services/chatStorage';

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
    [key: string]: unknown;
  };
  chart2?: {
    birth_date?: string;
    birth_place?: string;
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

interface RelationshipTypesData {
  dominant_type?: string;
  relationship_types?: {
    [key: string]: { percentage?: number; label?: string; description?: string };
  };
  [key: string]: unknown;
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
  const [saving, setSaving] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<string>(() => {
    return location.state?.analysisMode
      || localStorage.getItem('dashboardAnalysisMode')
      || 'simple';
  });

  const pendingModeRef = useRef<string | null>(null);
  const [savedChartId, setSavedChartId] = useState<string | number | null>(() => {
    const saved = localStorage.getItem('savedChartId');
    return saved ? parseInt(saved, 10) : null;
  });
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
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
    setShowPlanetTable(prev => !prev);
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
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipTypesData | null>(null);
  const [relationshipTypesLoading, setRelationshipTypesLoading] = useState(false);

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
    const state = location.state;

    if (state?.showFullAnalysis && state?.chartDataForAnalysis) {
      setFullAnalysis(null);
      setSimpleAnalysis(null);
      setAdvancedAnalysis(null);
      setSavedChartId(null);
      localStorage.removeItem('savedFullAnalysis');
      localStorage.removeItem('savedFullAnalysis_simple');
      localStorage.removeItem('savedFullAnalysis_advanced');
      localStorage.removeItem('savedChartId');
      setShowFullAnalysis(true);
      setChartDataForAnalysis(state.chartDataForAnalysis);
    }
  }, [location.state]);

  useEffect(() => {
    if (!chartIdFromUrl) return;

    const loadChartFromUrl = async () => {
      setChartLoading(true);
      try {
        const chartId = parseInt(chartIdFromUrl, 10);
        if (isNaN(chartId)) return;
        const chart = await chartsApi.getChart(chartId);
        setChartDataForAnalysis(chart.chart_data ?? null);
        setChatVisible(false);
        setChatHistory(loadChatHistory(chart.id));
        setChatInput('');

        const isSynastry = chart.chart_data?.type === 'synastry';

        const interp = chart.chart_interpretations?.find(
          (i: { type?: string; interpretation?: string }) => i.type === (isSynastry ? `synastry_${analysisMode}` : `full_${analysisMode}`)
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

        if (!isSynastry) {
          const planetAnalyses = await chartsApi.getPlanetAnalyses(Number(chart.id));
          planetAnalyses.forEach((pa: PlanetAnalysisResponse) => {
            if (pa.name) {
              localStorage.setItem(`planetAnalysis_${chart.id}_${pa.name}`, pa.interpretation ?? '');
            }
          });
        }
      } catch (error) {
        console.error('Failed to load chart from URL:', error);
      } finally {
        setChartLoading(false);
      }
    };

    loadChartFromUrl();
  }, [chartIdFromUrl]);

  const loadFullAnalysis = useCallback(async (mode = analysisMode) => {
    if (!chartDataForAnalysis) return;
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
      let result;

      if (chartDataForAnalysis.type === 'synastry') {
        result = await astrologyAPI.getFullSynastryAnalysis(
          {
            chart1: chartDataForAnalysis.chart1,
            chart2: chartDataForAnalysis.chart2,
            aspects: chartDataForAnalysis.aspects,
            overlays: chartDataForAnalysis.overlays
          },
          i18n.language,
          5,
          mode
        );
      } else {
        result = await astrologyAPI.getFullChartAnalysis(
          chartDataForAnalysis,
          i18n.language,
          5,
          mode
        );
      }

      setFullAnalysis(result.analysis);
      if (mode === 'simple') setSimpleAnalysis(result.analysis);
      else setAdvancedAnalysis(result.analysis);
      const currentChartId = parseInt(localStorage.getItem('savedChartId') || '0', 10) || null;
      if (currentChartId) {
        localStorage.setItem(`savedFullAnalysis_${currentChartId}_${mode}`, result.analysis);
      }
      if (currentChartId) {
        const isSynastry = chartDataForAnalysis.type === 'synastry';
        const type = isSynastry ? `synastry_${mode}` : `full_${mode}`;
        chartsApi.saveInterpretation(currentChartId, type, result.analysis)
          .catch(() => {});
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
    }
  }, [chartDataForAnalysis, t, analysisMode, simpleAnalysis, advancedAnalysis]);

  const sendChatMessage = useCallback(async () => {
    if (chatLoading) return;
    if (!chatInput.trim() || !chartDataForAnalysis || !fullAnalysis || !savedChartId) return;

    const questionText = chatInput.trim();
    const currentHistory = [...chatHistory];
    const userMessage = { role: 'user' as const, content: questionText };

    setChatHistory(prev => {
      const updated = [...prev, userMessage];
      saveChatHistory(savedChartId, updated);
      return updated;
    });
    setChatInput('');

    setChatLoading(true);
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
      setChatHistory(prev => {
        const updated = [...prev, botMessage];
        saveChatHistory(savedChartId, updated);
        return updated;
      });
    } catch (error) {
      setChatHistory(prev => [...prev, {
        role: 'assistant' as const,
        content: t('dashboard.chat.errorWithDetails', { error: (error as Error).message })
      }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, chartDataForAnalysis, fullAnalysis, savedChartId, chatHistory, t]);

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
    setRelationshipTypes(null);
  }, [savedChartId]);

  useEffect(() => {
    if (chartDataForAnalysis?.type === 'synastry' && fullAnalysis && savedChartId && !relationshipTypes) {
      const storageKey = `relationshipTypes_${savedChartId}`;
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        try {
          setRelationshipTypes(JSON.parse(cached));
          return;
        } catch { }
      }
      const loadRelationshipTypes = async () => {
        setRelationshipTypesLoading(true);
        try {
          const result = await astrologyAPI.getRelationshipTypes(fullAnalysis, i18n.language);
          console.log('Relationship Types Response:', result);
          setRelationshipTypes(result);
          localStorage.setItem(storageKey, JSON.stringify(result));
        } catch (err) {
          console.error('Failed to load relationship types:', err);
        } finally {
          setRelationshipTypesLoading(false);
        }
      };
      loadRelationshipTypes();
    }
  }, [chartDataForAnalysis, fullAnalysis, relationshipTypes, savedChartId, i18n.language]);

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
      localStorage.setItem('savedChartId', String(saved.id));

      if (isSynastry && relationshipTypes) {
        try {
          await chartsApi.saveRelationshipTypes(saved.id, relationshipTypes);
        } catch (err) {
          console.error('Failed to save relationship types to DB:', err);
        }
      }

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
      localStorage.setItem('savedChartId', saved.id.toString());

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
    localStorage.removeItem('savedChartData');
    localStorage.removeItem('chartDataForAnalysis');
    localStorage.removeItem('savedFullAnalysis');
    localStorage.removeItem('savedFullAnalysis_simple');
    localStorage.removeItem('savedFullAnalysis_advanced');
    localStorage.removeItem('savedChartId');
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
    setChartDataForAnalysis(chart.chart_data ?? null);
    setChatVisible(false);
    setChatHistory(loadChatHistory(chart.id));
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
    setSavedChartId(chart.id);

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

  return (
    <div className="dashboard">
      <Header />

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
                      onClick={() => navigate(`/${currentLang}/`)}
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
                      onClick={() => navigate(`/${currentLang}/synastry`)}
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

                  {chartDataForAnalysis?.type === 'synastry' && fullAnalysis && relationshipTypes && !relationshipTypesLoading && (
                    <div style={{ marginTop: '30px', marginBottom: '20px' }}>
                      <RelationshipTypesBar
                        data={relationshipTypes?.relationship_types || {}}
                        dominantType={relationshipTypes?.dominant_type}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
                    {savedChartId && fullAnalysis && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowPlanetTable(false);
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
    </div>
  );
};

export default Dashboard;