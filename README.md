# Weatherly

**[▶ Live on Vercel](https://vercel.com/mitchellray-ghs-projects/weatherly)** · A beautiful,
Apple-inspired weather app that gives you **minute-by-minute, hour-by-hour, day-by-day**, and a
**long-range outlook stretching from one year to more than a decade ahead** — for any location
on Earth, across every weather vector (temperature, feels-like, precipitation, wind, humidity,
dew point, UV, pressure, visibility, cloud cover, and sun times).

Built with **React 18 + TypeScript + Vite**, animated with **Framer Motion**, and powered by
free APIs — **Open-Meteo** for weather, **CARTO / ESRI / OpenTopoMap** for maps, **USGS / NASA EONET / GDACS** for natural disasters — no API keys, no backend, just a static
single-page app that talks to the data sources directly from the browser.

> The live app is deployed on Vercel from this repository's `main` branch. The link above opens
> the Vercel project dashboard; the public production URL is available from that dashboard (or
> your custom domain).

## Features

### Weather

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

### Interactive Maps

- **5 basemap styles** — Street (CARTO), Topographic, Satellite (ESRI), Terrain, and Dark.
  Switch instantly via the layer picker on the radar map.
- **6 weather overlay layers** — Precipitation, Wind, Temperature, Cloud Cover, Pressure, and
  Snowfall. Each renders as a color-ramped grid fetched live from Open-Meteo, composited over
  the basemap tiles.
- **Wind directional arrows** — large, color-coded arrows showing wind speed and direction
  across the map grid.
- **Per-layer legends** — every weather layer shows a color scale with tick labels and units
  so you can read values at a glance.
- **Layer controls** — opacity slider, basemap style picker, and weather layer selector, all
  in a frosted-glass panel.
- **GeoRadar 3D** — a WebGL-style wireframe terrain mesh with weather data tinting (precipitation
  raises glowing peaks, temperature shifts the terrain palette, snow turns the mesh white).
  Full zoom and tilt controls.

### Natural Disasters

- **⚠️ Alerts tab** in the topbar opens a full-screen disasters sheet with an interactive
  world map.
- **3 free data sources** (no API keys):
  - **USGS** — M4.5+ earthquakes from the past 30 days
  - **NASA EONET** — wildfires, volcanoes, severe storms, floods
  - **GDACS** — cyclones, floods, droughts, forest fires (RSS feed)
- **Interactive world map** — pan and zoom, dark CARTO basemap, color-coded pins by disaster
  type. Earthquake pins show magnitude rings.
- **Filter by type** — toggle chips for Earthquakes, Wildfires, Volcanoes, Floods, Cyclones,
  Droughts, Storms, and Other.
- **Filter by date range** — pill buttons for 1d, 3d, 5d (default), 7d, 14d, and 30d.
- **Scrollable event list** — sorted newest first, with relative timestamps ("2h ago", "3d ago").
- **Detail modals** — tap any pin or card to see date, coordinates, severity, source, and a
  link to the full report on the source website.

### Design

- **3 visual themes** — Vivid (dynamic gradient), Book (warm almanac on dark paper), and Geo
  (immersive scroll-snap scenes with parallax SVG backgrounds).
- **Frosted-glass UI** — backdrop-blur cards and panels throughout.
- **High-contrast weather controls** — all map overlays and legends use dark-backed,
  high-contrast text for readability on any background.
- **Framer Motion** spring animations on sheets, transitions, and interactions.
- **Fully responsive** — works on phones, tablets, and desktop.

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
- Canvas-based map tile engine with Web Mercator projection
- **Open-Meteo** Forecast, Historical (ERA5), Geocoding, and Climate (CMIP6) APIs
- **CARTO / ESRI / OpenTopoMap** for basemap tiles (free, CORS-enabled)
- **USGS Earthquake API**, **NASA EONET**, and **GDACS RSS** for natural disaster data

## Data & attribution

Weather and climate data by [Open-Meteo](https://open-meteo.com/) (CC BY 4.0). Climate
projections use CMIP6 HighResMIP models. Map tiles © OpenStreetMap contributors, © CARTO,
© Esri. Earthquake data by USGS. Natural event data by NASA EONET. Disaster alerts by GDACS.
This app is for informational purposes only.

---

## Feature Roadmap

### Completed

- [x] Live conditions with dynamic gradient background
- [x] Next-hour precipitation animation
- [x] 24-hour hourly forecast strip
- [x] 16-day daily forecast with temperature bars
- [x] Conditions grid (UV, wind, humidity, pressure, visibility, cloud, sun arc)
- [x] Long-range climate outlook (1–10+ year estimates with confidence bands)
- [x] Multiple saved locations with geolocation
- [x] Unit toggles (°F/°C, mph/km·h, in/mm)
- [x] 3 visual themes (Vivid, Book, Geo)
- [x] Geo mode with scroll-snap scenes and parallax SVG backgrounds
- [x] Interactive radar map with precipitation animation
- [x] 5 basemap styles (Street, Topo, Satellite, Terrain, Dark)
- [x] 6 weather overlay layers (precipitation, wind, temperature, cloud, pressure, snow)
- [x] Per-layer color legends with tick labels and units
- [x] GeoRadar 3D wireframe terrain with weather tinting
- [x] Natural disasters tab with interactive world map
- [x] Multi-source disaster data (USGS + NASA EONET + GDACS)
- [x] Filter by disaster type and date range
- [x] Detail modals with source links

### Planned

- [ ] **Weather alerts integration** — NWS severe weather alerts for US locations, displayed as
  banner notifications and on the map
- [ ] **Air quality index map overlay** — global AQI heat layer using Open-Meteo air quality data
- [ ] **Satellite imagery layer** — GOES/Meteosat visible and infrared imagery as a map overlay
- [ ] **Severe weather notifications** — push/browser notifications for approaching storms,
  extreme temperatures, or high UV at saved locations
- [ ] **Hourly wind/gust map** — animated wind barbs or streamlines on the map, updated hourly
- [ ] **Disaster impact zones** — draw radius polygons around earthquake epicenters and cyclone
  tracks showing estimated affected area
- [ ] **Historical disaster explorer** — browse past disasters by year and region with charts
  showing frequency and severity trends
- [ ] **Customizable dashboard** — drag-and-drop reordering of metric cards and sections
- [ ] **Widgets / home screen** — iOS/Android widget support via Capacitor or PWA manifest
- [ ] **Multi-language support** — i18n for top weather markets (Spanish, French, Japanese, etc.)
- [ ] **Offline mode** — cache last-known weather data and map tiles for offline viewing
- [ ] **Social sharing** — share weather snapshots or disaster alerts as formatted cards
