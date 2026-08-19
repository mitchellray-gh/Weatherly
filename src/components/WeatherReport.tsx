// PDF weather report generated with @react-pdf/renderer.

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { WeatherBundle, Settings, DisasterEvent } from '../types'
import type { RiskResult } from '../lib/risk'
import { DISASTER_TYPE_LABELS } from '../lib/disasters'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a2e',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    color: '#475569',
    flex: 1,
  },
  value: {
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  riskBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginTop: 6,
    marginBottom: 4,
  },
  riskFill: {
    height: 6,
    borderRadius: 3,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  alertRow: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    padding: 6,
    marginBottom: 4,
  },
  alertWarning: {
    backgroundColor: '#fffbeb',
    borderLeftColor: '#f59e0b',
  },
  disasterRow: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
    padding: 6,
    marginBottom: 4,
  },
})

function formatTemp(t: number, unit: Settings['temperature']): string {
  return unit === 'fahrenheit' ? `${Math.round(t * 9/5 + 32)}°F` : `${Math.round(t)}°C`
}

function formatWind(s: number, unit: Settings['wind']): string {
  return unit === 'mph' ? `${Math.round(s * 0.621)} mph` : `${Math.round(s)} km/h`
}

function weatherCodeLabel(code: number): string {
  const map: Record<number, string> = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
    61: 'Light rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
    80: 'Rain showers', 81: 'Moderate showers', 82: 'Heavy showers',
    85: 'Snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Severe thunderstorm',
  }
  return map[code] ?? `Code ${code}`
}

interface ReportProps {
  bundle: WeatherBundle
  settings: Settings
  risk: RiskResult | null
  disasters: DisasterEvent[]
}

export function WeatherReportDocument({ bundle, settings, risk, disasters }: ReportProps) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Weatherly Intelligence Report</Text>
          <Text style={styles.subtitle}>
            {bundle.location.name}
            {bundle.location.admin1 ? `, ${bundle.location.admin1}` : ''}
            {bundle.location.country ? `, ${bundle.location.country}` : ''} · {dateStr} {timeStr}
          </Text>
        </View>

        {/* Current Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Conditions</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Condition</Text>
              <Text style={styles.value}>{weatherCodeLabel(bundle.current.weatherCode)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Temperature</Text>
              <Text style={styles.value}>{formatTemp(bundle.current.temperature, settings.temperature)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Feels Like</Text>
              <Text style={styles.value}>{formatTemp(bundle.current.apparentTemperature, settings.temperature)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Wind</Text>
              <Text style={styles.value}>{formatWind(bundle.current.windSpeed, settings.wind)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Gusts</Text>
              <Text style={styles.value}>{formatWind(bundle.current.windGusts, settings.wind)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Humidity</Text>
              <Text style={styles.value}>{bundle.current.humidity}%</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Precipitation</Text>
              <Text style={styles.value}>{bundle.current.precipitation} mm</Text>
            </View>
            {bundle.current.uvIndex != null && (
              <View style={styles.row}>
                <Text style={styles.label}>UV Index</Text>
                <Text style={styles.value}>{bundle.current.uvIndex}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Risk Assessment */}
        {risk && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Risk Assessment</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>Overall Risk</Text>
                <Text style={[styles.value, { color: risk.color }]}>{risk.total}/100 — {risk.label}</Text>
              </View>
              <View style={styles.riskBar}>
                <View style={[styles.riskFill, { width: `${risk.total}%`, backgroundColor: risk.color }]} />
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Weather</Text>
                <Text style={styles.value}>{Math.round(risk.factors.weatherScore)}/30</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Disaster Proximity</Text>
                <Text style={styles.value}>{Math.round(risk.factors.disasterScore)}/30</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Air Quality</Text>
                <Text style={styles.value}>{Math.round(risk.factors.aqiScore)}/15</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Exposure</Text>
                <Text style={styles.value}>{Math.round(risk.factors.exposureScore)}/15</Text>
              </View>
            </View>
          </View>
        )}

        {/* 7-Day Forecast */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7-Day Forecast</Text>
          {bundle.daily.slice(0, 7).map((day, i) => (
            <View key={i} style={styles.dayRow}>
              <Text style={[styles.label, { flex: 1.5 }]}>
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
              <Text style={[styles.value, { flex: 1.5, textAlign: 'center' }]}>
                {weatherCodeLabel(day.weatherCode)}
              </Text>
              <Text style={[styles.value, { flex: 1, textAlign: 'right' }]}>
                {formatTemp(day.tempMin, settings.temperature)} – {formatTemp(day.tempMax, settings.temperature)}
              </Text>
            </View>
          ))}
        </View>

        {/* Active Disasters */}
        {disasters.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Disasters ({disasters.length})</Text>
            {disasters.slice(0, 10).map((d) => (
              <View key={d.id} style={styles.disasterRow}>
                <View style={styles.row}>
                  <Text style={[styles.value, { textAlign: 'left' }]}>
                    {DISASTER_TYPE_LABELS[d.type]} — {d.title}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>
                    {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {d.magnitude ? ` · M${d.magnitude}` : ''}
                    {d.severity ? ` · ${d.severity}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Air Quality */}
        {bundle.airQuality?.usAqi != null && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Air Quality</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>US AQI</Text>
                <Text style={styles.value}>{bundle.airQuality.usAqi}</Text>
              </View>
              {bundle.airQuality.pm25 != null && (
                <View style={styles.row}>
                  <Text style={styles.label}>PM2.5</Text>
                  <Text style={styles.value}>{bundle.airQuality.pm25} µg/m³</Text>
                </View>
              )}
              {bundle.airQuality.ozone != null && (
                <View style={styles.row}>
                  <Text style={styles.label}>Ozone</Text>
                  <Text style={styles.value}>{bundle.airQuality.ozone} µg/m³</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <Text style={styles.footer}>
          Generated by Weatherly · Data by Open-Meteo, USGS, NASA EONET, GDACS · {dateStr}
        </Text>
      </Page>
    </Document>
  )
}
