import React, { createContext, useState, useContext, useEffect } from 'react';
import { astrologyAPI } from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Проверяем токен при загрузке
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Устанавливаем токен в API
      astrologyAPI.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Получаем информацию о пользователе
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await astrologyAPI.get('/api/me');
      setUser(response.data);
      setError(null);
    } catch (err) {
      console.error('Ошибка при получении пользователя:', err);
      logout(); // Если токен невалидный, выходим
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await astrologyAPI.post('/api/login', { email, password });
      
      const { access_token, user: userData } = response.data;
      
      // Сохраняем токен
      localStorage.setItem('token', access_token);
      astrologyAPI.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setUser(userData);
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Ошибка при входе';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await astrologyAPI.post('/api/register', userData);
      
      const { access_token, user: userDataResponse } = response.data;
      
      // Сохраняем токен
      localStorage.setItem('token', access_token);
      astrologyAPI.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setUser(userDataResponse);
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Ошибка при регистрации';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete astrologyAPI.defaults.headers.common['Authorization'];
    setUser(null);
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};