import React, { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';

const Register = () => {
  const navigate = useNavigate();
  const { lang } = useParams();
  const { signUp, signInWithGoogle } = useAuth();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const currentLang = lang || i18n.language || 'ru';

  const initialValues = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  const validationSchema = Yup.object({
    name: Yup.string()
      .max(50, t('register.validation.nameTooLong')),
    email: Yup.string()
      .email(t('register.validation.emailInvalid'))
      .required(t('register.validation.emailRequired')),
    password: Yup.string()
      .min(8, t('register.validation.passwordMin'))
      .matches(/[A-Za-z]/, t('register.validation.passwordLetters'))
      .matches(/\d/, t('register.validation.passwordDigits'))
      .required(t('register.validation.passwordRequired')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], t('register.validation.passwordsMismatch'))
      .required(t('register.validation.confirmRequired'))
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoading(true);
    setError('');
    try {
      const data = await signUp(values.email, values.password, values.name);

      if (data.session) {
        navigate(`/${currentLang}/dashboard`);
      } else {
        setEmailSent(true);
      }
    } catch (err) {
      setError(err.message || t('register.errors.registerError'));
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || t('register.errors.registerError'));
      setGoogleLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="auth-page">
        <Header />
        <div className="container">
          <div className="auth-card">
            <div className="auth-header">
              <h1>{t('register.confirmEmail.title')}</h1>
              <p>{t('register.confirmEmail.text1')}</p>
              <p>{t('register.confirmEmail.text2')}</p>
            </div>
            <div className="auth-footer">
              <p>
                <Link to={`/${currentLang}/login`} className="auth-link">{t('register.confirmEmail.loginAfter')}</Link>
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
            <h1>{t('register.title')}</h1>
            <p>{t('register.subtitle')}</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="button"
            className="btn-google-signin"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              background: '#fff',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            {googleLoading ? t('common.loading') : t('common.googleSignIn')}
          </button>

          <div style={{ textAlign: 'center', margin: '20px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {t('common.or')}
          </div>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, errors, touched }) => (
              <Form className="auth-form">
                <div className="form-group">
                  <label htmlFor="name">{t('register.name')}</label>
                  <Field
                    type="text"
                    name="name"
                    id="name"
                    placeholder={t('register.namePlaceholder')}
                    className={`form-input ${errors.name && touched.name ? 'error' : ''}`}
                    disabled={loading}
                  />
                  <ErrorMessage name="name" component="div" className="field-error" />
                </div>

                <div className="form-group">
                  <label htmlFor="email">{t('register.email')}</label>
                  <Field
                    type="email"
                    name="email"
                    id="email"
                    placeholder={t('register.emailPlaceholder')}
                    className={`form-input ${errors.email && touched.email ? 'error' : ''}`}
                    disabled={loading}
                  />
                  <ErrorMessage name="email" component="div" className="field-error" />
                </div>

                <div className="form-group">
                  <label htmlFor="password">{t('register.password')}</label>
                  <Field
                    type="password"
                    name="password"
                    id="password"
                    placeholder={t('register.passwordPlaceholder')}
                    className={`form-input ${errors.password && touched.password ? 'error' : ''}`}
                    disabled={loading}
                  />
                  <ErrorMessage name="password" component="div" className="field-error" />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">{t('register.confirmPassword')}</label>
                  <Field
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    placeholder={t('register.confirmPasswordPlaceholder')}
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
                  {loading ? t('register.submitting') : t('register.submit')}
                </button>
              </Form>
            )}
          </Formik>

          <div className="auth-footer">
            <p>
              {t('register.hasAccount')} <Link to={`/${currentLang}/login`} className="auth-link">{t('register.loginLink')}</Link>
            </p>
            <p>
              <Link to={`/${currentLang}/`} className="auth-link">{t('register.backHome')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;