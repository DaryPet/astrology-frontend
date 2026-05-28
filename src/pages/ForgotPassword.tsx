import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';

const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [emailSent, setEmailSent] = useState(false);

  const validationSchema = {
    email: (value: string) => {
      if (!value) return t('forgotPassword.validation.emailRequired');
      if (!/\S+@\S+\.\S+/.test(value)) return t('forgotPassword.validation.emailInvalid');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const validationError = validationSchema.email(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await resetPassword(email);
      setEmailSent(true);
    } catch (err) {
      setError((err as Error).message || t('forgotPassword.errors.sendError'));
    } finally {
      setLoading(false);
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

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">{t('forgotPassword.email')}</label>
              <input
                type="email"
                name="email"
                id="email"
                placeholder={t('forgotPassword.emailPlaceholder')}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary btn-auth"
              disabled={loading}
            >
              {loading ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
            </button>
          </form>

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