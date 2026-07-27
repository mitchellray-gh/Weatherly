export interface AqiCategory {
  label: string
  color: string
  advice: string
}

/** US EPA AQI categories. */
export function aqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50)
    return { label: 'Good', color: '#34c759', advice: 'Air quality is ideal for outdoor activity.' }
  if (aqi <= 100)
    return {
      label: 'Moderate',
      color: '#ffd60a',
      advice: 'Acceptable; unusually sensitive people should take it easy.',
    }
  if (aqi <= 150)
    return {
      label: 'Unhealthy for Sensitive',
      color: '#ff9f0a',
      advice: 'Sensitive groups should limit prolonged exertion outdoors.',
    }
  if (aqi <= 200)
    return {
      label: 'Unhealthy',
      color: '#ff453a',
      advice: 'Everyone may begin to feel effects; limit time outdoors.',
    }
  if (aqi <= 300)
    return {
      label: 'Very Unhealthy',
      color: '#bf5af2',
      advice: 'Health alert — avoid outdoor exertion.',
    }
  return { label: 'Hazardous', color: '#8e1e1e', advice: 'Emergency conditions — stay indoors.' }
}
