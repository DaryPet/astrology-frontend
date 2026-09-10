# Astrology Frontend

Single-page web application for astrological chart work: natal charts,
synastry, transits and secondary progressions, each with an AI-generated
interpretation and a follow-up chat about the chart.

The app is the client half of a two-part system. All astronomical computation
happens on a separate backend service; this repository owns the interface, the
chart drawing, user accounts, saved charts and the streaming of AI
interpretations to the screen.

## Features

**Natal chart.** Built from date, time and place of birth. Place lookup with
autocomplete resolves coordinates and the IANA timezone, so a birth time is
never interpreted in the wrong zone. The wheel is drawn in the browser; a
planet table and an aspect grid accompany it.

**Synastry.** Two charts compared as one bi-wheel — inner ring for the first
partner, outer for the second — with the cross-aspects between them listed
alongside. Any aspect can be opened for an individual interpretation.

**Transits.** The current sky against the natal chart for any chosen day, past
or future, at any chosen location. Slow aspects are presented separately from
fast ones: the first are the themes of a period, the second the colouring of a
single day. Finished analyses are kept in a browsable history.

**Secondary progressions.** The "a day for a year" technique for the natal
chart and, separately, for both partners of a synastry — including the period
dynamics, i.e. which aspects have newly formed and which have faded.

**AI interpretation.** Every chart type has a written interpretation produced
by an LLM on the backend, retrieved over server-sent events and typed onto the
screen as it arrives. Two depths are available, *simple* and *advanced*. A
generation survives navigation: leaving the page and coming back reconnects to
the run still in progress rather than starting a second one.

**Chat about the chart.** A conversation bound to a specific saved chart, with
history persisted in the database.

**Accounts and saved charts.** Registration with email confirmation, password
reset, and up to 5 saved charts per user. Charts can be renamed, duplicated
and deleted.

**Three languages and two themes.** Russian, English and Ukrainian, selected
by a URL prefix (`/en/dashboard`), with `<html lang>`, page title and meta
description kept in sync. Light and dark themes.

### In development

`/:lang/event-analysis` — event astrology. The route exists and is reachable,
but the feature is unfinished and intentionally left out of the description
above.

## Tech stack

| Area | Choice |
|------|--------|
| Framework | React 18, TypeScript |
| Build | Vite 5 |
| Routing | React Router 6 |
| Auth & database | Supabase (PostgreSQL) |
| HTTP | axios |
| Natal wheel | [`@astrodraw/astrochart`](https://github.com/AstroDraw/AstroChart) 3.0.2 (MIT) |
| Synastry wheel | d3 (custom rendering) |
| Forms | Formik + Yup |
| i18n | i18next, react-i18next |
| Icons | lucide-react |
| Hosting | Vercel |

Chart geometry is built client-side. The backend returns only JSON — planet
positions in degrees and house cusps — and the circle is drawn from that.

## Architecture

```
Browser ──▶ React SPA (this repository)
              │
              ├──▶ Supabase ── auth, saved charts, chat history, usage counters
              │
              └──▶ Backend API ── ephemeris calculation, RAG over reference
                                   texts, LLM interpretation (SSE stream)
```

Interpretation endpoints stream: the backend emits `stage` events
(`searching` → `generating`) followed by text deltas, and the client types the
text out as it arrives. Non-streaming endpoints (`/chart/calculate`,
`/synastry/direct`, `/transits`, `/progressions`, …) are plain JSON over axios.

### Database tables

| Table | Holds |
|-------|-------|
| `natal_charts` | saved charts |
| `chart_interpretations` | generated interpretation texts |
| `chat_messages` | per-chart chat history |
| `transits_usage_log` | daily transit-analysis counter |

## Getting started

Requirements: Node.js 18+ and npm.

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

The dev server listens on `http://localhost:12001` and proxies `/api`, `/docs`
and `/health` to the backend at `VITE_API_URL`.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend base URL (defaults to `http://localhost:8080`) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

All three are required: the app throws on startup if the Supabase pair is
missing. Note that `.env.example` currently lists only `VITE_API_URL`.

## Scripts

| Command | Does |
|---------|------|
| `npm run dev` | Dev server with HMR on port 12001 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint over the whole project |
| `npm run lint:fix` | ESLint with autofix |

## Project structure

```
src/
├── pages/           route-level screens (Home, Synastry, Dashboard, auth)
├── components/      wheels, tables, panels, modals
├── services/        backend API, Supabase access, SSE streaming
├── hooks/           streamed text, modal viewport
├── context/         auth and theme providers
├── i18n/            i18next setup and ru/en/uk dictionaries
├── styles/          global, shared UI and dashboard stylesheets
└── utils/           in-flight and stream-text registries
```

`src/components/README.md` documents how the chart wheels are drawn and what
the drawing library can do.

## Limits

Free-tier limits enforced in the client:

- 5 saved charts per user
- 5 transit analyses per day
- 5 transit analyses kept in the browsable history
- 50 messages per chart chat

## Deployment

Deployed on Vercel. `vercel.json` rewrites `/api/*` to the backend service and
routes everything else to `index.html` for client-side routing.
