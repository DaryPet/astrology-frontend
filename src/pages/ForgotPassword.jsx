import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';

const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const initialValues = {
    email: ''
  };

  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Некорректный email адрес')
      .required('Email обязателен для заполнения')
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoading(true);
    setError('');
    try {
      await resetPassword(values.email);
      setEmailSent(true);
    } catch (err) {
      setError(err.message || 'Ошибка при отправке. Проверьте email.');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="auth-page">
        <Header />
        <div className="container">
          <div className="auth-card">
            <div className="auth-header">
              <h1>Проверьте почту</h1>
              <p>Мы отправили инструкции по сбросу пароля на ваш email.</p>
              <p>Перейдите по ссылке в письме, чтобы создать новый пароль.</p>
            </div>
            <div className="auth-footer">
              <p>
                <Link to="/login" className="auth-link">Вернуться ко входу</Link>
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
            <h1>Забыли пароль?</h1>
            <p>Введите email, указанный при регистрации</p>
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

                <button
                  type="submit"
                  className="btn-primary btn-auth"
                  disabled={loading || isSubmitting}
                >
                  {loading ? 'Отправка...' : 'Отправить инструкции'}
                </button>
              </Form>
            )}
          </Formik>

          <div className="auth-footer">
            <p>
              Вспомнили пароль? <Link to="/login" className="auth-link">Войти</Link>
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

export default ForgotPassword;