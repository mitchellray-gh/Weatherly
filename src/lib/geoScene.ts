// ------------------------------------------------------------------ //
// Atmospheric Vector Engine — Theme / Color Matrix Manager            //
// A looping 24-hour lighting cycle in the spirit of Alto's Odyssey.   //
// TimeOfDay is a 0..1 float (0 = midnight, 0.25 = dawn, 0.5 = noon,    //
// 0.75 = golden hour, 1 = midnight) that interpolates every layer.    //
// ------------------------------------------------------------------ //

export interface SceneColors {
  skyTop: string
  skyMid: string
  skyBottom: string
  /** Five stacked silhouette planes, foreground → far horizon. */
  l0: string
  l1: string
  l2: string
  l3: string
  /** Sun / moon orb + its glow. */
  orb: string
  orbGlow: string
  /** 0 (day) → 1 (night): star field opacity. */
  stars: number
  /** UI ink that stays legible against the current sky. */
  ink: string
}

interface Keyframe extends SceneColors {
  t: number
}

// Multi-stop color matrix for the full cycle.
const MATRIX: Keyframe[] = [
  {
    // Midnight — deep indigo, layered blue silhouettes, glowing vector moon.
    t: 0.0,
    skyTop: '#0a0e24',
    skyMid: '#182246',
    skyBottom: '#33436e',
    l0: '#080c1c',
    l1: '#152036',
    l2: '#233459',
    l3: '#2f426b',
    orb: '#d3dcff',
    orbGlow: 'rgba(180,200,255,0.55)',
    stars: 1,
    ink: 'rgba(233,238,255,0.96)',
  },
  {
    // Dawn — soft peach, pale lavender, gold.
    t: 0.25,
    skyTop: '#8f86c4',
    skyMid: '#e7a9a0',
    skyBottom: '#ffd7a1',
    l0: '#241d38',
    l1: '#443552',
    l2: '#7a6284',
    l3: '#b498a2',
    orb: '#ffe0b0',
    orbGlow: 'rgba(255,205,150,0.55)',
    stars: 0.12,
    ink: 'rgba(40,30,58,0.92)',
  },
  {
    // Noon — blindingly bright cerulean, crisp minimal clouds.
    t: 0.5,
    skyTop: '#1877dd',
    skyMid: '#4aa3ff',
    skyBottom: '#bfe3ff',
    l0: '#0d2130',
    l1: '#1b3a54',
    l2: '#3c6b92',
    l3: '#8ab9e2',
    orb: '#fffbe8',
    orbGlow: 'rgba(255,248,210,0.6)',
    stars: 0,
    ink: 'rgba(12,26,44,0.9)',
  },
  {
    // Golden hour — terracotta, burning orange, deep-purple gradients.
    t: 0.75,
    skyTop: '#38286a',
    skyMid: '#e0663c',
    skyBottom: '#ffb257',
    l0: '#241220',
    l1: '#552a2c',
    l2: '#8a4a3a',
    l3: '#c07a58',
    orb: '#ffd18a',
    orbGlow: 'rgba(255,150,80,0.55)',
    stars: 0.1,
    ink: 'rgba(28,16,30,0.92)',
  },
  {
    // Back to midnight (loop close).
    t: 1.0,
    skyTop: '#0a0e24',
    skyMid: '#182246',
    skyBottom: '#33436e',
    l0: '#080c1c',
    l1: '#152036',
    l2: '#233459',
    l3: '#2f426b',
    orb: '#d3dcff',
    orbGlow: 'rgba(180,200,255,0.55)',
    stars: 1,
    ink: 'rgba(233,238,255,0.96)',
  },
]

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function lerpHex(a: string, b: string, k: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  return rgbToHex(ca[0] + (cb[0] - ca[0]) * k, ca[1] + (cb[1] - ca[1]) * k, ca[2] + (cb[2] - ca[2]) * k)
}

function lerpRgba(a: string, b: string, k: number): string {
  const pa = a.match(/[\d.]+/g)!.map(Number)
  const pb = b.match(/[\d.]+/g)!.map(Number)
  const m = pa.map((v, i) => v + (pb[i] - v) * k)
  return `rgba(${Math.round(m[0])},${Math.round(m[1])},${Math.round(m[2])},${m[3].toFixed(3)})`
}

/** The Interpolator — blend all layers simultaneously for a seamless flow. */
export function sampleScene(timeOfDay: number): SceneColors {
  const t = ((timeOfDay % 1) + 1) % 1
  let i = 0
  while (i < MATRIX.length - 1 && MATRIX[i + 1].t < t) i++
  const a = MATRIX[i]
  const b = MATRIX[Math.min(i + 1, MATRIX.length - 1)]
  const span = b.t - a.t || 1
  const k = (t - a.t) / span
  return {
    skyTop: lerpHex(a.skyTop, b.skyTop, k),
    skyMid: lerpHex(a.skyMid, b.skyMid, k),
    skyBottom: lerpHex(a.skyBottom, b.skyBottom, k),
    l0: lerpHex(a.l0, b.l0, k),
    l1: lerpHex(a.l1, b.l1, k),
    l2: lerpHex(a.l2, b.l2, k),
    l3: lerpHex(a.l3, b.l3, k),
    orb: lerpHex(a.orb, b.orb, k),
    orbGlow: lerpRgba(a.orbGlow, b.orbGlow, k),
    stars: a.stars + (b.stars - a.stars) * k,
    ink: lerpRgba(a.ink, b.ink, k),
  }
}

/** Local time-of-day (0..1) for an IANA timezone, defaulting to the browser. */
export function localDayFraction(timezone?: string, date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone && timezone !== 'auto' ? timezone : undefined,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date)
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
    let h = get('hour')
    if (h === 24) h = 0
    return (h * 3600 + get('minute') * 60 + get('second')) / 86400
  } catch {
    return (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) / 86400
  }
}
