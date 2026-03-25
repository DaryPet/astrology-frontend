import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { authAPI } from '../services/authApi';
import Header from '../components/Header';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const initialValues = {
    email: '',
    password: ''
  };

  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Некорректный email адрес')
      .required('Email обязателен для заполнения'),
    password: Yup.string()
      .min(8, 'Пароль должен содержать минимум 8 символов')
      .required('Пароль обязателен для заполнения')
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.login(values.email, values.password);
      localStorage.setItem('auth_token', response.access_token);
      
      // Перенаправляем на главную страницу после успешного входа
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при входе. Проверьте email и пароль.');
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
            <h1>Вход в систему</h1>
            <p>Введите ваши учетные данные для входа</p>
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
                  <label htmlFor="email">Email</label>
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
                  <label htmlFor="password">Пароль</label>
                  <Field
                    type="password"
                    name="password"
                    id="password"
                    placeholder="Введите пароль"
                    className={`form-input ${errors.password && touched.password ? 'error' : ''}`}
                    disabled={loading}
                  />
                  <ErrorMessage name="password" component="div" className="field-error" />
                </div>

                <button 
                  type="submit" 
                  className="btn-primary btn-auth" 
                  disabled={loading || isSubmitting}
                >
                  {loading ? 'Вход...' : 'Войти'}
                </button>
              </Form>
            )}
          </Formik>

          <div className="auth-footer">
            <p>
              Нет аккаунта? <Link to="/register" className="auth-link">Зарегистрироваться</Link>
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

export default Login;