# Отрисовка астрологических колёс (карт)

Документация по тому, **как в этом проекте рисуются астрологические колёса** (натал,
синастрия, транзиты и т.д.), и на чём это построено.

## Коротко

- Колёса рисуются **на фронтенде, в браузере** — не на бэкенде.
- Используется библиотека **[AstroChart](https://github.com/AstroDraw/AstroChart)** —
  npm-пакет [`@astrodraw/astrochart`](https://www.npmjs.com/package/@astrodraw/astrochart)
  версии **3.0.2**, лицензия **MIT**.
- Бэкенд (`astrology_v2.py`) отдаёт **только JSON с позициями** (градусы планет,
  куспиды домов). Геометрию круга строит клиент.
- Юридически чисто: MIT на клиенте + свой расчётный бэкенд. Открывать код не обязаны.

## Ссылки на оригинал

- Репозиторий (исходники, MIT): https://github.com/AstroDraw/AstroChart
- npm: https://www.npmjs.com/package/@astrodraw/astrochart
- Демо / примеры: https://github.com/AstroDraw/AstroChart#usage
- Локально установленные типы (точный API):
  `node_modules/@astrodraw/astrochart/dist/project/src/*.d.ts`

## Файлы отрисовки в этом проекте

| Файл | Назначение |
|------|-----------|
| `AstroChartComponent.tsx` | Одиночное колесо (натал). `chart.radix(...)` + аспекты. Кастомный символ Вертекса через `CUSTOM_SYMBOL_FN`. |
| `SynastryChartComponent.tsx` | Синастрия (двойная карта). Сейчас реализована **неполно** — см. ниже. |
| `SynastryChartComponent-draft.tsx` | Черновой вариант синастрии. Свериться перед доработкой. |
| `PlanetTable.tsx` | Таблица позиций планет (не колесо). |

Используются в: `src/pages/Home.tsx` (натал), `src/pages/Synastry.tsx` (синастрия).

## Как это работает

```ts
import('@astrodraw/astrochart').then(({ Chart }) => {
  const chart = new Chart(containerId, size, size, settings)
  const radix = chart.radix({ planets, cusps })   // рисует натал-круг
  radix.addPointsOfInterest(planets)
  radix.aspects(calculatedAspects)                // линии аспектов
})
```

Формат входных данных (`AstroData`):

```js
{
  planets: { "Sun":[30], "Moon":[0, -1.2], ... },  // [градус] или [градус, скорость]
  cusps:   [300, 340, 30, 60, 75, 90, 116, 172, 210, 236, 250, 274]  // ровно 12 куспидов
}
```

Второй элемент в `planets` (скорость) → библиотека сама помечает **ретроградность**.

## Возможности библиотеки (API)

Публичный экспорт: **`Chart`**, **`AspectCalculator`**, **`Settings`**.

### `Chart(elementId, width, height, settings?)`
- `.radix(data)` → натал-колесо, возвращает `Radix`.
- `.scale(factor)` → масштабирование.
- `.calibrate()` → отладочная разметка осей.

### `Radix` (внутренний круг / натал)
- `.aspects(customAspects?)` → рисует линии аспектов.
- `.addPointsOfInterest(points)` → добавить точки (As/Ds/Mc/Ic и пр.) в расчёт аспектов.
- **`.transit(data)` → рисует ВТОРОЕ (внешнее) кольцо, возвращает `Transit`.**
  Это и есть настоящий би-виил: натал + транзит/синастрия/прогрессия «одна на другую».

### `Transit` (внешнее кольцо)
- `.drawPoints()`, `.drawCusps()`, `.drawRuler()`, `.drawCircles()`
- `.aspects(customAspects)` → **межкартные** аспекты (натал ↔ транзит).
- `.animate(data, duration, isReverse, callback)` → анимация движения планет во времени.

### `AspectCalculator(toPoints, settings?)`
- `.radix(points)` → аспекты внутри одной карты.
- `.transit(points)` → аспекты между двумя картами (учитывает скорость).
- Возвращает `FormedAspect[]`: `{ point, toPoint, aspect:{name,degree,color,orbit}, precision }`.

### `Zodiac` (утилита)
- `.getSign(deg)`, `.getHouseNumber(deg)`, `.isRetrograde(speed)`, `.toDMS(deg)`
- `.getDignities(planet)` → достоинства (обитель/изгнание/экзальтация/падение).

## Настройки (`Settings`)

Аспекты и орбисы (дефолты библиотеки, полностью переопределяемы через `settings.ASPECTS`):

| Аспект | Угол | Орбис | Цвет |
|--------|------|-------|------|
| conjunction | 0° | 10° | transparent |
| square | 90° | 8° | `#FF4500` |
| trine | 120° | 8° | `#27AE60` |

_(+ opposition / sextile в том же объекте `ASPECTS`.)_

Другое, что настраивается:
- **Геометрия:** `SYMBOL_SCALE`, `MARGIN`, `PADDING`, `RULER_RADIUS`,
  `INNER_CIRCLE_RADIUS_RATIO`, `COLLISION_RADIUS` (разведение слипшихся планет),
  `SHIFT_IN_DEGREES` (что слева; по умолчанию Asc слева), `STROKE_ONLY`, `ADD_CLICK_AREA`.
- **Цвета:** фон, точки, знаки, круги, линии + отдельный цвет каждого из 12 знаков.
- **Символы:** переопределяемые глифы всех планет (включая Chiron, Lilith, узлы,
  Fortune) и осей As/Ds/Mc/Ic + куспидов 1–12.
- **`CUSTOM_SYMBOL_FN(name, x, y, context)`** → свой SVG-глиф для любой точки
  (в проекте так нарисован Вертекс `Vx`).
- **Достоинства:** `SHOW_DIGNITIES_TEXT` и символы r/d/e/E/f.

## Что уже умеет библиотека, но у нас НЕ задействовано

1. **Настоящее двойное кольцо** через `radix.transit()` — транзиты, синастрия,
   прогрессии как наложение. Сейчас в `SynastryChartComponent.tsx` второй человек
   добавлен через `addPointsOfInterest(planets2)` (точки поверх), а не как второе кольцо.
2. **Межкартные аспекты** через `AspectCalculator.transit()` + `Transit.aspects()`.
3. **Анимация** транзитов во времени (`Transit.animate`).
4. В `Synastry.tsx` в компонент передаются пропсы `aspects`, `name1`, `name2`,
   которых нет в сигнатуре `SynastryChartComponent` — они **игнорируются**.

> Для полноценных двойных карт дорабатывать нужно только фронт: перевести
> синастрию/транзиты на `radix.transit()` и прокинуть межкартные аспекты и имена.
