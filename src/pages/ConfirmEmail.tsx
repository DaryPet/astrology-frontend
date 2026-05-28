import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ConfirmEmail = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<string>('');
  const [isError, setIsError] = useState(false);

  const currentLang = i18n.language || 'ru';

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setStatus(t('confirm.success'));
        setTimeout(() => navigate(`/${currentLang}/dashboard`), 2000);
      }

      if (event === 'TOKEN_REFRESHED') {
        setStatus(t('confirm.success'));
        setTimeout(() => navigate(`/${currentLang}/dashboard`), 2000);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus(t('confirm.success'));
        setTimeout(() => navigate(`/${currentLang}/dashboard`), 2000);
      } else {
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (!s) {
              setIsError(true);
              setStatus(t('confirm.error'));
            }
          });
        }, 5000);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [navigate, t, currentLang]);

  useEffect(() => {
    setStatus(t('confirm.pending'));
  }, [t]);

  return (
    <>
      <Header />
      <div style={{ textAlign: 'center', marginTop: '40px', padding: '20px' }}>
        <h2 style={{ color: isError ? '#e53e3e' : 'inherit' }}>{status}</h2>
        {isError && (
          <div style={{ marginTop: '20px' }}>
            <p>{t('confirm.tryAgain')}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
              <a href={`/${currentLang}/register`} style={{ color: 'var(--accent)' }}>{t('confirm.registerLink')}</a>
              <a href={`/${currentLang}/login`} style={{ color: 'var(--accent)' }}>{t('confirm.loginLink')}</a>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ConfirmEmail;