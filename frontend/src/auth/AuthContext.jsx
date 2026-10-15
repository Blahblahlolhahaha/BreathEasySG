// PLACEHOLDER — Auth & Settings: keeps track of whether the user is logged in. Uses a fake login for now; Cognito goes here.
import { createContext, useContext, useState } from 'react'

const KEY = 'be.placeholder.signedIn'
const AuthContext = createContext(null)

// PLACEHOLDER — Auth & Settings: Amazon Cognito session (sign up, log in, log out). Keep the same value shape.
// `loading` must stay true while Cognito restores a saved session, so a page refresh doesn't bounce to /login.
export function AuthProvider({ children }) {
  const [signedIn, setSignedIn] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  const set = (v) => {
    try {
      sessionStorage.setItem(KEY, v ? '1' : '0')
    } catch {
      // ignore
    }
    setSignedIn(v)
  }
  const value = {
    isAuthenticated: signedIn,
    loading: false,
    user: signedIn ? { name: 'Demo user', email: 'demo@example.com' } : null,
    signIn: () => set(true),
    signOut: () => set(false),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

// PLACEHOLDER — Auth & Settings: return the current Cognito ID token (or null when signed out). src/api/client.js sends it as the Bearer token.
export async function getIdToken() {
  return null
}
