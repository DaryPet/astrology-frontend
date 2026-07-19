// src/components/EventChartCard.tsx
// Полная карточка события (Event Astrology): Сигнификаторы / Планеты / Показания / Вывод.
// Рисуем из significator_card — колесо пока не рендерим.
import React from 'react';

export interface Showing {
  kind?: string;
  label_ru?: string;
  label?: string;
  effect?: string;
  weight?: number;
  warn?: string;
  star?: string;
}

export interface SignRef {
  sign?: string;
  sign_ru?: string;
  symbol?: string;
  sign_symbol?: string;
  degree?: number;
}

export interface LordInfo {
  lord_house?: number;
  planet?: string;
  planet_ru?: string;
  symbol?: string;
  planet_symbol?: string;
  sign?: string;
  sign_ru?: string;
  sign_symbol?: string;
  degree?: number;
  house?: number;
  house_nickname?: string | null;
  house_strength?: number;
  house_mark?: string;
  dignity?: string;
  dignity_ru?: string;
  dignity_mark?: string;
  retrograde?: boolean;
  combust?: boolean;
  showings?: Showing[];
}

export interface PlanetInfo {
  planet?: string;
  planet_ru?: string;
  symbol?: string;
  planet_symbol?: string;
  sign?: string;
  sign_ru?: string;
  sign_symbol?: string;
  degree?: number;
  house?: number;
  house_nickname?: string | null;
  retrograde?: boolean;
  combust?: boolean;
  dignity?: string;
  dignity_ru?: string;
  warnings?: number;
}

export interface SignificatorCard {
  asc?: SignRef;
  desc?: SignRef;
  favourite?: LordInfo;
  underdog?: LordInfo;
  planets?: PlanetInfo[];
  mixed_winner?: 'favourite' | 'underdog' | string;
  chart_wide?: Showing[];
}

interface Props {
  card: SignificatorCard;
  verdict?: string;
  matchTypeLabel?: string;
  place?: string;
  date?: string;
  time?: string;
  timezone?: string;
}

// Фоллбэки на случай, если бэкенд не прислал символ
const SIGN_SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

const signSymbol = (o?: { sign?: string; sign_symbol?: string; symbol?: string }) =>
  o?.sign_symbol || o?.symbol || (o?.sign ? SIGN_SYMBOLS[o.sign] : '') || '';

const planetSymbol = (o?: { planet?: string; planet_symbol?: string; symbol?: string }) =>
  o?.planet_symbol || o?.symbol || (o?.planet ? PLANET_SYMBOLS[o.planet] : '') || '';

const deg = (d?: number) => (typeof d === 'number' ? `${d.toFixed(2)}°` : '');

// Красный чип = показание работает против кого-то, зелёный = за / нет проблем.
const effectTone = (s: Showing): 'bad' | 'good' | 'neutral' => {
  const text = (s.effect || '').toLowerCase();
  if (/против|минус|damage|against/.test(text)) return 'bad';
  if (/\bза\b|плюс|for |в пользу/.test(text)) return 'good';
  if (typeof s.weight === 'number' && s.weight !== 0) return s.weight > 0 ? 'good' : 'bad';
  return 'neutral';
};

const TONE_STYLE: Record<string, React.CSSProperties> = {
  bad: { background: 'rgba(229, 57, 53, 0.12)', color: '#c62828' },
  good: { background: 'rgba(67, 160, 71, 0.14)', color: '#2e7d32' },
  neutral: { background: 'var(--bg-secondary, rgba(0,0,0,0.05))', color: 'var(--text-secondary)' },
};

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '16px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  maxWidth: 'none',
  fontSize: '17px',
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '7px 0',
  borderTop: '1px solid var(--border)',
  fontSize: '15px',
};

const labelStyle: React.CSSProperties = { color: 'var(--text-primary)' };
const valueStyle: React.CSSProperties = { textAlign: 'right', fontWeight: 600 };

const Row: React.FC<{ label: React.ReactNode; value: React.ReactNode }> = ({ label, value }) => (
  <div style={rowStyle}>
    <span style={labelStyle}>{label}</span>
    <span style={valueStyle}>{value}</span>
  </div>
);

const chipStyle = (tone: 'bad' | 'good' | 'neutral'): React.CSSProperties => ({
  ...TONE_STYLE[tone],
  padding: '3px 12px',
  borderRadius: '14px',
  fontSize: '14px',
  fontWeight: 500,
  whiteSpace: 'nowrap',
});

// «♊ 14.57° · Дом 7 ⚠️ · Падение ⚠️»
const lordPosition = (l: LordInfo) => {
  const parts: React.ReactNode[] = [];
  parts.push(`${signSymbol(l)} ${deg(l.degree)}`);
  if (l.house != null) parts.push(`Дом ${l.house}${l.house_mark ? ` ${l.house_mark}` : ''}`);
  if (l.dignity && l.dignity !== 'peregrine' && l.dignity_ru) {
    parts.push(`${l.dignity_ru}${l.dignity_mark ? ` ${l.dignity_mark}` : ''}`);
  }
  if (l.retrograde) parts.push('℞');
  if (l.combust) parts.push('сожжён');
  return parts.join(' · ');
};

const planetPosition = (p: PlanetInfo) => {
  const parts: string[] = [`${signSymbol(p)} ${deg(p.degree)}${p.retrograde ? ' ℞' : ''}`];
  if (p.house != null) parts.push(`Дом ${p.house}`);
  if (p.combust) parts.push('сожжён');
  return parts.join(' · ');
};

const EventChartCard: React.FC<Props> = ({ card, verdict, matchTypeLabel, place, date, time, timezone }) => {
  const { asc, desc, favourite, underdog, planets = [], chart_wide = [], mixed_winner } = card;

  const showings: Showing[] = [
    ...(favourite?.showings || []),
    ...(underdog?.showings || []),
    ...chart_wide,
  ].filter(s => s && (s.label_ru || s.label));

  // Ретро/сгорание: сводная строка по всем планетам карты
  const flagged = [favourite, underdog, ...planets]
    .filter((p): p is LordInfo & PlanetInfo => Boolean(p))
    .filter(p => p.retrograde || p.combust)
    .map(p => `${p.planet_ru || p.planet}${p.retrograde ? ' ℞' : ''}${p.combust ? ' сожжён' : ''}`);

  const headerBits = [place, date, time && timezone ? `${time} (${timezone})` : time].filter(Boolean);

  const winnerTitle =
    mixed_winner === 'favourite'
      ? 'Фаворит побеждает'
      : mixed_winner === 'underdog'
        ? 'Аутсайдер побеждает'
        : matchTypeLabel || 'Вывод';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
      <div>
        <p style={{ ...cardTitleStyle, fontSize: '20px' }}>
          {['Event Chart', ...headerBits].join(' · ')}
        </p>
        <p style={{ margin: '4px 0 0', maxWidth: 'none', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Плацидус · Kick-off · Роли: Фаворит / Аутсайдер
        </p>
      </div>

      {(asc || desc || favourite || underdog) && (
        <div style={cardStyle}>
          <p style={cardTitleStyle}>Сигнификаторы</p>
          {asc && (
            <Row
              label="АСЦ (1-й дом, Фаворит)"
              value={`${signSymbol(asc)} ${asc.sign_ru || asc.sign || ''} ${deg(asc.degree)}`}
            />
          )}
          {desc && (
            <Row
              label="7-й дом (Аутсайдер)"
              value={`${signSymbol(desc)} ${desc.sign_ru || desc.sign || ''} ${deg(desc.degree)}`}
            />
          )}
          {favourite && (
            <Row
              label="Lord 1 = Фаворит"
              value={`${planetSymbol(favourite)} ${favourite.planet_ru || favourite.planet || ''}`}
            />
          )}
          {underdog && (
            <Row
              label="Lord 7 = Аутсайдер"
              value={`${planetSymbol(underdog)} ${underdog.planet_ru || underdog.planet || ''}`}
            />
          )}
        </div>
      )}

      {(favourite || underdog || planets.length > 0) && (
        <div style={cardStyle}>
          <p style={cardTitleStyle}>Планеты</p>
          {favourite && (
            <Row
              label={`${planetSymbol(favourite)} ${favourite.planet_ru || favourite.planet || ''} (Фаворит)`}
              value={lordPosition(favourite)}
            />
          )}
          {underdog && (
            <Row
              label={`${planetSymbol(underdog)} ${underdog.planet_ru || underdog.planet || ''} (Аутсайдер)`}
              value={lordPosition(underdog)}
            />
          )}
          {planets.map((p, i) => (
            <Row
              key={`${p.planet}-${i}`}
              label={`${planetSymbol(p)} ${p.planet_ru || p.planet || ''}`}
              value={planetPosition(p)}
            />
          ))}
        </div>
      )}

      {showings.length > 0 && (
        <div style={cardStyle}>
          <p style={cardTitleStyle}>Показания</p>
          {showings.map((s, i) => (
            <div key={i} style={rowStyle}>
              <span style={labelStyle}>
                {s.label_ru || s.label}
                {s.star ? ` ${s.star}` : ''}
                {s.warn ? ` ${s.warn}` : ''}
              </span>
              {s.effect && <span style={chipStyle(effectTone(s))}>{s.effect}</span>}
            </div>
          ))}
          <div style={rowStyle}>
            <span style={labelStyle}>Ретро/сгорание</span>
            <span style={chipStyle(flagged.length ? 'bad' : 'good')}>
              {flagged.length ? flagged.join(', ') : 'Нет ни у кого'}
            </span>
          </div>
        </div>
      )}

      {(verdict || mixed_winner) && (
        <div style={cardStyle}>
          <p style={cardTitleStyle}>🏆 Вывод: {winnerTitle}</p>
          {verdict && (
            <p style={{ margin: 0, maxWidth: 'none', fontSize: '15px', lineHeight: 1.7 }}>{verdict}</p>
          )}
          {matchTypeLabel && (
            <span style={{ ...chipStyle('good'), alignSelf: 'flex-start' }}>Прогноз: {matchTypeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default EventChartCard;
