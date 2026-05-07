import axios from 'axios';
import i18n from '../i18n';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Геокодинг API методы
export const geocodeAPI = {
  /**
   * Автокомплит городов по частичному вводу
   * @param {string} query - Часть названия города (например, "барс")
   * @returns {Promise<Array>} Список городов с координатами и таймзоной
   */
  autocomplete: async (query) => {
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
      throw new Error(`Не удалось найти города: ${error.message}`);
    }
  },

  /**
   * Получение информации о месте по координатам (обратное геокодирование)
   * @param {number} lat - Широта
   * @param {number} lon - Долгота
   * @returns {Promise<Object>} Информация о месте (адрес, таймзона и т.д.)
   */
  getLocationInfo: async (lat, lon) => {
    if (lat == null || lon == null) {
      throw new Error('Координаты не указаны');
    }

    try {
      const response = await api.get(`/geocode/coordinates?lat=${lat}&lon=${lon}`);
      return response.data;
    } catch (error) {
      throw new Error(`Не удалось определить информацию о месте: ${error.message}`);
    }
  },

  /**
   * Определение таймзоны по координатам (обёртка над getLocationInfo)
   * @param {number} lat - Широта
   * @param {number} lon - Долгота
   * @returns {Promise<string>} Таймзона в формате IANA (например, "Europe/Moscow")
   */
  detectTimezone: async (lat, lon) => {
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
  calculateChart: async (data) => {
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
  calculateTransits: async (data) => {
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
  calculateSynastry: async (data) => {
    try {
      const response = await api.post('/synastry/direct', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPlanetAnalysis: async (planetData) => {
    try {
      const response = await api.post('/analysis/planet', planetData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getSynastryAspectAnalysis: async (aspectData) => {
    try {
      const response = await api.post('/synastry/aspect', aspectData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getFullChartAnalysis: async (chartData, language = 'ru', topBooks = 5) => {
    try {
      const response = await api.post('/analysis/full', {
        chart_data: chartData,
        language,
        top_books: topBooks
      });
      return response.data;
    } catch {
      return 'UTC'; // Fallback на UTC если не удалось определить
    }
  },

  getFullSynastryAnalysis: async (synastryData, language = 'ru', topBooks = 5) => {
    try {
      const response = await api.post('/analysis/synastry/full', {
        chart1: synastryData.chart1,
        chart2: synastryData.chart2,
        language,
        top_k_per_book: topBooks
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  chatAnalysis: async (chatRequest) => {
    try {
      const response = await api.post('/analysis/chat', chatRequest);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default api;
