// WMO weather interpretation codes → label, icon glyph, and gradient theme.
// Themes are day/night aware full-bleed background gradients (Apple-style).

export interface WeatherTheme {
  label: string
  icon: string // emoji-style glyph, swappable for SVG later
  day: [string, string, string]
  night: [string, string, string]
}

const CLEAR: WeatherTheme = {
  label: 'Clear',
  icon: '☀️',
  day: ['#4aa3ff', '#2f7fe0', '#1e5fd6'],
  night: ['#0b1026', '#151a3a', '#243056'],
}
const MAINLY_CLEAR: WeatherTheme = {
  label: 'Mainly Clear',
  icon: '🌤️',
  day: ['#54a8ff', '#3b84dd', '#2664c4'],
  night: ['#0d1230', '#1a2044', '#2b365f'],
}
const PARTLY: WeatherTheme = {
  label: 'Partly Cloudy',
  icon: '⛅',
  day: ['#6fb0f0', '#5a8fca', '#3f6ea8'],
  night: ['#131735', '#20264c', '#333e63'],
}
const OVERCAST: WeatherTheme = {
  label: 'Overcast',
  icon: '☁️',
  day: ['#8a9bb0', '#6c7d94', '#556479'],
  night: ['#1b1f2e', '#282d3f', '#3a4155'],
}
const FOG: WeatherTheme = {
  label: 'Fog',
  icon: '🌫️',
  day: ['#a7b1bd', '#8b95a2', '#727c8a'],
  night: ['#22262f', '#2f333d', '#3d424e'],
}
const DRIZZLE: WeatherTheme = {
  label: 'Drizzle',
  icon: '🌦️',
  day: ['#6d8aa8', '#556f8c', '#425873'],
  night: ['#141a28', '#1f2838', '#2c384c'],
}
const RAIN: WeatherTheme = {
  label: 'Rain',
  icon: '🌧️',
  day: ['#4c6a86', '#3a5470', '#2a405a'],
  night: ['#0f151f', '#19222f', '#243040'],
}
const SNOW: WeatherTheme = {
  label: 'Snow',
  icon: '❄️',
  day: ['#aec6df', '#93b0cf', '#7c9cbe'],
  night: ['#1c2230', '#2a3345', '#3b465c'],
}
const THUNDER: WeatherTheme = {
  label: 'Thunderstorm',
  icon: '⛈️',
  day: ['#41506b', '#313d54', '#232d40'],
  night: ['#0c0f18', '#161b28', '#222a3c'],
}

const TABLE: Record<number, WeatherTheme> = {
  0: CLEAR,
  1: MAINLY_CLEAR,
  2: PARTLY,
  3: OVERCAST,
  45: FOG,
  48: FOG,
  51: DRIZZLE,
  53: DRIZZLE,
  55: DRIZZLE,
  56: DRIZZLE,
  57: DRIZZLE,
  61: RAIN,
  63: RAIN,
  65: RAIN,
  66: RAIN,
  67: RAIN,
  71: SNOW,
  73: SNOW,
  75: SNOW,
  77: SNOW,
  80: RAIN,
  81: RAIN,
  82: RAIN,
  85: SNOW,
  86: SNOW,
  95: THUNDER,
  96: THUNDER,
  99: THUNDER,
}

const DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
}

export function themeFor(code: number): WeatherTheme {
  return TABLE[code] ?? OVERCAST
}

export function describe(code: number): string {
  return DESCRIPTIONS[code] ?? 'Unknown'
}

export function iconFor(code: number, isDay = true): string {
  const theme = themeFor(code)
  if (theme === CLEAR) return isDay ? '☀️' : '🌙'
  if (theme === MAINLY_CLEAR) return isDay ? '🌤️' : '🌙'
  return theme.icon
}

export function gradientFor(code: number, isDay: boolean): [string, string, string] {
  const theme = themeFor(code)
  return isDay ? theme.day : theme.night
}
