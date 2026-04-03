import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

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
        navigate('/dashboard');
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
                <Link to="/login" className="auth-link">{t('register.confirmEmail.loginAfter')}</Link>
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
              {t('register.hasAccount')} <Link to="/login" className="auth-link">{t('register.loginLink')}</Link>
            </p>
            <p>
              <Link to="/" className="auth-link">{t('register.backHome')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;