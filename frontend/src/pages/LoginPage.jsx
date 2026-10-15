// PLACEHOLDER — Auth & Settings: the log in / sign up page (/login, /signup).
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="center-page">
      <Link to="/" className="center-logo">
        <Logo />
      </Link>
      <div className="card placeholder-card">
        <h1 className="page-title">Log in or sign up</h1>
        <button
          className="btn"
          type="button"
          onClick={() => {
            signIn()
            navigate('/setup')
          }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
