import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ConfirmEmail = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Подтверждение email...');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // Supabase отправляет ссылку вида /confirm#access_token=...&type=signup
    // Токен находится в hash (#), supabase-js читает его автоматически
    // и стреляет событием SIGNED_IN через onAuthStateChange

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setStatus('Email успешно подтверждён! Перенаправление...');
        setTimeout(() => navigate('/dashboard'), 2000);
      }

      if (event === 'TOKEN_REFRESHED') {
        // тоже считаем успехом
        setStatus('Email успешно подтверждён! Перенаправление...');
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    });

    // Дополнительно — проверяем текущую сессию на случай если
    // пользователь уже был залогинен до перехода по ссылке
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus('Email успешно подтверждён! Перенаправление...');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        // Если через 5 секунд сессии нет — ссылка невалидна
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (!s) {
              setIsError(true);
              setStatus('Ошибка подтверждения. Ссылка недействительна или истекла.');
            }
          });
        }, 5000);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', marginTop: '100px', padding: '20px' }}>
      <h2 style={{ color: isError ? '#e53e3e' : 'inherit' }}>{status}</h2>
      {isError && (
        <div style={{ marginTop: '20px' }}>
          <p>Попробуйте зарегистрироваться заново или войти в систему.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            <a href="/register" style={{ color: 'var(--accent)' }}>Регистрация</a>
            <a href="/login" style={{ color: 'var(--accent)' }}>Войти</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmEmail;