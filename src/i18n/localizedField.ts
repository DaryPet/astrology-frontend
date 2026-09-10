// Picks the localized value of a field (sign/aspect/phase) for the current UI language.
// The backend sends a base field (en) plus optional _ru and _uk variants; when the current
// language has no translation, fall back to the English value rather than rendering nothing.
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
