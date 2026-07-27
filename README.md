# Weatherly

**[▶ Live on Vercel](https://vercel.com/mitchellray-ghs-projects/weatherly)** · A beautiful,
Apple-inspired weather app that gives you **minute-by-minute, hour-by-hour, day-by-day**, and a
**long-range outlook stretching from one year to more than a decade ahead** — for any location
on Earth, across every weather vector (temperature, feels-like, precipitation, wind, humidity,
dew point, UV, pressure, visibility, cloud cover, and sun times).

Built with **React 18 + TypeScript + Vite**, animated with **Framer Motion**, and powered by
the free **[Open-Meteo](https://open-meteo.com/)** APIs — no API key, no backend, just a static
single-page app that talks to the weather models directly from the browser.

> The live app is deployed on Vercel from this repository's `main` branch. The link above opens
> the Vercel project dashboard; the public production URL is available from that dashboard (or
> your custom domain).

## Features

- **Live conditions** with a dynamic, condition-aware full-bleed gradient background that
  shifts between day and night.
- **Next-hour precipitation** — animated 15-minute precipitation bars.
- **Hourly forecast** — 24-hour scrollable strip with icons and precip probability.
- **16-day forecast** with temperature-range bars.
- **Conditions grid** — UV index, wind compass, humidity/dew point, feels-like, pressure,
  visibility, cloud cover, and an animated sunrise/sunset arc.
- **Long-range outlook** (signature feature) — a merged timeline that shows the real forecast
  for the first ~16 days, then **climatological estimates** beyond, with confidence bands, a
  calendar heatmap, and month-by-month navigation across years. A **window selector
  (1Y · 2Y · 5Y · 10Y · Max)** lets you extend the prediction horizon.
- **Multiple saved locations**, geolocation, and unit toggles (°F/°C, mph/km·h, in/mm), all
  persisted locally.

## How the long-range outlook works (honestly)

Real numerical weather forecasts are only skillful to about **16 days**. Weatherly is honest
about this:

- **Days 0–16:** an actual forecast from high-resolution models (solid lines).
- **Beyond 16 days:** a **climatological estimate** — the historical normal for each calendar
  day computed from ~12 years of ERA5 reanalysis, optionally blended with **CMIP6 HighResMIP
  climate-model projections** (available out to 2050). These are drawn as dashed lines with a
  shaded confidence band that widens with lead time.

Estimates are statistical expectations, **not** a deterministic prediction, and are clearly
labeled as such throughout the UI. Uncertainty grows the further out you look.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
```

## Deployment

Weatherly is a fully static single-page app, so it can be hosted on any static host or CDN.

### Vercel (live)

The app is already deployed on Vercel and redeploys automatically on every push to `main`.
Vercel serves it at the domain root with no server component. To reproduce the setup:

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Configure the project (Vercel auto-detects most of this):

   | Setting              | Value           |
   | -------------------- | --------------- |
   | **Framework Preset** | Vite            |
   | **Build Command**    | `npm run build` |
   | **Output Directory** | `dist`          |
   | **Install Command**  | `npm install`   |

3. Deploy. No environment variables are required — the Vite config automatically uses a `/`
   base path on Vercel (it detects the `VERCEL` build variable). To force a specific base on
   any host, set the `VITE_BASE` environment variable (e.g. `VITE_BASE=/`).

### GitHub Pages (alternative)

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds the app and publishes it to
GitHub Pages on every push to `main`. In the repository, go to **Settings → Pages → Build and
deployment → Source: GitHub Actions** to enable it.

The Vite `base` defaults to `/Weatherly/` for GitHub Pages (correct for
`https://<user>.github.io/Weatherly/`). Override with the `VITE_BASE` environment variable for
other hosts.

## Tech stack

- **React 18** + **TypeScript** (strict) + **Vite 6**
- **Framer Motion** for spring animations and transitions
- Plain CSS with design tokens (no UI framework); hand-rolled SVG charts (no charting library)
- **Open-Meteo** Forecast, Historical (ERA5), Geocoding, and Climate (CMIP6) APIs

## Data & attribution

Weather and climate data by [Open-Meteo](https://open-meteo.com/) (CC BY 4.0). Climate
projections use CMIP6 HighResMIP models. This app is for informational purposes only.
