// Card explaining what each NEA PSI band (Good to Hazardous) means.
import { METRICS } from '../lib/aq'

const RANGES = ['0–50', '51–100', '101–200', '201–300', '300+']

/** What each NEA PSI band means, for people who don't know the scale. */
export function BandGuide() {
  return (
    <section className="card">
      <h2 className="card-title">What PSI means</h2>
      <ul className="band-guide">
        {METRICS.psi24.bands.map((b, i) => (
          <li key={b.label}>
            <span className="dot" style={{ background: b.color }} aria-hidden="true" />
            <strong>{b.label}</strong>
            <span>{RANGES[i]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
