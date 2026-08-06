// Выбирает локализованное значение поля (знак/аспект/фаза) по текущему языку интерфейса.
// Бэкенд присылает base-поле (en) плюс необязательные _ru и _uk варианты; если перевода
// для текущего языка нет, откатываемся на английское значение, а не молчим.
export function pickLocalized(
  language: string | undefined,
  base?: string,
  ru?: string,
  uk?: string
): string {
  const lang = (language || 'ru').toLowerCase();
  if (lang.startsWith('uk')) return uk || base || '—';
  if (lang.startsWith('ru')) return ru || base || '—';
  return base || '—';
}
