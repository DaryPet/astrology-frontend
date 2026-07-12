# Прогноз дня → Анализ события (только header-nav поток)

## Контекст

Бэкенд `/api/daily-forecast` переписан: раньше требовал натальную карту человека, теперь принимает **событие** (дата+время начала, таймзона, место) и возвращает анализ его исхода: `score`, `category`, `favorite`, `opponent`, `verdict`, `summary`, `match_type` + детали расчёта. Натальные поля необязательны и на расчёт не влияют — новый UI их не отправляет вообще. Всё строго по контракту бэкенда, без домыслов.

В проекте ДВА независимых потока под общим именем "прогноз дня":

1. **Прогноз для сохранённой/только что посчитанной карты** — `DailyForecastPanel.tsx`, используется в `Dashboard.tsx` (таб `dailyForecast` в `AnalysisTabs.tsx`) и в `Home.tsx` (кнопка после расчёта карты). **Не трогаем вообще** — ни компонент, ни его вызовы, ни i18n-namespace `dailyForecast.*`.
2. **Поток из хедера/навигации** — `Header.tsx` → роут `/:lang/daily-forecast` → `DailyForecast.tsx` (форма рождения → расчёт карты → `QuickDailyForecastPanel`). Он задумывался для людей без сохранённой карты — именно его переводим на форму события и переименовываем в "Анализ события" (Event Analysis).

## Что меняется

### 1. `src/components/EventAnalysisPanel.tsx` (новый, заменяет `QuickDailyForecastPanel.tsx`)

Без пропсов, полностью самодостаточный. Состояние: `date` (default сегодня), `time` (default `12:00`), `location: Location | null` (место события через `LocationInput`, обязательно), `extraTime: boolean` (чекбокс «возможно дополнительное время», default false), `llm` (через `LLM_MODELS`/`DEFAULT_LLM`), `loading/error/result`, `showDetails`.

Валидация перед отправкой: нужны `date` + `time` + `location` — иначе локальная ошибка `eventAnalysis.validation.missingFields`. Если бэкенд вернул 400 — показываем его `detail` как есть.

**Таймзона — всегда таймзона выбранного места события** (Москва → `Europe/Moscow`, Сидней → `Australia/Sydney`): `target_date` уходит без офсета и трактуется бэкендом по `transit_timezone`, поэтому введённое время = местное время события. Источник таймзоны: подсказка городов (`LocationInput`) обычно возвращает её сама; если `location.timezone` отсутствует или `'UTC'` — дополнительно определяем по координатам через `geocodeAPI.detectTimezone(lat, lon)` (`src/services/api.ts:220`), тот же паттерн, что в старом `DailyForecast.tsx`. Пока таймзона места не определена — запрос не отправляем.

Запрос в `astrologyAPI.getDailyForecast` (метод и URL не меняются — тот же `/api/daily-forecast`). Отправляем **только** поля из контракта:
```ts
{
  target_date: `${date}T${time}:00`,        // локальное время события, без Z/офсета — трактуется по transit_timezone
  transit_timezone: location.timezone,       // IANA
  transit_place: location.display_name,
  transit_latitude: location.lat,
  transit_longitude: location.lon,
  llm_provider: llm.provider,
  llm_model: llm.model,
  ...(extraTime && { extra_time_possible: true }),
}
```
Никаких `birth_*`, `natal_chart`, `house_system` (контракт: лучше не передавать). Поля `language` в контракте нет — не отправляем.

Тип ответа — все поля опциональны (defensive rendering, без "гарантий" в тексте/логике):
```ts
interface KeyAspect { transit: string; aspect: string; natal: string; orb: number; weight: number; is_point: boolean; }
interface LordStrength { planet?: string; success_lord?: string; total_strength?: number; testimonies?: string[]; }
interface StrengthBreakdown { lord1?: LordStrength; lord7?: LordStrength; }
interface MoonReport { range?: string; effective_range?: string; events?: unknown[]; final?: string; }
interface LunarPhase { angle?: number; phase?: string; phase_ru?: string; }
interface RagSource { query?: string; text?: string; book_title?: string; chunk_id?: string | number; }
type MatchType = 'favourite_win_likely' | 'favourite_edge' | 'draw_likely' | 'underdog_edge' | 'underdog_win_likely';

interface EventAnalysisResult {
  score?: number;
  category?: 'critical' | 'challenging' | 'neutral' | 'favorable' | 'excellent';
  favorite?: string;
  opponent?: string;
  verdict?: string;
  summary?: string;
  match_type?: MatchType;
  base_score?: number;
  key_aspects?: KeyAspect[];
  strength_breakdown?: StrengthBreakdown;
  moon_report?: MoonReport;
  fortune?: number | null;
  fortune_antiscion?: number | null;
  lunar_phase?: LunarPhase;
  engine_notes?: string[];
  rag_sources?: RagSource[];
  llm_provider?: string;
  llm_model?: string;
  llm_error?: string | null;
  transit_data?: Record<string, unknown>;
  houses_activated?: number[];
  prompt_chars?: number;
  from_cache?: boolean;
  cached_at?: string;
}
```

Рендер (верхний блок, всё через `?.`, никаких допущений что поле есть):
- score/category бейдж — переиспользуем `CATEGORY_COLORS` (те же 5 значений). По контракту score 1–10: 5.5 = нейтрально, ниже — за аутсайдера, выше — за фаворита — рядом со score показываем подпись `match_type`.
- `match_type` — подпись через `t('eventAnalysis.matchType.' + result.match_type)`.
- `favorite` / `opponent` / `verdict` — три отдельных подписанных абзаца; если их нет, но есть `summary` — показываем `summary` как фоллбэк.
- `llm_error` — тот же паттерн баннера, что был (текст пришёл из расчётного fallback).
- `from_cache` — небольшая пометка "из кэша" (+`cached_at`, если есть).

Details-секция (сворачиваемая, `showDetails`):
- `base_score`, `houses_activated`, `fortune`, `fortune_antiscion`, `lunar_phase` — строка метаданных.
- `key_aspects` — та же таблица (transit/aspect/natal/orb/weight), что и раньше.
- `strength_breakdown.lord1`/`lord7` — планета/success_lord/сила/свидетельства.
- `moon_report`, `engine_notes`, `rag_sources` — списком, если есть.
- `llm_provider`/`llm_model` — служебная подпись.

Кэш в localStorage — свой префикс `event_analysis|...` (не `daily_forecast|...`), ключ из `date/time/location/extra_time/llm`.

### 2. `src/pages/EventAnalysis.tsx` (новый, заменяет `DailyForecast.tsx`)

Тонкая страница: `<Header/>` + hero (`eventAnalysisPage.title/subtitle`) + `<EventAnalysisPanel />`. Никакой формы рождения, никакого `calculateChart`.

### 3. Роут — `src/App.tsx`
`import DailyForecast` → `import EventAnalysis from './pages/EventAnalysis'`; путь `/:lang/daily-forecast` → `/:lang/event-analysis`.

### 4. Хедер — `src/components/Header.tsx`
Ссылка на `/${currentLangCode}/event-analysis`, текст `t('nav.eventAnalysis')`.

### 5. i18n — `ru.json` / `en.json`
- `nav.dailyForecast` → `nav.eventAnalysis` (единственный потребитель — Header).
- **Не трогать** `home.dailyForecast` и `dashboard.tabs.dailyForecast` (нетронутый поток).
- `dailyForecastPage.*` → `eventAnalysisPage.*` (`{ title, subtitle }`).
- **Не трогать** `dailyForecast.*` (namespace нетронутого `DailyForecastPanel.tsx`).
- Новый независимый namespace `eventAnalysis.*` (свои `categories.*`/`aspects.*`) с лейблами формы, favorite/opponent/verdict, `matchType.*` (5 значений), деталями, `llmFallback`, `fromCache`, валидацией — в обоих файлах.

### 6. Удаление старых файлов
`src/components/QuickDailyForecastPanel.tsx` и `src/pages/DailyForecast.tsx` — после того, как App.tsx/Header переключены и grep подтверждает отсутствие других ссылок.

## Не трогаем
`DailyForecastPanel.tsx`, его вызовы в `Dashboard.tsx`/`Home.tsx`/`AnalysisTabs.tsx`, i18n-ключи `dailyForecast.*`, `home.dailyForecast`, `dashboard.tabs.dailyForecast`. Метод `astrologyAPI.getDailyForecast` в `api.ts` не меняется.

## Проверка
- `npm run build` / `tsc` — без ошибок.
- Вручную: `/ru/event-analysis` через хедер, заполнить дату/время/место, запрос без `birth_*`/`natal_chart` (Network-таб), результат по новой схеме, детали открываются без падений при отсутствующих полях.
- Старый поток (Dashboard → таб "Прогноз дня", кнопка на Home) работает как прежде.
