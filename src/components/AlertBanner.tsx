import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { WeatherAlert } from '../lib/alerts'
import './AlertBanner.css'

interface Props {
  alerts: WeatherAlert[]
}

/** A slim, non-intrusive live banner across the very top of the app. If
 *  several alerts are active it cycles through them one at a time. */
export function AlertBanner({ alerts }: Props) {
  const [index, setIndex] = useState(0)

  // Reset to the first alert whenever the active set changes (e.g. new location).
  const signature = alerts.map((a) => a.id).join('|')
  useEffect(() => {
    setIndex(0)
  }, [signature])

  // Rotate through multiple alerts.
  useEffect(() => {
    if (alerts.length < 2) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % alerts.length)
    }, 5000)
    return () => window.clearInterval(id)
  }, [alerts.length])

  if (alerts.length === 0) return null

  const active = alerts[Math.min(index, alerts.length - 1)]

  return (
    <div className={`alertbanner alertbanner-${active.level}`} role="status" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          className="alertbanner-inner"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.28 }}
        >
          <span className="alertbanner-icon">{active.icon}</span>
          <span className="alertbanner-text">
            <strong>{active.title}</strong>
            <span className="alertbanner-detail"> — {active.detail}</span>
          </span>
          {alerts.length > 1 && (
            <span className="alertbanner-dots" aria-hidden>
              {alerts.map((a, i) => (
                <span
                  key={a.id}
                  className={`alertbanner-dot ${i === index ? 'active' : ''}`}
                />
              ))}
            </span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
