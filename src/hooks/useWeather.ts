import { useCallback, useEffect, useRef, useState } from 'react'
import type { GeoLocation, OutlookDay, WeatherBundle } from '../types'
import { fetchForecast } from '../lib/openMeteo'
import { buildYearOutlook } from '../lib/longRange'

interface State {
  bundle: WeatherBundle | null
  outlook: OutlookDay[] | null
  loading: boolean
  outlookLoading: boolean
  error: string | null
}

export function useWeather(location: GeoLocation | undefined, climateOverlay: boolean) {
  const [state, setState] = useState<State>({
    bundle: null,
    outlook: null,
    loading: true,
    outlookLoading: false,
    error: null,
  })
  const reqId = useRef(0)

  const load = useCallback(
    async (loc: GeoLocation) => {
      const id = ++reqId.current
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const bundle = await fetchForecast(loc)
        if (id !== reqId.current) return
        setState((s) => ({ ...s, bundle, loading: false, outlookLoading: true }))

        // Long-range is heavier; load it after the core view is up.
        try {
          const outlook = await buildYearOutlook(bundle.location, bundle.daily, {
            climateOverlay,
          })
          if (id !== reqId.current) return
          setState((s) => ({ ...s, outlook, outlookLoading: false }))
        } catch {
          if (id !== reqId.current) return
          setState((s) => ({ ...s, outlookLoading: false }))
        }
      } catch (err) {
        if (id !== reqId.current) return
        setState((s) => ({
          ...s,
          loading: false,
          outlookLoading: false,
          error: err instanceof Error ? err.message : 'Failed to load weather',
        }))
      }
    },
    [climateOverlay],
  )

  useEffect(() => {
    if (location) void load(location)
  }, [location, load])

  const refresh = useCallback(() => {
    if (location) void load(location)
  }, [location, load])

  return { ...state, refresh }
}
