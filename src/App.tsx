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
import { DisastersSheet } from './components/DisastersSheet'
import { AlertSettings } from './components/AlertSettings'
import { RiskBadge } from './components/RiskBadge'
import { Sheet } from './components/Sheet'
import { ReportButton } from './components/ReportButton'
import { EmailSettings } from './components/EmailSettings'
import { AutoReportBanner } from './components/AutoReportBanner'
import { useAutoReports } from './hooks/useAutoReports'
import { ErrorState, InlineSkeleton, LoadingState } from './components/States'
import { deriveAlerts } from './lib/alerts'
import { evaluateRules } from './lib/thresholds'
import { sendThresholdNotification } from './lib/notify'
import { computeRisk } from './lib/risk'
import type { RiskResult } from './lib/risk'
import { useLocations } from './state/useLocations'
import { useSettings } from './state/useSettings'
import { useWeather } from './hooks/useWeather'
import { useEffect } from 'react'
import { fetchDisasters } from './lib/disasters'
import type { DisasterEvent } from './types'
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
  const [showDisasters, setShowDisasters] = useState(false)
  const [showThresholds, setShowThresholds] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [detail, setDetail] = useState<DetailTarget>(null)
  const [drill, setDrill] = useState<Drill | null>(null)
  const [risk, setRisk] = useState<RiskResult | null>(null)
  const [disasters, setDisasters] = useState<DisasterEvent[]>([])
  const { triggers: autoReportTriggers, dismiss: dismissAutoReport } = useAutoReports(disasters)

  // Apply the theme to the document root.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    if (settings.theme === 'book') {
      // Book mode owns the canvas colour; the gradient Background is not rendered.
      document.documentElement.style.backgroundColor = '#14110b'
      document.body.style.backgroundColor = '#14110b'
    } else if (settings.theme === 'geo') {
      // Geo mode: the fixed vector scene (z-index:-2) fills the canvas. Only the
      // <html> element may carry the fallback colour — if <body> gets an opaque
      // background it paints *above* the negative-z scene and hides it.
      document.documentElement.style.backgroundColor = '#141a3a'
      document.body.style.backgroundColor = 'transparent'
    } else {
      // Vivid mode: the gradient <Background> owns the canvas; clear overrides.
      document.documentElement.style.backgroundColor = ''
      document.body.style.backgroundColor = ''
    }
  }, [settings.theme])

  // Evaluate threshold alerts and compute risk when weather data changes.
  useEffect(() => {
    if (!bundle) return
    const triggered = evaluateRules(bundle.location, bundle.current, bundle.airQuality?.usAqi ?? null)
    for (const alert of triggered) {
      sendThresholdNotification(alert)
    }
    // Compute risk score
    const r = computeRisk(
      bundle.current,
      bundle.airQuality,
      disasters,
      bundle.location.latitude,
      bundle.location.longitude,
      null,
    )
    setRisk(r)
  }, [bundle, disasters])

  // Fetch disasters for auto-reporting and risk scoring.
  useEffect(() => {
    let cancelled = false
    fetchDisasters().then((evts) => {
      if (!cancelled) setDisasters(evts)
    })
    return () => { cancelled = true }
  }, [])

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
          onPlace={() => setDrill({ kind: 'place' })}
          onNow={() => bundle.hourly[0] && setDrill({ kind: 'hour', time: bundle.hourly[0].time })}
          onFeels={() => setDetail('feels')}
          onToday={() => today && setDrill({ kind: 'day', date: today.date })}
        />
        <RiskBadge risk={risk} />
        <BestTimes
          hourly={bundle.hourly}
          settings={settings}
          onOpen={(activity) => setDrill({ kind: 'activity', activity })}
        />
        <RadarMap location={bundle.location} onOpenDetail={() => setDrill({ kind: 'rain' })} />
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
          onSun={() => setDrill({ kind: 'sun' })}
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
      {geo && <GeoBackground timezone={bundle?.location.timezone} weatherCode={code} />}
      <AlertBanner alerts={alerts} onSelect={(alert) => setDrill({ kind: 'alert', alert })} />

      {geo && bundle ? (
        // Immersive "journey through the data" — geometric, scene-by-scene.
        <div className="geo-shell">
          <div className={`geo-header ${alerts.length ? 'geo-header--banner' : ''}`}>
            <div className="geo-search">
              <SearchBar onSelect={addLocation} />
            </div>
            <button
              className="topbar-labeled glass"
              onClick={() => setShowDisasters(true)}
              aria-label="Natural Disasters"
            >
              <span className="topbar-labeled-icon">⚠️</span>
              <span className="topbar-labeled-text">Alerts</span>
            </button>
            <button
              className="topbar-labeled glass"
              onClick={() => setShowThresholds(true)}
              aria-label="Threshold Alerts"
            >
              <span className="topbar-labeled-icon">⚡</span>
              <span className="topbar-labeled-text">Thresholds</span>
            </button>
            <ReportButton bundle={bundle} settings={settings} risk={risk} disasters={disasters} />
            <button
              className="topbar-labeled glass"
              onClick={() => setShowEmail(true)}
              aria-label="Email Summaries"
            >
              <span className="topbar-labeled-icon">📧</span>
              <span className="topbar-labeled-text">Email</span>
            </button>
            <button
              className="topbar-labeled glass"
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
            >
              <span className="topbar-labeled-icon">⚙</span>
              <span className="topbar-labeled-text">Settings</span>
            </button>
          </div>
          {locations.length > 1 && (
            <div className={`geo-saved ${alerts.length ? 'geo-saved--banner' : ''}`}>
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
            onSelectActivity={(activity) => setDrill({ kind: 'activity', activity })}
            onSelectSun={() => setDrill({ kind: 'sun' })}
            onSelectPlace={() => setDrill({ kind: 'place' })}
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
              className="topbar-labeled glass"
              onClick={() => setShowDisasters(true)}
              aria-label="Natural Disasters"
            >
              <span className="topbar-labeled-icon">⚠️</span>
              <span className="topbar-labeled-text">Alerts</span>
            </button>
            <button
              className="topbar-labeled glass"
              onClick={() => setShowThresholds(true)}
              aria-label="Threshold Alerts"
            >
              <span className="topbar-labeled-icon">⚡</span>
              <span className="topbar-labeled-text">Thresholds</span>
            </button>
            <ReportButton bundle={bundle} settings={settings} risk={risk} disasters={disasters} />
            <button
              className="topbar-labeled glass"
              onClick={() => setShowEmail(true)}
              aria-label="Email Summaries"
            >
              <span className="topbar-labeled-icon">📧</span>
              <span className="topbar-labeled-text">Email</span>
            </button>
            <button
              className="topbar-labeled glass"
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
            >
              <span className="topbar-labeled-icon">⚙</span>
              <span className="topbar-labeled-text">Settings</span>
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
      <DisastersSheet open={showDisasters} onClose={() => setShowDisasters(false)} />
      <Sheet open={showThresholds} onClose={() => setShowThresholds(false)} title="Threshold Alerts">
        <AlertSettings locations={locations} activeLocation={active} />
      </Sheet>
      <Sheet open={showEmail} onClose={() => setShowEmail(false)} title="Email Summaries">
        {bundle && (
          <EmailSettings bundle={bundle} settings={settings} risk={risk} disasters={disasters} />
        )}
      </Sheet>
      <AutoReportBanner
        triggers={autoReportTriggers}
        onDismiss={dismissAutoReport}
      />
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
