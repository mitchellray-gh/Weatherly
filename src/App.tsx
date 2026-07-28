import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Background } from './components/Background'
import { GeoBackground } from './components/GeoBackground'
import { GeoJourney } from './components/GeoJourney'
import { SearchBar } from './components/SearchBar'
import { SavedLocations } from './components/SavedLocations'
import { CurrentConditionsView } from './components/CurrentConditions'
import { BestTimes } from './components/BestTimes'
import { RadarMap } from './components/RadarMap'
import { HourlyStrip } from './components/HourlyStrip'
import { DailyList } from './components/DailyList'
import { MetricsGrid } from './components/MetricsGrid'
import { MetricDetailSheet, type DetailTarget } from './components/MetricDetailSheet'
import { DrillSheet, type Drill } from './components/DrillSheet'
import { AlertBanner } from './components/AlertBanner'
import { YearOutlook } from './components/YearOutlook'
import { SettingsSheet } from './components/SettingsSheet'
import { InfoSheet } from './components/InfoSheet'
import { ErrorState, InlineSkeleton, LoadingState } from './components/States'
import { deriveAlerts } from './lib/alerts'
import { useLocations } from './state/useLocations'
import { useSettings } from './state/useSettings'
import { useWeather } from './hooks/useWeather'
import { useEffect } from 'react'
import './App.css'

export default function App() {
  const { locations, active, activeId, setActiveId, addLocation, removeLocation } = useLocations()
  const { settings, update } = useSettings()
  const { bundle, outlook, loading, outlookLoading, error, refresh } = useWeather(
    active,
    settings.climateOverlay,
    settings.outlookDays,
  )
  const [showSettings, setShowSettings] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [detail, setDetail] = useState<DetailTarget>(null)
  const [drill, setDrill] = useState<Drill | null>(null)

  // Apply the theme to the document root.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    if (settings.theme === 'book') {
      // Book mode owns the canvas colour; the gradient Background is not rendered.
      document.documentElement.style.backgroundColor = '#14110b'
      document.body.style.backgroundColor = '#14110b'
    } else if (settings.theme === 'geo') {
      // Geo mode: the vector scene fills the canvas; keep a neutral fallback.
      document.documentElement.style.backgroundColor = '#141a3a'
      document.body.style.backgroundColor = '#141a3a'
    }
  }, [settings.theme])

  const today = bundle?.daily[0]
  const code = bundle?.current.weatherCode ?? 3
  const isDay = bundle?.current.isDay ?? true
  const book = settings.theme === 'book'
  const geo = settings.theme === 'geo'

  const alerts = useMemo(
    () =>
      bundle ? deriveAlerts(bundle.current, bundle.hourly, bundle.airQuality) : [],
    [bundle],
  )

  const content = useMemo(() => {
    if (loading && !bundle) return <LoadingState />
    if (error && !bundle) return <ErrorState message={error} onRetry={refresh} />
    if (!bundle) return null
    return (
      <motion.div
        className="stack"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <CurrentConditionsView
          location={bundle.location}
          current={bundle.current}
          today={today}
          settings={settings}
        />
        <BestTimes
          hourly={bundle.hourly}
          settings={settings}
          onOpen={(activity) => setDrill({ kind: 'activity', activity })}
        />
        <RadarMap location={bundle.location} />
        <HourlyStrip
          hourly={bundle.hourly}
          minutely={bundle.minutely}
          currentPrecip={bundle.current.precipitation}
          settings={settings}
          onSelect={(time) => setDrill({ kind: 'hour', time })}
          onOpenRain={() => setDrill({ kind: 'rain' })}
        />
        <DailyList
          daily={bundle.daily}
          extension={outlook ?? undefined}
          settings={settings}
          onSelect={(date) => setDrill({ kind: 'day', date })}
          onSelectEstimate={(day) => setDrill({ kind: 'outlook', day })}
        />
        <MetricsGrid
          current={bundle.current}
          today={today}
          airQuality={bundle.airQuality}
          settings={settings}
          onSelect={setDetail}
        />
        {outlook ? (
          <YearOutlook
            outlook={outlook}
            settings={settings}
            onWindowChange={(days) => update({ outlookDays: days })}
            onSelectDay={(day) => {
              const fc = bundle.daily.find((d) => d.date === day.date)
              setDrill(fc ? { kind: 'day', date: day.date } : { kind: 'outlook', day })
            }}
          />
        ) : outlookLoading ? (
          <InlineSkeleton height={360} />
        ) : null}
      </motion.div>
    )
  }, [loading, error, bundle, today, settings, outlook, outlookLoading, refresh])

  return (
    <>
      {!book && !geo && <Background weatherCode={code} isDay={isDay} />}
      {geo && <GeoBackground timezone={bundle?.location.timezone} />}
      <AlertBanner alerts={alerts} />

      {geo && bundle ? (
        // Immersive "journey through the data" — geometric, scene-by-scene.
        <div className="geo-shell">
          <div className="geo-header">
            <div className="geo-search">
              <SearchBar onSelect={addLocation} />
            </div>
            <button
              className="icon-btn glass"
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
            >
              ⚙︎
            </button>
          </div>
          {locations.length > 1 && (
            <div className="geo-saved">
              <SavedLocations
                locations={locations}
                activeId={activeId}
                onSelect={setActiveId}
                onRemove={removeLocation}
              />
            </div>
          )}
          <GeoJourney
            bundle={bundle}
            settings={settings}
            onSelectHour={(time) => setDrill({ kind: 'hour', time })}
            onSelectDay={(date) => setDrill({ kind: 'day', date })}
            onSelectMetric={setDetail}
          />
        </div>
      ) : (
        <div className="app">
          <div className="topbar">
            <button className="icon-btn glass" onClick={() => setShowInfo(true)} aria-label="About">
              ℹ︎
            </button>
            <div className="brand">Weatherly</div>
            <button
              className="icon-btn glass"
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
            >
              ⚙︎
            </button>
          </div>

          <SearchBar onSelect={addLocation} />
          <SavedLocations
            locations={locations}
            activeId={activeId}
            onSelect={setActiveId}
            onRemove={removeLocation}
          />

          {content}

          <footer className="footer">
            Data by Open-Meteo · Forecast to 16 days, climate estimates beyond
          </footer>
        </div>
      )}

      <SettingsSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        update={update}
      />
      <InfoSheet open={showInfo} onClose={() => setShowInfo(false)} />
      {bundle && (
        <MetricDetailSheet
          target={detail}
          current={bundle.current}
          hourly={bundle.hourly}
          airQuality={bundle.airQuality}
          settings={settings}
          onClose={() => setDetail(null)}
        />
      )}
      {bundle && (
        <DrillSheet
          drill={drill}
          bundle={bundle}
          settings={settings}
          onClose={() => setDrill(null)}
          onOpen={setDrill}
        />
      )}
    </>
  )
}
