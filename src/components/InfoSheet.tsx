import { Sheet } from './Sheet'

interface Props {
  open: boolean
  onClose: () => void
}

export function InfoSheet({ open, onClose }: Props) {
  return (
    <Sheet open={open} title="About Weatherly" onClose={onClose}>
      <div className="info-body">
        <p>
          Weatherly blends high-resolution weather models to give you minute-by-minute,
          hourly and daily forecasts, plus a long-range outlook you can extend from one
          year out to more than a decade ahead.
        </p>
        <p>
          <strong>How the long-range outlook works:</strong> real numerical forecasts are
          only skillful to about 16 days. For the first ~16 days you see an actual forecast
          (solid lines). Beyond that, Weatherly shows a <em>climatological estimate</em> —
          the historical normal for each calendar day (12&nbsp;years of reanalysis),
          optionally blended with CMIP6 climate-model projections, drawn as dashed lines
          with a shaded confidence band. These are statistical expectations, not a
          deterministic prediction, and uncertainty grows with lead time.
        </p>
        <p>
          Weather &amp; climate data by{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{' '}
          (CC BY 4.0). Climate projections use CMIP6 HighResMIP models.
        </p>
      </div>
    </Sheet>
  )
}
