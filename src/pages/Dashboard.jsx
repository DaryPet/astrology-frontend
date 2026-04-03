import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, signOut } = useAuth();

  useEffect(() => {
    // Ждём пока AuthContext загрузится, потом проверяем авторизацию
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  const handleLogout = async () => {
    await signOut();
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

  if (!isAuthenticated) {
    return null; // уже редиректимся в useEffect
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
                <span className="info-value">{user?.user_metadata?.name || 'Не указано'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Дата регистрации:</span>
                <span className="info-value">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : 'Неизвестно'}
                </span>
              </div>
            </div>
          </div>

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