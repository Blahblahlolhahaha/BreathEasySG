// Shared helper for talking to the backend: adds the server address and the login token to each request.
import { config } from '../config'
import { getIdToken } from '../auth/AuthContext'

/** Thrown for any non-2xx response. `status` is the HTTP code (401 = not logged in, 404 = not found, ...). */
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Calls the backend and returns the parsed JSON.
 * apiFetch('/api/me', { auth: true })
 * apiFetch('/api/places', { method: 'POST', body: { label: 'Home' }, auth: true })
 * Set `auth: true` for anything personal; it sends `Authorization: Bearer <Cognito ID token>`.
 */
export async function apiFetch(path, { method = 'GET', body, auth = false, signal } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = await getIdToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw new ApiError(`${method} ${path} failed (${res.status})`, res.status)
  return res.status === 204 ? null : res.json()
}
