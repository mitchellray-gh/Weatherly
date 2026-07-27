import { motion } from 'framer-motion'
import { gradientFor } from '../lib/weatherCodes'

interface Props {
  weatherCode: number
  isDay: boolean
}

/** Full-bleed animated gradient background driven by the current condition. */
export function Background({ weatherCode, isDay }: Props) {
  const [a, b, c] = gradientFor(weatherCode, isDay)
  const gradient = `linear-gradient(160deg, ${a} 0%, ${b} 48%, ${c} 100%)`

  return (
    <motion.div
      aria-hidden
      animate={{ background: gradient }}
      transition={{ duration: 1.2, ease: 'easeInOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -2,
        background: gradient,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.18), transparent 60%)',
        }}
      />
    </motion.div>
  )
}
