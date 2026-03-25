import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Добавляем интерцептор для добавления токена к запросам
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API методы для аутентификации
export const authAPI = {
  /**
   * Регистрация пользователя
   * @param {string} email - Email пользователя
   * @param {string} password - Пароль
   * @param {string} name - Имя пользователя (опционально)
   * @returns {Promise<Object>} Токен доступа
   */
  register: async (email, password, name = '') => {
    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        name
      });
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  /**
   * Вход пользователя
   * @param {string} email - Email пользователя
   * @param {string} password - Пароль
   * @returns {Promise<Object>} Токен доступа
   */
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * Получение информации о текущем пользователе
   * @returns {Promise<Object>} Данные пользователя
   */
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  },

  /**
   * Выход пользователя
   * @returns {Promise<Object>} Результат выхода
   */
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  /**
   * Получение данных dashboard (требует аутентификации)
   * @returns {Promise<Object>} Данные dashboard
   */
  getDashboard: async () => {
    try {
      const response = await api.get('/dashboard');
      return response.data;
    } catch (error) {
      console.error('Get dashboard error:', error);
      throw error;
    }
  }
};

export default authAPI;