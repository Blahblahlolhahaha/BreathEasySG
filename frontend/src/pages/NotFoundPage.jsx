// Shown for any unknown URL, with a link back to the haze map.
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'

export default function NotFoundPage() {
  return (
    <div className="center-page">
      <div className="center-logo">
        <Logo />
      </div>
      <div className="card placeholder-card">
        <h1 className="page-title">Page not found</h1>
        <p className="muted">The link may be old or mistyped.</p>
        <Link to="/" className="btn">
          Go to the haze map
        </Link>
      </div>
    </div>
  )
}
