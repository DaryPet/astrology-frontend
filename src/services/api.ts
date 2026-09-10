import axios from 'axios';
import i18n from '../i18n';
import { supabase } from '../lib/supabase';

const api = axios.create({
  baseURL: '/api',
  timeout: 360000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach the Supabase token: protected endpoints (chat, progressions, analysis)
// require Authorization: Bearer (see get_current_user on the backend).
// Read it from the live Supabase session (which refreshes itself), not from a
// hand-made localStorage copy — that copy can go stale or out of sync.
api.interceptors.request.use(async (config) => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Fall through without token — let the backend reject if auth is required
  }
  return config;
});

interface LocationInfo {
  timezone?: string;
  lat?: string | number;
  lon?: string | number;
  display_name?: string;
  name?: string;
  [key: string]: unknown;
}

interface ChartData {
  meta?: {
    birth_date?: string;
    birth_place?: string;
  };
  houses_meta?: {
    house_system?: string;
    armc?: number;
    vertex?: { longitude: number; sign?: string; sign_ru?: string; sign_uk?: string; degree?: number; house?: number };
    pars_fortuna?: { longitude: number; sign?: string; sign_ru?: string; sign_uk?: string; degree?: number; house?: number };
  };
  aspects?: unknown[];
  planets?: unknown;
  [key: string]: unknown;
}

interface SynastryData {
  chart1: unknown;
  chart2: unknown;
  aspects: unknown;
  overlays: unknown;
  person1_name?: string;
  person2_name?: string;
  name?: string;
  relationship_context?: string;
  [key: string]: unknown;
}

export interface ProgressedPlanet {
  planet: string;
  sign: string;
  sign_ru?: string; sign_uk?: string;
  degree: number;
  full_degree: number;
  speed?: number;
  is_retrograde?: boolean;
  natal_house?: number | null;
  changed_sign?: boolean;
  natal_sign?: string;
  // natal house of the planet, and whether the progressed planet changed house
  natal_planet_house?: number | null;
  changed_house?: boolean;
  natal_degree?: number;
  // years until the planet changes sign (computed for Sun and Moon)
  years_to_next_sign?: number;
}

export interface ProgressionAspect {
  progressed: string;
  natal: string;
  planet1: string;
  planet2: string;
  aspect: string;
  aspect_ru?: string; aspect_uk?: string;
  orb: number;
  exactness?: number;
  // applying (true) / separating (false)
  applying?: boolean;
  natal_house?: number | null;
  progressed_house?: number | null;
  progressed_sign?: string;
  natal_sign?: string;
}

export interface LunarPhase {
  angle: number;
  phase: string;
  phase_ru?: string; phase_uk?: string;
}

export interface ProgressionsData {
  type: 'progressions';
  method: string;
  period: string;
  age_years: number;
  target_date?: string;
  progressed_planets: Record<string, ProgressedPlanet>;
  lunar_phase?: LunarPhase | null;
  progressed_ascendant?: { sign?: string; sign_ru?: string; sign_uk?: string; degree?: number };
  progressed_mc?: { sign?: string; sign_ru?: string; sign_uk?: string; degree?: number };
  progressed_houses?: Record<string, unknown>;
  aspects_to_natal: ProgressionAspect[];
  natal_summary?: Record<string, string>;
  meta?: Record<string, unknown>;
}

// Aspect shape shared across the frontend (see AspectGrid.Aspect, AspectAnalysisModal.AspectData)
export interface SynastryAspectItem {
  planet1: string;
  planet2: string;
  aspect: string;
  aspect_ru?: string; aspect_uk?: string;
  orb?: number;
  [key: string]: unknown;
}

export interface ProgressedSynastryPerson {
  name?: string;
  age_years: number;
  progressed_planets: Record<string, ProgressedPlanet>;
  progressed_houses?: Record<string, unknown>;
  progressed_ascendant?: { sign?: string; sign_ru?: string; sign_uk?: string; degree?: number };
  lunar_phase?: LunarPhase | null;
  natal_summary?: Record<string, string>;
}

export interface ProgressedSynastryData {
  type: 'progressed_synastry';
  target_date: string;
  period: string;
  person1: ProgressedSynastryPerson;
  person2: ProgressedSynastryPerson;
  progressed_synastry_aspects: SynastryAspectItem[];
  cross_overlay: {
    prog1_to_natal2: SynastryAspectItem[];
    prog2_to_natal1: SynastryAspectItem[];
  };
  dynamics: {
    natal_synastry_aspects: SynastryAspectItem[];
    new_aspects: SynastryAspectItem[];
    faded_aspects: SynastryAspectItem[];
    natal_total: number;
    progressed_total: number;
  };
}

export interface TransitPlanet {
  planet: string;
  sign: string;
  sign_ru?: string; sign_uk?: string;
  degree: number;
  full_degree: number;
  speed?: number;
  is_retrograde?: boolean;
  // natal house the transiting planet moves through — key to the interpretation
  natal_house?: number | null;
  is_slow?: boolean;
  natal_sign?: string;
  natal_planet_house?: number | null;
}

export interface TransitAspect {
  transit: string;
  natal: string;
  planet1: string;
  planet2: string;
  aspect: string;
  aspect_ru?: string; aspect_uk?: string;
  orb: number;
  exactness?: number;
  applying?: boolean;
  is_slow?: boolean;
  is_return?: boolean;
  transit_sign?: string;
  natal_sign?: string;
  natal_house?: number | null;
  transit_house?: number | null;
}

export interface TransitsData {
  type: 'transits';
  period: string; // YYYY-MM-DD
  target_date?: string;
  transit_planets: Record<string, TransitPlanet>;
  lunar_phase?: LunarPhase | null;
  aspects_to_natal: TransitAspect[];
  natal_summary?: Record<string, string>;
  meta?: Record<string, unknown>;
}

// Geocoding API methods
export const geocodeAPI = {
  /**
   * City autocomplete from a partial input
   * @param {string} query - Part of the city name (e.g. "barce")
   * @returns {Promise<Array>} Cities with coordinates and timezone
   */
  autocomplete: async (query: string): Promise<LocationInfo[]> => {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const currentLang = i18n.language || 'en';

    try {
      const response = await api.get(
        `/geocode/autocomplete?q=${encodeURIComponent(query.trim())}&lang=${currentLang}`
      );
      return response.data || [];
    } catch (error) {
      const err = error as Error;
      throw new Error(`Не удалось найти города: ${err.message}`);
    }
  },

  /**
   * Place info by coordinates (reverse geocoding)
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Object>} Place info (address, timezone, etc.)
   */
  getLocationInfo: async (lat: number, lon: number): Promise<LocationInfo> => {
    if (lat == null || lon == null) {
      throw new Error('Координаты не указаны');
    }

    try {
      const response = await api.get(`/geocode/coordinates?lat=${lat}&lon=${lon}`);
      return response.data;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Не удалось определить информацию о месте: ${err.message}`);
    }
  },

  /**
   * Timezone by coordinates (wrapper over getLocationInfo)
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<string>} Timezone in IANA format (e.g. "Europe/Moscow")
   */
  detectTimezone: async (lat: number, lon: number): Promise<string> => {
    try {
      const locationInfo = await geocodeAPI.getLocationInfo(lat, lon);
      return locationInfo.timezone || 'UTC';
    } catch {
      return 'UTC'; // Fallback to UTC when detection fails
    }
  }
};

// Core API methods for astrological calculations
export const astrologyAPI = {
  /**
   * Natal chart calculation
   * @param {Object} data - Calculation input
   * @returns {Promise<Object>} Calculation result
   */
  calculateChart: async (data: ChartData): Promise<ChartData> => {
    try {
      const response = await api.post('/chart/calculate', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Synastry calculation
   * @param {Object} data - Both charts for the synastry
   * @returns {Promise<Object>} Synastry result
   */
  calculateSynastry: async (data: SynastryData): Promise<SynastryData> => {
    try {
      const response = await api.post('/synastry/direct', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPlanetAnalysis: async (planetData: Record<string, unknown>, mode = 'simple') => {
    try {
      const response = await api.post('/analysis/planet', {
        ...planetData,
        mode
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getSynastryAspectAnalysis: async (aspectData: Record<string, unknown>, mode = 'simple') => {
    try {
      const response = await api.post('/synastry/aspect', {
        ...aspectData,
        mode
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getFullChartAnalysis: async (chartData: ChartData, language = 'ru', topBooks = 5, mode = 'simple', options?: { signal?: AbortSignal }) => {
    try {
      const response = await api.post('/analysis/full', {
        chart_data: chartData,
        language,
        top_books: topBooks,
        mode,
        birth_date: chartData.meta?.birth_date || null,
        birth_place: chartData.meta?.birth_place || null
      }, { signal: options?.signal });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getFullSynastryAnalysis: async (synastryData: SynastryData, language = 'ru', topBooks = 5, mode = 'simple', options?: { signal?: AbortSignal }) => {
    try {
      const response = await api.post('/analysis/synastry/full', {
        chart1: synastryData.chart1,
        chart2: synastryData.chart2,
        aspects: synastryData.aspects,
        overlays: synastryData.overlays,
        language,
        top_k_per_book: topBooks,
        mode,
        relationship_context: synastryData.relationship_context
      }, { signal: options?.signal });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getRelationshipTypes: async (fullAnalysis: unknown, language = 'ru') => {
    try {
      const response = await api.post('/synastry/relationship-types', {
        full_analysis: fullAnalysis,
        language,
        stream: false
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Secondary progressions ("a day for a year"). Requires auth —
   * available only for saved charts (same as chat).
   */
  calculateProgressions: async (data: Record<string, unknown>): Promise<ProgressionsData> => {
    const response = await api.post('/progressions', data);
    return response.data;
  },

  /**
   * AI analysis of secondary progressions (RAG over books + LLM).
   * @param payload - { natal_chart, progression_data, language }
   * @param mode - 'simple' | 'advanced'
   */
  getProgressionsAnalysis: async (
    payload: Record<string, unknown>,
    mode = 'simple'
  ): Promise<{ analysis: string; summary?: string; progressions_summary?: Record<string, unknown> }> => {
    const response = await api.post('/analysis/progressions', {
      ...payload,
      mode
    });
    return response.data;
  },

  /**
   * Progressed synastry: progressions of both partners + cross-overlays
   * (one partner's progressions on the other's natal) + period dynamics (new/faded aspects).
   */
  calculateProgressedSynastry: async (data: Record<string, unknown>): Promise<ProgressedSynastryData> => {
    const response = await api.post('/progressed-synastry', data);
    return response.data;
  },

  /**
   * AI analysis of progressed synastry (RAG over books + LLM).
   * @param payload - preferably { progressed_synastry_data: <result of calculateProgressedSynastry>, language }
   * @param mode - 'simple' | 'advanced'
   */
  getProgressedSynastryAnalysis: async (
    payload: Record<string, unknown>,
    mode = 'simple'
  ): Promise<{ analysis: string; summary?: string; progressed_synastry_summary?: Record<string, unknown> }> => {
    const response = await api.post('/analysis/progressed-synastry', {
      ...payload,
      mode
    });
    return response.data;
  },

  /**
   * Transits for a specific day (today by default; any day is allowed).
   * @param data - { birth_date, birth_time, birth_place, latitude, longitude, timezone, target_date? }
   */
  calculateTransits: async (data: Record<string, unknown>): Promise<TransitsData> => {
    const response = await api.post('/transits', data);
    return response.data;
  },

  /**
   * AI analysis of the day's transits (RAG over books + LLM).
   * @param payload - { natal_chart, transit_data, language }
   * @param mode - 'simple' | 'advanced'
   */
  getTransitsAnalysis: async (
    payload: Record<string, unknown>,
    mode = 'advanced'
  ): Promise<{ analysis: string; summary?: string; transits_summary?: Record<string, unknown> }> => {
    const response = await api.post('/analysis/transits', {
      ...payload,
      mode
    });
    return response.data;
  },

  /**
   * Day forecast: score 1-10, category, summary; aspects to planets, angles, Fortune.
   * @param payload - { birth_*, natal_chart, target_date, transit_*, language, llm_provider, llm_model }
   */
  getDailyForecast: async (
    payload: Record<string, unknown>
  ): Promise<Record<string, any>> => {
    const response = await api.post('/daily-forecast', payload);
    return response.data;
  },

  chatAnalysis: async (chatRequest: unknown): Promise<unknown> => {
    try {
      const response = await api.post('/analysis/chat', chatRequest);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default api;