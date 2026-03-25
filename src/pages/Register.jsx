import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { authAPI } from '../services/authApi';
import Header from '../components/Header';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const initialValues = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  const validationSchema = Yup.object({
    name: Yup.string()
      .max(50, 'Имя не должно превышать 50 символов'),
    email: Yup.string()
      .email('Некорректный email адрес')
      .required('Email обязателен для заполнения'),
    password: Yup.string()
      .min(8, 'Пароль должен содержать минимум 8 символов')
      .matches(/[A-Za-z]/, 'Пароль должен содержать буквы')
      .matches(/\d/, 'Пароль должен содержать цифры')
      .required('Пароль обязателен для заполнения'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Пароли должны совпадать')
      .required('Подтверждение пароля обязательно')
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.register(values.email, values.password, values.name);
      localStorage.setItem('auth_token', response.access_token);
      
      // Перенаправляем на dashboard после успешной регистрации
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при регистрации. Попробуйте другой email.');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <Header />
      
      <div className="container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Регистрация</h1>
            <p>Создайте новый аккаунт</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, errors, touched }) => (
              <Form className="auth-form">
                <div className="form-group">
                  <label htmlFor="name">Имя (опционально)</label>
                  <Field
                    type="text"
                    name="name"
                    id="name"
                    placeholder="Введите ваше имя"
                    className={`form-input ${errors.name && touched.name ? 'error' : ''}`}
                    disabled={loading}
                  />
                  <ErrorMessage name="name" component="div" className="field-error" />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <Field
                    type="email"
                    name="email"
                    id="email"
                    placeholder="Введите email"
                    className={`form-input ${errors.email && touched.email ? 'error' : ''}`}
                    disabled={loading}
                  />
                  <ErrorMessage name="email" component="div" className="field-error" />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Пароль *</label>
                  <Field
                    type="password"
                    name="password"
                    id="password"
                    placeholder="Минимум 8 символов, буквы и цифры"
                    className={`form-input ${errors.password && touched.password ? 'error' : ''}`}
                    disabled={loading}
                  />
                  <ErrorMessage name="password" component="div" className="field-error" />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Подтвердите пароль *</label>
                  <Field
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    placeholder="Повторите пароль"
                    className={`form-input ${errors.confirmPassword && touched.confirmPassword ? 'error' : ''}`}
                    disabled={loading}
                  />
                  <ErrorMessage name="confirmPassword" component="div" className="field-error" />
                </div>

                <button 
                  type="submit" 
                  className="btn-primary btn-auth" 
                  disabled={loading || isSubmitting}
                >
                  {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>
              </Form>
            )}
          </Formik>

          <div className="auth-footer">
            <p>
              Уже есть аккаунт? <Link to="/login" className="auth-link">Войти</Link>
            </p>
            <p>
              <Link to="/" className="auth-link">Вернуться на главную</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;