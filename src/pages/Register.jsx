import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    birth_date: '',
    birth_time: '',
    birth_place: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  const { register, error } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Очищаем ошибку для этого поля
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) {
      errors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Некорректный email';
    }
    
    if (!formData.password) {
      errors.password = 'Пароль обязателен';
    } else if (formData.password.length < 6) {
      errors.password = 'Пароль должен быть не менее 6 символов';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Пароли не совпадают';
    }
    
    if (!formData.name) {
      errors.name = 'Имя обязательно';
    }
    
    if (!formData.birth_date) {
      errors.birth_date = 'Дата рождения обязательна';
    }
    
    if (!formData.birth_place) {
      errors.birth_place = 'Место рождения обязательно';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    // Подготавливаем данные для отправки
    const userData = {
      email: formData.email,
      password: formData.password,
      name: formData.name,
      birth_date: formData.birth_date + (formData.birth_time ? `T${formData.birth_time}:00` : 'T00:00:00'),
      birth_time: formData.birth_time || null,
      birth_place: formData.birth_place
    };
    
    const result = await register(userData);
    
    if (result.success) {
      navigate('/'); // Перенаправляем на главную
    }
    
    setIsLoading(false);
  };

  return (
    <div style={{
      maxWidth: '500px',
      margin: '30px auto',
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
        Регистрация
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
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${formErrors.email ? '#ff0000' : 'var(--border-color)'}`,
              borderRadius: '6px',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '16px'
            }}
            placeholder="Введите ваш email"
          />
          {formErrors.email && (
            <div style={{ color: '#ff0000', fontSize: '14px', marginTop: '5px' }}>
              {formErrors.email}
            </div>
          )}
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: 'var(--text-secondary)',
            fontWeight: '500'
          }}>
            Пароль *
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${formErrors.password ? '#ff0000' : 'var(--border-color)'}`,
              borderRadius: '6px',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '16px'
            }}
            placeholder="Введите пароль (мин. 6 символов)"
          />
          {formErrors.password && (
            <div style={{ color: '#ff0000', fontSize: '14px', marginTop: '5px' }}>
              {formErrors.password}
            </div>
          )}
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: 'var(--text-secondary)',
            fontWeight: '500'
          }}>
            Подтверждение пароля *
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${formErrors.confirmPassword ? '#ff0000' : 'var(--border-color)'}`,
              borderRadius: '6px',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '16px'
            }}
            placeholder="Повторите пароль"
          />
          {formErrors.confirmPassword && (
            <div style={{ color: '#ff0000', fontSize: '14px', marginTop: '5px' }}>
              {formErrors.confirmPassword}
            </div>
          )}
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: 'var(--text-secondary)',
            fontWeight: '500'
          }}>
            Имя *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${formErrors.name ? '#ff0000' : 'var(--border-color)'}`,
              borderRadius: '6px',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '16px'
            }}
            placeholder="Введите ваше имя"
          />
          {formErrors.name && (
            <div style={{ color: '#ff0000', fontSize: '14px', marginTop: '5px' }}>
              {formErrors.name}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--text-secondary)',
              fontWeight: '500'
            }}>
              Дата рождения *
            </label>
            <input
              type="date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${formErrors.birth_date ? '#ff0000' : 'var(--border-color)'}`,
                borderRadius: '6px',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontSize: '16px'
              }}
            />
            {formErrors.birth_date && (
              <div style={{ color: '#ff0000', fontSize: '14px', marginTop: '5px' }}>
                {formErrors.birth_date}
              </div>
            )}
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--text-secondary)',
              fontWeight: '500'
            }}>
              Время рождения
            </label>
            <input
              type="time"
              name="birth_time"
              value={formData.birth_time}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontSize: '16px'
              }}
            />
          </div>
        </div>
        
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: 'var(--text-secondary)',
            fontWeight: '500'
          }}>
            Место рождения *
          </label>
          <input
            type="text"
            name="birth_place"
            value={formData.birth_place}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${formErrors.birth_place ? '#ff0000' : 'var(--border-color)'}`,
              borderRadius: '6px',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '16px'
            }}
            placeholder="Например: Москва, Россия"
          />
          {formErrors.birth_place && (
            <div style={{ color: '#ff0000', fontSize: '14px', marginTop: '5px' }}>
              {formErrors.birth_place}
            </div>
          )}
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
          {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
      </form>
      
      <div style={{
        textAlign: 'center',
        marginTop: '25px',
        color: 'var(--text-secondary)'
      }}>
        <span>Уже есть аккаунт? </span>
        <Link 
          to="/login" 
          style={{
            color: 'var(--link-color)',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          Войти
        </Link>
      </div>
    </div>
  );
}

export default Register;