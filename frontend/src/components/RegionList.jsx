// Table of the 5 regions with their PSI and PM2.5, worst first.
import { bandFor } from '../lib/aq'

/** Five NEA regions with PSI and PM2.5, worst PSI first. */
export function RegionList({ regions, highlightId }) {
  const sorted = [...regions].sort((a, b) => b.psi24 - a.psi24)
  return (
    <table className="region-table">
      <thead>
        <tr>
          <th scope="col">Region</th>
          <th scope="col">PSI</th>
          <th scope="col">PM2.5</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => {
          const band = bandFor('psi24', r.psi24)
          return (
            <tr key={r.id} className={r.id === highlightId ? 'is-mine' : ''}>
              <th scope="row">
                {r.name}
                {r.id === highlightId && <span className="you">You</span>}
              </th>
              <td>
                <span className="dot" style={{ background: band.color }} aria-hidden="true" />
                <strong>{r.psi24}</strong>
                <span className="band-label">{band.label}</span>
              </td>
              <td>{r.pm25}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
