import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/authApi';
import Header from '../components/Header';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        navigate('/');
        return;
      }

      // Получаем данные пользователя
      const userData = await authAPI.getCurrentUser();
      setUser(userData);

      // Получаем данные dashboard
      const dashboardResponse = await authAPI.getDashboard();
      setDashboardData(dashboardResponse);
    } catch (err) {
      console.error('Dashboard error:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('auth_token');
        navigate('/');
      } else {
        setError('Ошибка при загрузке данных dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="dashboard">
        <Header />
        <div className="container">
          <div className="loading">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <Header />
        <div className="container">
          <div className="error-message">{error}</div>
          <button className="btn-primary" onClick={() => navigate('/')}>
            На главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header />
      
      <div className="container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Добро пожаловать в ваш личный кабинет</p>
        </div>

        <div className="dashboard-content">
          {/* Информация о пользователе */}
          <div className="dashboard-card">
            <h2>Информация о пользователе</h2>
            <div className="user-info-details">
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{user?.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Имя:</span>
                <span className="info-value">{user?.name || 'Не указано'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Дата регистрации:</span>
                <span className="info-value">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : 'Неизвестно'}
                </span>
              </div>
            </div>
          </div>

          {/* Сообщение от dashboard */}
          {dashboardData && (
            <div className="dashboard-card">
              <h2>Сообщение системы</h2>
              <div className="dashboard-message">
                <p>{dashboardData.message}</p>
                <div className="message-details">
                  <p>Ваш ID: {dashboardData.user?.id}</p>
                  <p>Ваш email: {dashboardData.user?.email}</p>
                  <p>Ваше имя: {dashboardData.user?.name || 'Не указано'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Заглушка для будущих функций */}
          <div className="dashboard-card">
            <h2>Будущие возможности</h2>
            <div className="future-features">
              <div className="feature">
                <div className="feature-icon">📊</div>
                <div className="feature-content">
                  <h3>История расчетов</h3>
                  <p>Просмотр всех ваших предыдущих астрологических расчетов</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">⭐</div>
                <div className="feature-content">
                  <h3>Избранное</h3>
                  <p>Сохранение любимых карт и интерпретаций</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">🔔</div>
                <div className="feature-content">
                  <h3>Уведомления</h3>
                  <p>Оповещения о важных транзитах и астрологических событиях</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">👥</div>
                <div className="feature-content">
                  <h3>Сравнение карт</h3>
                  <p>Сравнение вашей карты с картами других пользователей</p>
                </div>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="dashboard-actions">
            <button className="btn-primary" onClick={() => navigate('/')}>
              Рассчитать новую карту
            </button>
            <button className="btn-secondary" onClick={() => navigate('/synastry')}>
              Рассчитать синастрию
            </button>
            <button className="btn-logout" onClick={handleLogout}>
              Выйти из системы
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;