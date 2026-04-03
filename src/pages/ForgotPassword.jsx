import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';

const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const initialValues = {
    email: ''
  };

  const validationSchema = Yup.object({
    email: Yup.string()
      .email(t('forgotPassword.validation.emailInvalid'))
      .required(t('forgotPassword.validation.emailRequired'))
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoading(true);
    setError('');
    try {
      await resetPassword(values.email);
      setEmailSent(true);
    } catch (err) {
      setError(err.message || t('forgotPassword.errors.sendError'));
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
              <h1>{t('forgotPassword.successTitle')}</h1>
              <p>{t('forgotPassword.successText1')}</p>
              <p>{t('forgotPassword.successText2')}</p>
            </div>
            <div className="auth-footer">
              <p>
                <Link to="/login" className="auth-link">{t('forgotPassword.backToLogin')}</Link>
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
            <h1>{t('forgotPassword.title')}</h1>
            <p>{t('forgotPassword.subtitle')}</p>
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
                  <label htmlFor="email">{t('forgotPassword.email')}</label>
                  <Field
                    type="email"
                    name="email"
                    id="email"
                    placeholder={t('forgotPassword.emailPlaceholder')}
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
                  {loading ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
                </button>
              </Form>
            )}
          </Formik>

          <div className="auth-footer">
            <p>
              {t('forgotPassword.rememberPassword')} <Link to="/login" className="auth-link">{t('forgotPassword.loginLink')}</Link>
            </p>
            <p>
              <Link to="/" className="auth-link">{t('forgotPassword.backHome')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;