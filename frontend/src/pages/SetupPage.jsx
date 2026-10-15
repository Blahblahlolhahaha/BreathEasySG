// PLACEHOLDER — Auth & Settings: the 3-step setup after sign-up at /setup (saved places, alert thresholds, push / email choice).
import { useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { setSetupState } from '../api/profile'

export default function SetupPage() {
  const navigate = useNavigate()
  const finish = (state) => {
    setSetupState(state)
    navigate('/dashboard')
  }
  return (
    <div className="center-page">
      <div className="center-logo">
        <Logo />
      </div>
      <div className="card placeholder-card">
        <h1 className="page-title">Set up your alerts</h1>
        <div className="row gap-8 wrap">
          <button className="btn" type="button" onClick={() => finish('done')}>
            Finish with sample places
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => finish('skipped')}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
