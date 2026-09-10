# Drawing the astrological wheels

How the charts in this project are rendered, and what the drawing stack can and
cannot do.

## In short

- Wheels are drawn **in the browser**, not on the backend.
- There are **two independent rendering paths**, not one:
  - **natal chart** — the [AstroChart](https://github.com/AstroDraw/AstroChart)
    library ([`@astrodraw/astrochart`](https://www.npmjs.com/package/@astrodraw/astrochart)
    3.0.2, MIT);
  - **synastry** — hand-written d3, no library involved.
- The backend returns **only JSON** — planet longitudes and house cusps. All
  geometry is built client-side.
- Licensing is clean: MIT on the client plus our own calculation backend. There
  is no obligation to open the source.

## Files

| File | Role |
|------|------|
| `AstroChartComponent.tsx` | Natal wheel via AstroChart: `chart.radix(...)` plus aspects. Custom Vertex glyph through `CUSTOM_SYMBOL_FN`. |
| `SynastryChartComponentV2.tsx` | Synastry bi-wheel, drawn with d3 from scratch. |
| `LiveSkyFrame.tsx` | Decorative frame around a wheel (stars, comet) and the fullscreen view. Draws no chart itself. |
| `PlanetTable.tsx` | Planet positions table — not a wheel. |
| `AspectGrid.tsx` | Aspect list — not a wheel. |

Used from: `pages/Home.tsx` (natal), `pages/Synastry.tsx` (synastry),
`pages/Dashboard.tsx` (both).

## Natal wheel — the AstroChart library

```ts
import('@astrodraw/astrochart').then(({ Chart, AspectCalculator }) => {
  const chart = new Chart(containerId, size, size, settings)
  const radix = chart.radix({ planets, cusps })
  radix.addPointsOfInterest(planets)
  radix.aspects(calculatedAspects)
})
```

The import is dynamic, so the library is not part of the initial bundle.

Input format (`AstroData`):

```js
{
  planets: { "Sun": [30], "Moon": [0, -1.2], ... },  // [degree] or [degree, speed]
  cusps:   [300, 340, 30, 60, 75, 90, 116, 172, 210, 236, 250, 274]  // exactly 12
}
```

The second element (speed) is what marks a planet **retrograde** — the library
derives it, there is no separate flag.

### Aspect settings used here

Orbs are widened against the library defaults, and sextile is added — the
library does not ship one:

| Aspect | Degree | Orb (ours / default) | Color |
|--------|--------|----------------------|-------|
| conjunction | 0° | 12 / 10 | transparent |
| sextile | 60° | 8 / — | `#1E90FF` |
| square | 90° | 10 / 8 | `#FF4500` |
| trine | 120° | 10 / 8 | `#27AE60` |
| opposition | 180° | 12 / 10 | `#27AE60` |

Opposition being green, the same as trine, is the library's own default, not an
oversight here.

`SHOW_DIGNITIES_TEXT` is turned off. `CUSTOM_SYMBOL_FN` draws one glyph the
library has no symbol for — the Vertex (`Vx`), as a circle with a text label.

### Two gotchas

- **The container id must be unique per instance.** It is generated from a
  running counter, not `Date.now()`: the fullscreen view renders a *second*
  copy of the wheel over the first, and on a millisecond collision both would
  get the same id — the library resolves the container by `getElementById` and
  would draw the second chart inside the first.
- **`size` is the drawing's reference resolution, not its on-screen width.**
  The library writes `viewBox="0 0 size size"` on the SVG root and sets
  width/height in pixels. Those are presentation attributes with the lowest
  specificity, so the CSS rule `.chart-wheel-fluid > svg` overrides them — the
  wheel is fluid without redrawing on resize.

## Synastry wheel — d3

`SynastryChartComponentV2.tsx` does not use AstroChart at all. It draws two
full wheels on one zodiac, rotated to Partner 1's ASC:

- **inner ring** — Partner 1: planets plus the full house grid (ASC/IC/DSC/MC);
- **outer ring** — Partner 2: planets plus their own house ring;
- **center** — inter-chart aspects, colored by type (red = hard, blue = soft,
  green = conjunction), each with a hover tooltip.

**Rule for any d3 or canvas component in this repository:** text inside a draw
effect is baked into the d3 handler at draw time, not recomputed on React
render. Any translated string there obliges you to add `t` and `i18n.language`
to the effect's dependencies, otherwise the wheel keeps the old language after
a switch.

Aspect names live in two parallel lists — `ASPECT_STYLE` in this component and
`planets.aspectNames` in the locale files. Adding a new aspect type means
editing both.

## What the library offers and we do not use

These apply to the natal path only; the synastry wheel is ours and unrelated.

1. **A true double ring** via `radix.transit()` — transits, synastry or
   progressions as one overlay, returning a `Transit` object.
2. **Inter-chart aspects** via `AspectCalculator.transit()` and
   `Transit.aspects()`.
3. **Animation** of planets over time — `Transit.animate(data, duration,
   isReverse, callback)`.
4. **The `Zodiac` helper** — `getSign`, `getHouseNumber`, `isRetrograde`,
   `toDMS`, and `getDignities` (rulership / detriment / exaltation / fall).

## Library API reference

Public exports: **`Chart`**, **`AspectCalculator`**, **`Settings`**.

**`Chart(elementId, width, height, settings?)`**
`.radix(data)` → the natal wheel, returns `Radix`; `.scale(factor)`;
`.calibrate()` for debug axes.

**`Radix`** — `.aspects(customAspects?)`, `.addPointsOfInterest(points)`,
`.transit(data)` → the outer ring, returns `Transit`.

**`Transit`** — `.drawPoints()`, `.drawCusps()`, `.drawRuler()`,
`.drawCircles()`, `.aspects(customAspects)`, `.animate(...)`.

**`AspectCalculator(toPoints, settings?)`** — `.radix(points)` for aspects
within one chart, `.transit(points)` for aspects between two (speed-aware).
Returns `FormedAspect[]`: `{ point, toPoint, aspect: { name, degree, color,
orbit }, precision }`.

### Configurable settings

- **Geometry** — `SYMBOL_SCALE`, `MARGIN`, `PADDING`, `RULER_RADIUS`,
  `INNER_CIRCLE_RADIUS_RATIO`, `COLLISION_RADIUS` (spreading overlapping
  planets), `SHIFT_IN_DEGREES` (what sits on the left; ASC by default),
  `STROKE_ONLY`, `ADD_CLICK_AREA`.
- **Colors** — background, points, signs, circles, lines, and a separate color
  per zodiac sign.
- **Symbols** — every planet glyph (Chiron, Lilith, nodes, Fortune included),
  the AS/DS/MC/IC axes and cusps 1–12.
- **`CUSTOM_SYMBOL_FN(name, x, y, context)`** — your own SVG glyph for any
  point.
- **Dignities** — `SHOW_DIGNITIES_TEXT` and the r/d/e/E/f symbols.

Exact typings: `node_modules/@astrodraw/astrochart/dist/project/src/*.d.ts`.
