import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ru from './locales/ru/translation.json';
import en from './locales/en/translation.json';

i18n
  .use(LanguageDetector)       // автоопределение языка браузера
  .use(initReactI18next)       // подключение к React
  .init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
    },

    fallbackLng: 'ru',         // если язык не найден — русский
    supportedLngs: ['ru', 'en'],

    detection: {
      // порядок поиска языка: сначала localStorage, потом браузер
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'language',
      cacheUserLanguage: true, // сохранять выбор в localStorage
    },

    interpolation: {
      escapeValue: false,      // React сам экранирует XSS
    },
  });

export default i18n;