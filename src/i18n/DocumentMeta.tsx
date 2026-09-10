import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Keeps <html lang>, <title> and meta description in sync with the chosen language.
 *
 * Before this, index.html hardcoded lang="ru" and a Russian title — on the
 * English and Ukrainian versions that lied to both screen readers and search engines.
 * Renders nothing.
 */
const DocumentMeta = () => {
  const { i18n, t } = useTranslation();

  useEffect(() => {
    const lang = i18n.language || 'ru';
    document.documentElement.lang = lang;

    const title = t('meta.title');
    if (title && title !== 'meta.title') document.title = title;

    const description = t('meta.description');
    if (description && description !== 'meta.description') {
      const set = (selector: string, attr: string) => {
        const el = document.querySelector<HTMLMetaElement>(selector);
        if (el) el.setAttribute(attr, description);
      };
      set('meta[name="description"]', 'content');
      set('meta[property="og:description"]', 'content');
    }

    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle && title && title !== 'meta.title') ogTitle.setAttribute('content', title);
  }, [i18n.language, t]);

  return null;
};

export default DocumentMeta;
