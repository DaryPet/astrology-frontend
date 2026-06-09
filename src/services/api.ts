import axios from 'axios';
import i18n from '../i18n';

const api = axios.create({
  baseURL: '/api',
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json'
  }
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
   * Расчет транзитов
   * @param {Object} data - Данные для расчета транзитов
   * @returns {Promise<Object>} Результаты транзитов
   */
  calculateTransits: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    try {
      const response = await api.post('/transits', data);
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
    } catch {
      return 'UTC';
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