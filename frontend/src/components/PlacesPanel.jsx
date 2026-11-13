// "My places" card: the reading at each saved place and whether it is over the limit.
import { Link } from 'react-router-dom'
import { Briefcase, ChevronRight, GraduationCap, House, MapPin, Plus } from 'lucide-react'
import { bandFor } from '../lib/aq'
import { EmptyState, Skeleton } from './States'

const ICONS = { home: House, school: GraduationCap, office: Briefcase }

/** The user's saved places with the reading there and whether it is over their limit. */
export function PlacesPanel({ places, regions, breaches, loading }) {
  const byId = Object.fromEntries((regions || []).map((r) => [r.id, r]))

  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h2 className="card-title">My places</h2>
          <p className="card-sub">You get push and email alerts for these</p>
        </div>
        {places.length > 0 && (
          <Link to="/alerts" className="link">
            Manage <ChevronRight size={16} aria-hidden="true" />
          </Link>
        )}
      </header>

      {loading ? (
        <div className="stack-8">
          <Skeleton height={44} />
          <Skeleton height={44} />
        </div>
      ) : places.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No places yet"
          action={
            <Link to="/setup" className="btn btn-sm">
              <Plus size={16} aria-hidden="true" /> Add places
            </Link>
          }
        >
          Add places like Home, School or Office. We'll alert you when the air there goes over your limit.
        </EmptyState>
      ) : (
        <ul className="place-list">
          {places.map((p) => {
            const Icon = ICONS[p.type] || MapPin
            const region = byId[p.regionId]
            const over = breaches?.[p.id]?.length > 0
            return (
              <li key={p.id}>
                <span className="place-icon">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span className="place-name">
                  <strong>{p.label}</strong>
                  <span>
                    {p.address}
                    {region && ` · ${region.name}`}
                  </span>
                </span>
                {region && (
                  <span className="place-reading">
                    <span className="dot" style={{ background: bandFor('psi24', region.psi24).color }} aria-hidden="true" />
                    PSI {region.psi24}
                  </span>
                )}
                <span className={`pill ${over ? 'pill-bad' : 'pill-ok'}`}>{over ? 'Over limit' : 'OK'}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
