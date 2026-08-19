# Weatherly

**[▶ Live on Vercel](https://vercel.com/mitchellray-ghs-projects/weatherly)** · A unified
**environmental intelligence platform** that combines weather forecasting, climate projections,
natural disaster monitoring, risk assessment, and professional reporting — all in a single,
free, zero-backend single-page app.

Built with **React 18 + TypeScript + Vite**, animated with **Framer Motion**, and powered entirely
by free APIs — **Open-Meteo** (weather/climate), **CARTO / ESRI / OpenTopoMap** (maps),
**USGS / NASA EONET / GDACS** (disasters) — no API keys, no backend, no costs.

> The live app is deployed on Vercel from this repository's `main` branch.

## Features

### Weather Intelligence

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
- **6 weather overlay layers** — Precipitation, Wind, Temperature, Cloud Cover, Pressure, and
  Snowfall. Each renders as a color-ramped grid fetched live from Open-Meteo.
- **Wind directional arrows** — large, color-coded arrows showing wind speed and direction.
- **Per-layer legends** — every weather layer shows a color scale with tick labels and units.
- **GeoRadar 3D** — wireframe terrain mesh with weather data tinting. Full zoom and tilt.

### Natural Disasters

- **⚠️ Alerts tab** in the topbar opens a full-screen disasters sheet with an interactive
  world map.
- **3 free data sources** (no API keys):
  - **USGS** — M4.5+ earthquakes from the past 30 days
  - **NASA EONET** — wildfires, volcanoes, severe storms, floods
  - **GDACS** — cyclones, floods, droughts, forest fires (RSS feed)
- **Interactive world map** — pan and zoom, dark CARTO basemap, color-coded pins by type.
- **Filter by type** — toggle chips for all disaster categories.
- **Filter by date range** — 1d, 3d, 5d, 7d, 14d, 30d.
- **Natural language search** — type queries like "earthquakes near Tokyo past 7 days" and
  filters are auto-applied.
- **Data export** — download filtered disasters as **GeoJSON** (for QGIS/ArcGIS) or **CSV**
  (for Excel/Google Sheets).
- **Detail modals** — tap any pin or card for date, coordinates, severity, source, and link
  to the full report.

### Risk Assessment

- **Risk score (0–100)** displayed below current conditions, blending:
  - Weather severity (wind, temperature extremes, precipitation, storms)
  - Disaster proximity (nearby earthquakes, wildfires, cyclones)
  - Air quality (AQI-based scoring)
  - Terrain exposure (altitude, coastal storm belts)
  - Environmental exposure (visibility, UV index)
- **Color-coded risk levels** — Minimal (green) → Low → Moderate → High → Extreme (red).

### Threshold Alerting

- **⚡ Thresholds button** in the topbar opens the alert management sheet.
- **Create custom rules** — "Alert me when wind > 80 km/h" or "Temperature below -10°".
- **10 metric types** — temperature, feels-like, wind speed, wind gusts, precipitation,
  humidity, UV index, visibility, pressure, AQI.
- **5 comparison operators** — above, below, at least, at most, equals.
- **Browser notifications** — get notified when conditions breach your thresholds.
- **Per-location rules** with configurable cooldowns (15 min to 6 hours).
- Rules persist in localStorage across sessions.

### PDF Reports

- **📄 Report button** in the topbar generates a professional A4 intelligence report.
- **One-click PDF download** with:
  - Current conditions summary
  - Risk assessment with factor breakdown
  - 7-day forecast table
  - Active disaster list
  - Air quality data
- Code-split and lazy-loaded — only downloads when you click the button.

### Email Summaries

- **📧 Email button** opens the email settings sheet.
- **Web3Forms integration** — free email delivery, no backend needed.
- **Configurable frequency** — daily or weekly summaries.
- **Toggle content** — include/exclude forecast, disasters, risk score.
- **Test send** — send a test summary to verify your setup.

### Auto-Disaster Reports

- **Automatic monitoring** — the app watches for M6+ earthquakes and Cat 3+ cyclones.
- **Alert banner** — when a severe disaster is detected, a purple gradient banner appears
  at the top of the app with event details.

### PWA & Offline

- **Installable** — add Weatherly to your home screen or desktop.
- **Service worker** — caches Open-Meteo API responses, basemap tiles, and USGS data.
- **Works offline** — cached weather data and map tiles are available without a connection.

### Design

- **3 visual themes** — Vivid (dynamic gradient), Book (warm almanac), Geo (immersive scenes).
- **Frosted-glass UI** — backdrop-blur cards and panels throughout.
- **High-contrast weather controls** — dark-backed, high-contrast text for readability.
- **Framer Motion** spring animations on sheets, transitions, and interactions.
- **Fully responsive** — phones, tablets, and desktop.

## How the long-range outlook works (honestly)

Real numerical weather forecasts are only skillful to about **16 days**. Weatherly is honest
about this:

- **Days 0–16:** an actual forecast from high-resolution models (solid lines).
- **Beyond 16 days:** a **climatological estimate** — the historical normal for each calendar
  day computed from ~12 years of ERA5 reanalysis, optionally blended with **CMIP6 HighResMIP
  climate-model projections** (available out to 2050). These are drawn as dashed lines with a
  shaded confidence band that widens with lead time.

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

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Configure:

   | Setting              | Value           |
   | -------------------- | --------------- |
   | **Framework Preset** | Vite            |
   | **Build Command**    | `npm run build` |
   | **Output Directory** | `dist`          |
   | **Install Command**  | `npm install`   |

3. Deploy. No environment variables required.

### GitHub Pages (alternative)

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and publishes to GitHub
Pages on every push to `main`.

## Tech stack

- **React 18** + **TypeScript** (strict) + **Vite 6**
- **Framer Motion** for spring animations and transitions
- **@react-pdf/renderer** for PDF report generation (lazy-loaded)
- **vite-plugin-pwa** for service worker and installability
- Plain CSS with design tokens (no UI framework); hand-rolled SVG charts
- Canvas-based map tile engine with Web Mercator projection
- **Open-Meteo** Forecast, Historical (ERA5), Geocoding, and Climate (CMIP6) APIs
- **CARTO / ESRI / OpenTopoMap** for basemap tiles (free, CORS-enabled)
- **USGS Earthquake API**, **NASA EONET**, and **GDACS RSS** for natural disaster data
- **Web3Forms** for free email delivery (no backend)

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
- [x] Natural language search in disasters ("earthquakes near Tokyo past 7 days")
- [x] Data export (GeoJSON + CSV)
- [x] Risk scoring engine (0–100, multi-factor)
- [x] Threshold alerting with browser notifications
- [x] PDF report generation (A4 intelligence reports)
- [x] Email summaries via Web3Forms (daily/weekly)
- [x] Auto-disaster report banner (M6+ / Cat 3+)
- [x] PWA with offline support and service worker caching

### Phase 3 — Multi-User (planned)

- [ ] **Clerk authentication** — sign-up/sign-in with 50K free users
- [ ] **Shared workspaces** — team dashboards with roles (Admin/Operator/Viewer)
- [ ] **Real-time sync** — "big screen" mode for emergency ops centers

### Phase 4 — Integration (planned)

- [ ] **Embed widget** — one-line `<iframe>` for existing portals
- [ ] **REST API** — Cloudflare Worker: `/api/disasters`, `/api/weather`, `/api/risk`
- [ ] **Supply chain map** — upload CSV of warehouse locations with risk overlay

### Phase 5 — Intelligence (planned)

- [ ] **Climate dashboard** — 10-year temperature/precip trends + CMIP6 projections
- [ ] **Disaster history browser** — past disasters by year/region with trend charts
- [ ] **Multi-language support** — EN/ES/FR/JA/PT/DE/ZH via react-i18next
