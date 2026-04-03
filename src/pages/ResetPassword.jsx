import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const { t } = useTranslation();
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
      .min(8, t('resetPassword.validation.passwordMin'))
      .matches(/[A-Za-z]/, t('resetPassword.validation.passwordLetters'))
      .matches(/\d/, t('resetPassword.validation.passwordDigits'))
      .required(t('resetPassword.validation.passwordRequired')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], t('resetPassword.validation.passwordsMismatch'))
      .required(t('resetPassword.validation.confirmRequired'))
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoading(true);
    setError('');
    try {
      await updatePassword(values.password);
      setPasswordUpdated(true);
    } catch (err) {
      setError(err.message || t('resetPassword.errors.updateError'));
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
              <h1>{t('resetPassword.invalidLink.title')}</h1>
              <p>{t('resetPassword.invalidLink.text')}</p>
            </div>
            <div className="auth-footer">
              <p>
                <Link to="/forgot-password" className="auth-link">{t('resetPassword.invalidLink.requestNew')}</Link>
              </p>
              <p>
                <Link to="/login" className="auth-link">{t('resetPassword.invalidLink.login')}</Link>
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
              <h1>{t('resetPassword.success.title')}</h1>
              <p>{t('resetPassword.success.text')}</p>
            </div>
            <div className="auth-footer">
              <p>
                <Link to="/login" className="auth-link">{t('resetPassword.success.login')}</Link>
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
            <h1>{t('resetPassword.form.title')}</h1>
            <p>{t('resetPassword.form.subtitle')}</p>
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
                  <label htmlFor="password">{t('resetPassword.form.password')}</label>
                  <Field
                    type="password"
                    name="password"
                    id="password"
                    placeholder={t('resetPassword.form.passwordPlaceholder')}
                    className={`form-input ${errors.password && touched.password ? 'error' : ''}`}
                    disabled={loading}
                  />
                  <ErrorMessage name="password" component="div" className="field-error" />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">{t('resetPassword.form.confirmPassword')}</label>
                  <Field
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    placeholder={t('resetPassword.form.confirmPasswordPlaceholder')}
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
                  {loading ? t('resetPassword.form.submitting') : t('resetPassword.form.submit')}
                </button>
              </Form>
            )}
          </Formik>

          <div className="auth-footer">
            <p>
              <Link to="/login" className="auth-link">{t('resetPassword.form.backToLogin')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;