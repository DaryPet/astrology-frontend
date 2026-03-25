import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/authApi';
import Header from '../components/Header';

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Пытаемся вызвать logout на сервере
        await authAPI.logout();
      } catch (error) {
        console.log('Logout API error:', error);
        // Не критично - продолжаем локальный logout
      } finally {
        // Всегда очищаем локальное хранилище
        localStorage.removeItem('auth_token');
        
        // Перенаправляем на главную страницу
        navigate('/');
      }
    };

    performLogout();
  }, [navigate]);

  return (
    <div className="logout-page">
      <Header />
      <div className="container">
        <div className="logout-card">
          <h1>Выход из системы</h1>
          <p>Выполняется выход из системы...</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    </div>
  );
};

export default Logout;