import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { WeatherAlert } from '../lib/alerts'
import './Toast.css'

interface Props {
  alerts: WeatherAlert[]
}

export function AlertToasts({ alerts }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Reset dismissals whenever the set of alert ids changes (e.g. new location).
  const signature = alerts.map((a) => a.id).join('|')
  useEffect(() => {
    setDismissed(new Set())
  }, [signature])

  const visible = alerts.filter((a) => !dismissed.has(a.id))

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      <AnimatePresence>
        {visible.map((a) => (
          <motion.div
            key={a.id}
            className={`toast glass toast-${a.level}`}
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          >
            <span className="toast-icon">{a.icon}</span>
            <div className="toast-body">
              <div className="toast-title">{a.title}</div>
              <div className="toast-detail">{a.detail}</div>
            </div>
            <button
              className="toast-close"
              onClick={() => setDismissed((prev) => new Set(prev).add(a.id))}
              aria-label="Dismiss alert"
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
