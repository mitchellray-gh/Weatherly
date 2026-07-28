import { useMemo } from 'react'
import type { OutlookDay, Settings } from '../types'
import { cToUnit, formatTemp } from '../lib/units'

interface Props {
  days: OutlookDay[]
  settings: Settings
  onSelectDay?: (day: OutlookDay) => void
}

const W = 680
const H = 200
const PAD = { top: 18, right: 14, bottom: 24, left: 34 }

/**
 * Hand-rolled SVG chart: daily high/low lines with a shaded confidence band
 * for the estimated portion, and a dashed style distinguishing estimates from
 * real forecast days.
 */
export function OutlookChart({ days, settings, onSelectDay }: Props) {
  const model = useMemo(() => {
    const maxs = days.map((d) => cToUnit(d.tempMax, settings.temperature))
    const mins = days.map((d) => cToUnit(d.tempMin, settings.temperature))
    const bandHi = days.map((d) => cToUnit(d.tempMaxHigh, settings.temperature))
    const bandLo = days.map((d) => cToUnit(d.tempMinLow, settings.temperature))
    const lo = Math.min(...mins, ...bandLo)
    const hi = Math.max(...maxs, ...bandHi)
    const pad = (hi - lo) * 0.12 || 2
    return { maxs, mins, bandHi, bandLo, lo: lo - pad, hi: hi + pad }
  }, [days, settings.temperature])

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const n = days.length

  const x = (i: number) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * innerW)
  const y = (t: number) =>
    PAD.top + innerH - ((t - model.lo) / (model.hi - model.lo || 1)) * innerH

  function linePath(values: number[]): string {
    return values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  }

  // Band polygon (upper high bound → lower low bound).
  const bandPath =
    days.some((d) => d.kind === 'estimate')
      ? `${model.bandHi.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')} ` +
        `${model.bandLo
          .map((_, i) => `L ${x(n - 1 - i).toFixed(1)} ${y(model.bandLo[n - 1 - i]).toFixed(1)}`)
          .join(' ')} Z`
      : ''

  // Split forecast vs estimate for dashed rendering.
  const splitIdx = days.findIndex((d) => d.kind === 'estimate')
  const forecastMax = splitIdx === -1 ? model.maxs : model.maxs.slice(0, splitIdx + 1)
  const forecastMin = splitIdx === -1 ? model.mins : model.mins.slice(0, splitIdx + 1)
  const estMax = splitIdx === -1 ? [] : model.maxs.slice(splitIdx)
  const estMin = splitIdx === -1 ? [] : model.mins.slice(splitIdx)

  const estPath = (values: number[]): string =>
    values.map((v, k) => `${k === 0 ? 'M' : 'L'} ${x(splitIdx + k).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')

  const yTicks = [model.hi, (model.hi + model.lo) / 2, model.lo]

  // X-axis: ~5 evenly spaced date labels.
  const xTickCount = Math.min(5, n)
  const xTicks =
    n > 1
      ? Array.from({ length: xTickCount }, (_, k) => {
          const i = Math.round((k / (xTickCount - 1)) * (n - 1))
          const d = new Date(days[i].date + 'T00:00:00')
          return { i, label: d.toLocaleDateString([], { month: 'short', day: 'numeric' }) }
        })
      : []

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Temperature outlook chart">
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(t)}
            y2={y(t)}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <text x={4} y={y(t) + 4} fontSize="10" fill="rgba(255,255,255,0.5)">
            {formatTemp(
              settings.temperature === 'fahrenheit' ? (t - 32) / 1.8 : t,
              settings.temperature,
              false,
            )}
            °
          </text>
        </g>
      ))}

      {bandPath && <path d={bandPath} fill="rgba(255,214,107,0.14)" stroke="none" />}

      {/* Forecast (solid) */}
      <path d={linePath(forecastMax)} fill="none" stroke="#ff9d5c" strokeWidth="2.5" strokeLinecap="round" />
      <path d={linePath(forecastMin)} fill="none" stroke="#64b5ff" strokeWidth="2.5" strokeLinecap="round" />

      {/* Estimate (dashed) */}
      {estMax.length > 1 && (
        <>
          <path
            d={estPath(estMax)}
            fill="none"
            stroke="#ff9d5c"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.85"
          />
          <path
            d={estPath(estMin)}
            fill="none"
            stroke="#64b5ff"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.85"
          />
        </>
      )}

      {splitIdx > 0 && splitIdx < n && (
        <line
          x1={x(splitIdx)}
          x2={x(splitIdx)}
          y1={PAD.top}
          y2={H - PAD.bottom}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
      )}

      {/* X-axis date labels */}
      {xTicks.map((t, k) => (
        <text
          key={k}
          x={x(t.i)}
          y={H - 7}
          fontSize="10"
          fill="rgba(255,255,255,0.55)"
          textAnchor={k === 0 ? 'start' : k === xTicks.length - 1 ? 'end' : 'middle'}
        >
          {t.label}
        </text>
      ))}

      {/* Invisible tap columns → open that day */}
      {onSelectDay &&
        n > 1 &&
        days.map((d, i) => (
          <rect
            key={`tap-${d.date}`}
            x={x(i) - innerW / (n - 1) / 2}
            y={PAD.top}
            width={innerW / (n - 1)}
            height={innerH}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectDay(d)}
          />
        ))}
    </svg>
  )
}
