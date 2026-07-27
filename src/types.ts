// Shared domain types for Weatherly.

export interface GeoLocation {
  id: string // stable id: `${latitude},${longitude}`
  name: string
  admin1?: string
  country?: string
  countryCode?: string
  latitude: number
  longitude: number
  timezone: string
}

export interface CurrentConditions {
  time: string
  isDay: boolean
  temperature: number
  apparentTemperature: number
  humidity: number
  dewPoint: number
  precipitation: number
  weatherCode: number
  cloudCover: number
  pressure: number
  windSpeed: number
  windDirection: number
  windGusts: number
  uvIndex: number | null
  visibility: number | null
}

export interface MinutePoint {
  time: string
  precipitation: number
  precipitationProbability: number | null
}

export interface HourPoint {
  time: string
  temperature: number
  apparentTemperature: number
  precipitation: number
  precipitationProbability: number | null
  weatherCode: number
  windSpeed: number
  windDirection: number
  humidity: number
  isDay: boolean
  uvIndex: number | null
}

export interface DayPoint {
  date: string
  weatherCode: number
  tempMax: number
  tempMin: number
  precipitationSum: number
  precipitationProbabilityMax: number | null
  windSpeedMax: number
  windGustsMax: number
  windDirection: number
  uvIndexMax: number | null
  sunrise: string
  sunset: string
  daylightSeconds: number
}

/** A single day in the merged long-range series. */
export type OutlookKind = 'forecast' | 'estimate'

export interface OutlookDay {
  date: string
  kind: OutlookKind
  weatherCode: number
  tempMax: number
  tempMin: number
  /** Confidence band (only meaningful for estimates). */
  tempMaxLow: number
  tempMaxHigh: number
  tempMinLow: number
  tempMinHigh: number
  precipitationSum: number
  precipitationProbability: number | null
}

export interface WeatherBundle {
  location: GeoLocation
  current: CurrentConditions
  minutely: MinutePoint[]
  hourly: HourPoint[]
  daily: DayPoint[]
  airQuality: AirQuality | null
  fetchedAt: number
}

export interface AirQuality {
  time: string
  /** US AQI (0–500+). */
  usAqi: number | null
  pm25: number | null
  pm10: number | null
  ozone: number | null
  no2: number | null
  /** European AQI as a fallback where US AQI is unavailable. */
  europeanAqi: number | null
}

export type TemperatureUnit = 'celsius' | 'fahrenheit'
export type WindUnit = 'kmh' | 'mph'
export type PrecipUnit = 'mm' | 'inch'
export type Theme = 'auto' | 'book'

export interface Settings {
  temperature: TemperatureUnit
  wind: WindUnit
  precip: PrecipUnit
  climateOverlay: boolean
  /** Length of the long-range outlook window, in days. */
  outlookDays: number
  /** 'auto' = dynamic colorful UI; 'book' = minimal monochrome newspaper mode. */
  theme: Theme
}
