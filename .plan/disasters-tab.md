# Natural Disasters Tab — Implementation Plan

## Overview
Add a "Natural Disasters" tab to the Weatherly app that shows global natural disasters from the past 30 days on an interactive world map with clickable pins and a scrollable event list.

---

## 1. Data Sources (all free, no API keys)

| Source | Endpoint | Data | Rate Limit |
|--------|----------|------|------------|
| **USGS Earthquakes** | `earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson` | M4.5+ earthquakes, past 30 days | None |
| **NASA EONET** | `eonet.gsfc.nasa.gov/api/v3/events?days=30&status=all` | Wildfires, volcanoes, storms, sea ice, droughts | None |
| **GDACS RSS** | `www.gdacs.org/xml/rss.xml` | Floods, cyclones, droughts, forest fires, volcano alerts | Parsed as XML |

---

## 2. Unified Event Schema

All sources normalize into a single `DisasterEvent` type:

```ts
type DisasterType = 'earthquake' | 'wildfire' | 'volcano' | 'flood' | 'cyclone' | 'drought' | 'storm' | 'other'

interface DisasterEvent {
  id: string
  type: DisasterType
  title: string
  description?: string
  date: string               // ISO date
  lat: number
  lng: number
  source: 'usgs' | 'nasa-eonet' | 'gdacs'
  severity?: string          // e.g. 'M 7.4', 'Orange', '26619 ha'
  link?: string              // URL to full report
  magnitude?: number         // numeric magnitude if available
}
```

---

## 3. New Files to Create

| File | Purpose |
|------|---------|
| `src/lib/disasters.ts` | API fetch + normalizers for USGS, NASA EONET, GDACS |
| `src/components/DisastersSheet.tsx` | Full-page modal sheet: map + filters + event list |
| `src/components/DisastersSheet.css` | Styles for the disasters view |
| `src/components/DisasterDetailSheet.tsx` | Detail sheet for a single disaster event |
| `src/components/DisasterDetailSheet.css` | Styles for detail view |

---

## 4. Files to Modify

| File | Change |
|------|--------|
| `src/types.ts` | Add `DisasterType`, `DisasterEvent` types |
| `src/App.tsx` | Add "Disasters" button to topbar, wire up `DisastersSheet` and `DisasterDetailSheet` state |
| `src/App.css` | Add topbar button styles if needed |

---

## 5. Component Design

### 5a. `DisastersSheet` (full-page bottom sheet)

Layout (top to bottom):
1. **Header bar**: "Natural Disasters" title + close button
2. **Filter chips**: Horizontal scrollable row of toggleable chips:
   - All | Earthquakes | Wildfires | Volcanoes | Floods | Cyclones | Droughts | Storms
3. **World map** (canvas, ~300px tall):
   - Uses existing `basemap.ts` tile engine to render a static world map
   - Disaster pins drawn as colored circles with emoji/icon indicators
   - Pin colors by type: 🔴 earthquakes, 🟠 wildfires, 🟣 volcanoes, 🔵 floods, 🌀 cyclones, 🟤 droughts, ⚡ storms
   - Pin size scales with magnitude (earthquakes) or remains fixed for others
   - Click on a pin → opens `DisasterDetailSheet` for that event
   - Map is pannable and zoomable (reuse existing canvas interaction pattern)
4. **Event count summary**: "Showing 142 events from the past 30 days"
5. **Scrollable event list**: Cards for each event, sorted by date (newest first)
   - Each card shows: type icon, title, date (relative: "2 hours ago", "3 days ago"), severity badge
   - Tap card → opens `DisasterDetailSheet`

### 5b. `DisasterDetailSheet` (bottom sheet)

Content:
- Event type badge + title
- Date and time
- Location name (reverse-geocoded from coordinates, or from source data)
- Magnitude / severity / area info
- Link to source report (USGS/EONET/GDACS page) — opens in new tab
- Mini map showing the event location with a pin

---

## 6. Data Fetching Strategy

```
DisastersSheet mounts
  → fetchUSGS()     → earthquake.usgs.gov/.../4.5_month.geojson
  → fetchEONET()    → eonet.gsfc.nasa.gov/api/v3/events?days=30&status=all
  → fetchGDACS()    → www.gdacs.org/xml/rss.xml (parse XML → JSON)
  → all 3 run in parallel via Promise.allSettled
  → normalize each into DisasterEvent[]
  → merge + deduplicate (by proximity + date)
  → cache in useState, refetch on pull-to-refresh or filter change
```

GDACS RSS parsing: Use `DOMParser` (browser built-in) to parse XML in-browser — no XML library needed.

---

## 7. Map Rendering

Reuse the existing `basemap.ts` tile engine:
- Default view: full world at zoom 2, centered on (0, 0)
- Render CARTO dark basemap tiles
- Overlay disaster pins on top of tiles
- Pin hit detection: on click, find nearest pin within threshold radius
- Tooltip/popup on hover or tap showing event title

Pin rendering:
- Colored circle (radius 6-12px based on magnitude/severity)
- White border for visibility
- Pulsing animation for recent events (< 24 hours old)
- Cluster nearby pins at low zoom levels (optional, can add later)

---

## 8. Integration into App

### Topbar button
Add a disaster/globe icon button next to the existing info button in the standard mode topbar:
```tsx
<div className="topbar">
  <button className="icon-btn glass" onClick={() => setShowDisasters(true)}>🌍</button>
  <button className="icon-btn glass" onClick={() => setShowInfo(true)}>ℹ︎</button>
  <div className="brand">Weatherly</div>
  <button className="icon-btn glass" onClick={() => setShowSettings(true)}>⚙︎</button>
</div>
```

### Geo mode
Add a globe icon to the geo-mode header as well, so it's accessible from both modes.

---

## 9. Implementation Order

1. **Types** — Add `DisasterEvent`, `DisasterType` to `src/types.ts`
2. **Data layer** — Create `src/lib/disasters.ts` with `fetchDisasters()` that merges all 3 sources
3. **Sheet** — Create `src/components/DisastersSheet.tsx` + `.css` with map, filters, and event list
4. **Detail** — Create `src/components/DisasterDetailSheet.tsx` + `.css`
5. **Wire up** — Add button to `App.tsx` topbar, connect state
6. **Verify** — `npm run typecheck` + `npm run build`
7. **Commit + push**

---

## 10. Key Decisions

- **No new dependencies** — uses existing canvas map engine, browser-native XML parsing
- **No API keys** — all 3 sources are completely free and open
- **GDACS as supplementary** — USGS and NASA EONET are the primary sources; GDACS fills gaps (floods, cyclones, droughts) that the other two miss
- **30-day window** — matches USGS's built-in month feed; EONET supports `?days=30`; GDACS shows all current alerts
- **Full-screen sheet** — not a scroll section, since the map needs dedicated space and interaction
