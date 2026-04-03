import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const initialValues = {
    email: '',
    password: ''
  };

  const validationSchema = Yup.object({
    email: Yup.string()
      .email(t('login.validation.emailInvalid'))
      .required(t('login.validation.emailRequired')),
    password: Yup.string()
      .min(8, t('login.validation.passwordMin'))
      .required(t('login.validation.passwordRequired'))
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoading(true);
    setError('');
    try {
      await signIn(values.email, values.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || t('login.errors.loginError'));
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
            <h1>{t('login.title')}</h1>
            <p>{t('login.subtitle')}</p>
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
                  <label htmlFor="email">{t('login.email')}</label>
                  <Field
                    type="email"
                    name="email"
                    id="email"
                    placeholder={t('login.emailPlaceholder')}
                    className={`form-input ${errors.email && touched.email ? 'error' : ''}`}
                    disabled={loading}
                  />
                  <ErrorMessage name="email" component="div" className="field-error" />
                </div>

                <div className="form-group">
                  <label htmlFor="password">{t('login.password')}</label>
                  <Field
                    type="password"
                    name="password"
                    id="password"
                    placeholder={t('login.passwordPlaceholder')}
                    className={`form-input ${errors.password && touched.password ? 'error' : ''}`}
                    disabled={loading}
                  />
                  <ErrorMessage name="password" component="div" className="field-error" />
                </div>

                <div className="forgot-password-link">
                  <Link to="/forgot-password">{t('login.forgotPassword')}</Link>
                </div>

                <button
                  type="submit"
                  className="btn-primary btn-auth"
                  disabled={loading || isSubmitting}
                >
                  {loading ? t('login.submitting') : t('login.submit')}
                </button>
              </Form>
            )}
          </Formik>

          <div className="auth-footer">
            <p>
              {t('login.noAccount')} <Link to="/register" className="auth-link">{t('login.registerLink')}</Link>
            </p>
            <p>
              <Link to="/" className="auth-link">{t('login.backHome')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;