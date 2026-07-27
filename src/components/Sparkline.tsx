interface Props {
  values: number[]
  labels?: string[]
  color?: string
  height?: number
  fill?: boolean
}

/** Minimal, dependency-free line sparkline for hourly metric trends. */
export function Sparkline({ values, labels, color = '#7ec8ff', height = 120, fill = true }: Props) {
  const clean = values.filter((v) => Number.isFinite(v))
  if (clean.length < 2) return null

  const axisH = labels && labels.length ? 16 : 0
  const W = 320
  const H = height
  const pad = 10
  const lo = Math.min(...clean)
  const hi = Math.max(...clean)
  const span = hi - lo || 1
  const n = values.length

  const x = (i: number) => pad + (i / (n - 1)) * (W - pad * 2)
  const y = (v: number) => pad + (1 - (v - lo) / span) * (H - axisH - pad * 2)

  const line = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(' ')
  const baseY = H - axisH - pad
  const area = `${line} L ${x(n - 1).toFixed(1)} ${baseY} L ${x(0).toFixed(1)} ${baseY} Z`

  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, '')}`

  // Pick ~4 evenly spaced x-axis ticks.
  const tickCount = Math.min(4, n)
  const ticks = labels && labels.length
    ? Array.from({ length: tickCount }, (_, k) => {
        const i = Math.round((k / (tickCount - 1)) * (n - 1))
        return { i, label: labels[i] }
      })
    : []

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Trend over the next 24 hours">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gradId})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {ticks.map((t, k) => (
        <text
          key={k}
          x={x(t.i)}
          y={H - 3}
          fontSize="10"
          fill="rgba(255,255,255,0.55)"
          textAnchor={k === 0 ? 'start' : k === ticks.length - 1 ? 'end' : 'middle'}
        >
          {t.label}
        </text>
      ))}
    </svg>
  )
}
