import axios from 'axios';
import i18n from '../i18n';
import { supabase } from '../lib/supabase';

const api = axios.create({
  baseURL: '/api',
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Прикрепляем Supabase-токен: защищённые эндпоинты (chat, progressions, analysis)
// требуют Authorization: Bearer (см. get_current_user на бэкенде).
// Берём токен из живой сессии Supabase (он сам себя рефрешит), а не из ручной
// копии в localStorage — чтобы нельзя было отправить протухший/рассинхронизированный токен.
api.interceptors.request.use(async (config) => {
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
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
    vertex?: { longitude: number; sign?: string; sign_ru?: string; degree?: number; house?: number };
    pars_fortuna?: { longitude: number; sign?: string; sign_ru?: string; degree?: number; house?: number };
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
  sign_ru?: string;
  degree: number;
  full_degree: number;
  speed?: number;
  is_retrograde?: boolean;
  natal_house?: number | null;
  changed_sign?: boolean;
  natal_sign?: string;
  // дом натальной планеты и факт перехода прогрессивной планеты в другой дом
  natal_planet_house?: number | null;
  changed_house?: boolean;
  natal_degree?: number;
  // через сколько лет планета сменит знак (считается для Солнца и Луны)
  years_to_next_sign?: number;
}

export interface ProgressionAspect {
  progressed: string;
  natal: string;
  planet1: string;
  planet2: string;
  aspect: string;
  aspect_ru?: string;
  orb: number;
  exactness?: number;
  // сходящийся (true) / расходящийся (false)
  applying?: boolean;
  natal_house?: number | null;
  progressed_house?: number | null;
  progressed_sign?: string;
  natal_sign?: string;
}

export interface LunarPhase {
  angle: number;
  phase: string;
  phase_ru?: string;
}

export interface ProgressionsData {
  type: 'progressions';
  method: string;
  period: string;
  age_years: number;
  target_date?: string;
  progressed_planets: Record<string, ProgressedPlanet>;
  lunar_phase?: LunarPhase | null;
  progressed_ascendant?: { sign?: string; sign_ru?: string; degree?: number };
  progressed_mc?: { sign?: string; sign_ru?: string; degree?: number };
  progressed_houses?: Record<string, unknown>;
  aspects_to_natal: ProgressionAspect[];
  natal_summary?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export interface TransitPlanet {
  planet: string;
  sign: string;
  sign_ru?: string;
  degree: number;
  full_degree: number;
  speed?: number;
  is_retrograde?: boolean;
  // натальный дом, по которому идёт транзитная планета — ключ интерпретации
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
  aspect_ru?: string;
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

// Геокодинг API методы
export const geocodeAPI = {
  /**
   * Автокомплит городов по частичному вводу
   * @param {string} query - Часть названия города (например, "барс")
   * @returns {Promise<Array>} Список городов с координатами и таймзоной
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
   * Получение информации о месте по координатам (обратное геокодирование)
   * @param {number} lat - Широта
   * @param {number} lon - Долгота
   * @returns {Promise<Object>} Информация о месте (адрес, таймзона и т.д.)
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
   * Определение таймзоны по координатам (обёртка над getLocationInfo)
   * @param {number} lat - Широта
   * @param {number} lon - Долгота
   * @returns {Promise<string>} Таймзона в формате IANA (например, "Europe/Moscow")
   */
  detectTimezone: async (lat: number, lon: number): Promise<string> => {
    try {
      const locationInfo = await geocodeAPI.getLocationInfo(lat, lon);
      return locationInfo.timezone || 'UTC';
    } catch {
      return 'UTC'; // Fallback на UTC если не удалось определить
    }
  }
};

// Основные API методы для астрологических расчетов
export const astrologyAPI = {
  /**
   * Расчет натальной карты
   * @param {Object} data - Данные для расчета
   * @returns {Promise<Object>} Результаты расчета
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
   * Расчет синастрии
   * @param {Object} data - Данные двух карт для синастрии
   * @returns {Promise<Object>} Результаты синастрии
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
   * Расчёт вторичных прогрессий («день за год»). Требует авторизацию —
   * доступно только для сохранённых карт (как чат).
   */
  calculateProgressions: async (data: Record<string, unknown>): Promise<ProgressionsData> => {
    const response = await api.post('/progressions', data);
    return response.data;
  },

  /**
   * AI-анализ вторичных прогрессий (RAG по книгам + LLM).
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
   * Транзиты на конкретный день (по умолчанию — сегодня; можно любой день).
   * @param data - { birth_date, birth_time, birth_place, latitude, longitude, timezone, target_date? }
   */
  calculateTransits: async (data: Record<string, unknown>): Promise<TransitsData> => {
    const response = await api.post('/transits', data);
    return response.data;
  },

  /**
   * AI-анализ транзитов дня (RAG по книгам + LLM).
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
   * Прогноз дня: score 1-10, категория, summary; аспекты к планетам, углам, Фортуне.
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