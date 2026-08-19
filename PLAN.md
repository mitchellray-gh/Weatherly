# Plan: Add Topographical & Weather Map Layers to Weatherly

## Goal
Add topographical basemap styles, terrain overlays (hillshade, contour lines), and
additional weather layers (wind, temperature, cloud cover, etc.) to every map view
in the app — all using free, no-API-key tile providers.

---

## Part 1 — Topographical Basemap Styles

### 1A. Extend `src/lib/basemap.ts`
- Add a `BasemapStyle` type with an ID, label, tile URL template, and attribution.
- Define styles:
  - `carto` — current CARTO Voyager (existing, default)
  - `topo` — **OpenTopoMap** (`https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png`)
  - `satellite` — **ESRI World Imagery** (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`)
  - `terrain` — **ESRI World Terrain** (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_BaseMap/MapServer/tile/{z}/{y}/{x}`)
  - `dark` — **CARTO Dark Matter** (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`)
- Refactor `computeBasemap()` to accept a `BasemapStyle` parameter (defaulting to `carto`).
- Update tile URL generation to use the style's template.

### 1B. Add overlay types to `src/lib/basemap.ts`
- Add `OverlayDef` type: `{ id, label, tileUrlTemplate, attribution, defaultOpacity }`.
- Define overlays:
  - `hillshade` — **Stamen Terrain Labels** hillshade tiles via OpenFreeMap or Terrain-RGB
  - `contours` — **OpenTopoMap contour lines** (the topo tiles have contours baked in; provide a transparent contour-only overlay option using OpenMapTiles contour tiles from `https://tiles.openmaptiles.org/...` or use the OpenTopoMap tile as a semi-transparent layer)
- Add `computeOverlay()` function (same Mercator math, different URL template).

### 1C. New file: `src/lib/weatherLayers.ts`
- Define `WeatherLayer` type: `{ id, label, icon, color, source, variable }`.
- Define weather overlay layers fetched from Open-Meteo's grid endpoints:
  - **Wind** — fetch `wind_speed_10m` + `wind_direction_10m` on the grid → render as animated arrows/streamlines on canvas.
  - **Temperature** — fetch `temperature_2m` → color-ramp heatmap overlay.
  - **Cloud Cover** — fetch `cloud_cover` → grayscale overlay.
  - **Pressure** — fetch `surface_pressure` → isobar-style overlay (or color ramp).
  - **Snow** — fetch `snowfall` → blue-tinted overlay.
- Each layer reuses the existing grid-fetch pattern from `radar.ts` (N×N Open-Meteo points, bilinear interpolation).
- Add color-ramp functions for each variable (similar to `radarColor()`).

---

## Part 2 — Shared Map Layer Controls

### 2A. New file: `src/components/MapLayers.tsx` + `MapLayers.css`
- A small, reusable layer-picker panel:
  - **Basemap row**: horizontal icon buttons for each basemap style (thumb preview or icon).
  - **Overlays row**: toggle chips for hillshade, contours.
  - **Weather row**: toggle chips for wind, temperature, cloud, pressure, snow.
  - Opacity slider for the active weather overlay.
- Renders as a collapsible popover/flyout anchored to a "layers" button (map-stack icon).
- Props: `basemap`, `onBasemapChange`, `overlays`, `onOverlaysChange`, `weatherLayer`, `onWeatherLayerChange`, `opacity`, `onOpacityChange`.

### 2B. New type: `src/types.ts` additions
```ts
export type BasemapStyleId = 'carto' | 'topo' | 'satellite' | 'terrain' | 'dark'
export type OverlayId = 'hillshade' | 'contours'
export type WeatherLayerId = 'precipitation' | 'wind' | 'temperature' | 'cloud' | 'pressure' | 'snow'
```

---

## Part 3 — Integrate into RadarMap (2D canvas map)

### 3A. Modify `src/components/RadarMap.tsx`
- Add state: `basemapStyle`, `activeOverlays`, `activeWeatherLayer`, `weatherOpacity`.
- Layer loading: load basemap tiles from the selected style; load overlay tiles if enabled.
- Layer compositing on canvas (bottom to top):
  1. Basemap tiles (selected style)
  2. Overlay tiles (hillshade/contours at reduced opacity)
  3. Weather overlay (if any — rendered from grid data like precipitation)
  4. Precipitation overlay (existing, at 72% opacity)
  5. UI elements (range rings, marker, labels)
- Add `<MapLayers>` button in the radar header area.
- Update attribution text based on active basemap.

### 3B. Add wind/weather data fetching
- Extend `fetchRadar()` or add `fetchWeatherGrid()` in `weatherLayers.ts` to fetch additional variables from the same Open-Meteo grid.
- Cache results like radar data.

---

## Part 4 — Integrate into GeoRadar (3D canvas map)

### 4A. Modify `src/components/GeoRadar.tsx`
- Add state for basemap and weather layer selection.
- For basemap styles: apply the selected style's color palette to the wireframe terrain shading (the GeoRadar is procedural, so "basemap" here means the terrain color scheme).
  - `carto` → current blue-gray palette
  - `topo` → green/brown topographic palette
  - `satellite` → dark green/brown realistic palette
  - `terrain` → warm earth tones
  - `dark` → current dark palette
- For weather layers: overlay wind arrows or temperature color mapping onto the terrain surface.
- Add `<MapLayers>` control in the GeoRadar UI.

---

## Part 5 — Files to Create/Modify

### New files:
| File | Purpose |
|------|---------|
| `src/lib/weatherLayers.ts` | Weather overlay grid fetching + color ramps for wind, temp, cloud, pressure, snow |
| `src/components/MapLayers.tsx` | Reusable layer-picker UI component |
| `src/components/MapLayers.css` | Styles for the layer picker |

### Modified files:
| File | Changes |
|------|---------|
| `src/lib/basemap.ts` | Add basemap styles, overlay support, refactor `computeBasemap` to accept style |
| `src/types.ts` | Add `BasemapStyleId`, `OverlayId`, `WeatherLayerId` types |
| `src/components/RadarMap.tsx` | Integrate layer picker, multi-layer compositing, weather overlay rendering |
| `src/components/RadarMap.css` | Styles for layer controls integration |
| `src/components/GeoRadar.tsx` | Integrate layer picker, style-dependent terrain colors, weather overlay on terrain |
| `src/components/GeoRadar.css` | Styles for layer controls in Geo view |

---

## Part 6 — Tile Providers (all free, no API key)

| Provider | Used for | Attribution |
|----------|----------|-------------|
| CARTO Voyager | Default basemap | © OpenStreetMap contributors, © CARTO |
| CARTO Dark Matter | Dark basemap | © OpenStreetMap contributors, © CARTO |
| OpenTopoMap | Topographic basemap | © OpenStreetMap contributors, SRTM, © OpenTopoMap |
| ESRI World Imagery | Satellite basemap | © Esri, Maxar, Earthstar Geographics |
| ESRI World Terrain | Terrain basemap | © Esri, USGS, ESA |
| Open-Meteo | Weather overlays (wind, temp, cloud, pressure, snow) | © Open-Meteo (CC BY 4.0) |

---

## Part 7 — Implementation Order

1. Extend `basemap.ts` with multi-style support + overlay infrastructure
2. Add types to `types.ts`
3. Create `weatherLayers.ts` (grid fetching + color ramps)
4. Create `MapLayers.tsx` + `MapLayers.css` (layer picker UI)
5. Integrate into `RadarMap.tsx` (2D map multi-layer compositing)
6. Integrate into `GeoRadar.tsx` (3D terrain style switching + weather overlays)
7. Update CSS files for new UI elements
8. Typecheck (`npm run typecheck`)
9. Build (`npm run build`)
10. Git commit + push

---

## Verification
- `npm run typecheck` — must pass with zero errors
- `npm run build` — must produce a clean production build
- Visual: open `npm run dev`, check RadarMap with each basemap style, toggle overlays, toggle weather layers, verify GeoRadar terrain colors change with style
- Git: commit all changes and push to `main`
