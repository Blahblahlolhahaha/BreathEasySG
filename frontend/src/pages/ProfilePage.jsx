// PLACEHOLDER — Auth & Settings: the profile page (/profile) for account details and signing out.
import { useAuth } from '../auth/AuthContext'

export default function ProfilePage() {
  const { signOut } = useAuth()
  return (
    <div className="card placeholder-card">
      <h1 className="page-title">Profile</h1>
      <button className="btn btn-ghost" type="button" onClick={signOut}>
        Sign out
      </button>
    </div>
  )
}
