import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');

    if (accessToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: hashParams.get('refresh_token') || ''
      });
      setIsValidToken(true);
    }
  }, []);

  const initialValues = {
    password: '',
    confirmPassword: ''
  };

  const validationSchema = Yup.object({
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
      await updatePassword(values.password);
      setPasswordUpdated(true);
    } catch (err) {
      setError(err.message || 'Ошибка при обновлении пароля.');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="auth-page">
        <Header />
        <div className="container">
          <div className="auth-card">
            <div className="auth-header">
              <h1>Недействительная ссылка</h1>
              <p>Ссылка для сброса пароля истекла или недействительна.</p>
            </div>
            <div className="auth-footer">
              <p>
                <Link to="/forgot-password" className="auth-link">Запросить новую ссылку</Link>
              </p>
              <p>
                <Link to="/login" className="auth-link">Войти</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (passwordUpdated) {
    return (
      <div className="auth-page">
        <Header />
        <div className="container">
          <div className="auth-card">
            <div className="auth-header">
              <h1>Пароль обновлён</h1>
              <p>Ваш пароль успешно изменён.</p>
            </div>
            <div className="auth-footer">
              <p>
                <Link to="/login" className="auth-link">Войти с новым паролем</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <Header />
      <div className="container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Новый пароль</h1>
            <p>Введите новый пароль</p>
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
                  <label htmlFor="password">Новый пароль *</label>
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
                  {loading ? 'Сохранение...' : 'Сохранить пароль'}
                </button>
              </Form>
            )}
          </Formik>

          <div className="auth-footer">
            <p>
              <Link to="/login" className="auth-link">Вернуться ко входу</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;