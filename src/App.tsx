import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Background } from './components/Background'
import { SearchBar } from './components/SearchBar'
import { SavedLocations } from './components/SavedLocations'
import { CurrentConditionsView } from './components/CurrentConditions'
import { NextRain } from './components/NextRain'
import { MinuteCast } from './components/MinuteCast'
import { HourlyStrip } from './components/HourlyStrip'
import { DailyList } from './components/DailyList'
import { MetricsGrid } from './components/MetricsGrid'
import { YearOutlook } from './components/YearOutlook'
import { SettingsSheet } from './components/SettingsSheet'
import { InfoSheet } from './components/InfoSheet'
import { ErrorState, InlineSkeleton, LoadingState } from './components/States'
import { useLocations } from './state/useLocations'
import { useSettings } from './state/useSettings'
import { useWeather } from './hooks/useWeather'
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

  const today = bundle?.daily[0]
  const code = bundle?.current.weatherCode ?? 3
  const isDay = bundle?.current.isDay ?? true

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
        <NextRain
          minutely={bundle.minutely}
          hourly={bundle.hourly}
          currentPrecip={bundle.current.precipitation}
          settings={settings}
        />
        <MinuteCast minutely={bundle.minutely} settings={settings} />
        <HourlyStrip hourly={bundle.hourly} settings={settings} />
        <DailyList daily={bundle.daily} settings={settings} />
        <MetricsGrid current={bundle.current} today={today} settings={settings} />
        {outlook ? (
          <YearOutlook
            outlook={outlook}
            settings={settings}
            onWindowChange={(days) => update({ outlookDays: days })}
          />
        ) : outlookLoading ? (
          <InlineSkeleton height={360} />
        ) : null}
      </motion.div>
    )
  }, [loading, error, bundle, today, settings, outlook, outlookLoading, refresh])

  return (
    <>
      <Background weatherCode={code} isDay={isDay} />
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

      <SettingsSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        update={update}
      />
      <InfoSheet open={showInfo} onClose={() => setShowInfo(false)} />
    </>
  )
}
