import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';

const Logout = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await signOut();
      } catch (error) {
        console.log('Logout error:', error);
      } finally {
        navigate('/');
      }
    };

    performLogout();
  }, [navigate, signOut]);

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