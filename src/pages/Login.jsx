import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const result = await login(email, password);
    
    if (result.success) {
      navigate('/'); // Перенаправляем на главную
    }
    
    setIsLoading(false);
  };

  return (
    <div style={{
      maxWidth: '400px',
      margin: '50px auto',
      padding: '30px',
      backgroundColor: 'var(--card-bg)',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
        color: 'var(--text-primary)'
      }}>
        Вход в систему
      </h2>
      
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          border: '1px solid #ff0000',
          borderRadius: '6px',
          marginBottom: '20px',
          color: '#ff0000'
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: 'var(--text-secondary)',
            fontWeight: '500'
          }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '16px'
            }}
            placeholder="Введите ваш email"
          />
        </div>
        
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: 'var(--text-secondary)',
            fontWeight: '500'
          }}>
            Пароль
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '16px'
            }}
            placeholder="Введите ваш пароль"
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
              padding: '14px',
              backgroundColor: isLoading ? 'var(--button-disabled)' : 'var(--button-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
          }}
        >
          {isLoading ? 'Вход...' : 'Войти'}
        </button>
      </form>
      
      <div style={{
        textAlign: 'center',
        marginTop: '25px',
        color: 'var(--text-secondary)'
      }}>
        <span>Нет аккаунта? </span>
        <Link 
          to="/register" 
          style={{
            color: 'var(--link-color)',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          Зарегистрироваться
        </Link>
      </div>
    </div>
  );
}

export default Login;