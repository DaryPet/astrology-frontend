import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Добавляем токен из localStorage если есть
const token = localStorage.getItem('token')
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

// Интерцептор для обработки ошибок 401 (Unauthorized)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // Если токен невалидный, удаляем его
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      
      // Перенаправляем на страницу входа если не на странице логина
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Геокодинг API методы
export const geocodeAPI = {
  /**
   * Автокомплит городов по частичному вводу
   * @param {string} query - Часть названия города (например, "барс")
   * @returns {Promise<Array>} Список городов с координатами и таймзоной
   */
  autocomplete: async (query) => {
    if (!query || query.trim().length < 2) {
      return []
    }
    
    try {
      const response = await api.get(`/geocode/autocomplete?q=${encodeURIComponent(query.trim())}`)
      return response.data || []
    } catch (error) {
      console.error('Geocode autocomplete error:', error)
      throw new Error(`Не удалось найти города: ${error.message}`)
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
      throw new Error('Координаты не указаны')
    }
    
    try {
      const response = await api.get(`/geocode/coordinates?lat=${lat}&lon=${lon}`)
      return response.data
    } catch (error) {
      console.error('Reverse geocode error:', error)
      throw new Error(`Не удалось определить информацию о месте: ${error.message}`)
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
      const locationInfo = await geocodeAPI.getLocationInfo(lat, lon)
      return locationInfo.timezone || 'UTC'
    } catch (error) {
      console.error('Timezone detection error:', error)
      return 'UTC' // Fallback на UTC если не удалось определить
    }
  }
}

// Основные API методы для астрологических расчетов
export const astrologyAPI = {
  /**
   * Расчет натальной карты
   * @param {Object} data - Данные для расчета
   * @returns {Promise<Object>} Результаты расчета
   */
  calculateChart: async (data) => {
    try {
      const response = await api.post('/chart/calculate', data)
      return response.data
    } catch (error) {
      console.error('Chart calculation error:', error)
      throw error
    }
  },

  /**
   * Расчет транзитов
   * @param {Object} data - Данные для расчета транзитов
   * @returns {Promise<Object>} Результаты транзитов
   */
  calculateTransits: async (data) => {
    try {
      const response = await api.post('/transits', data)
      return response.data
    } catch (error) {
      console.error('Transits calculation error:', error)
      throw error
    }
  },

  /**
   * Расчет синастрии
   * @param {Object} data - Данные двух карт для синастрии
   * @returns {Promise<Object>} Результаты синастрии
   */
  calculateSynastry: async (data) => {
    try {
      const response = await api.post('/synastry/direct', data)
      return response.data
    } catch (error) {
      console.error('Synastry calculation error:', error)
      throw error
    }
  }
}

export default api
