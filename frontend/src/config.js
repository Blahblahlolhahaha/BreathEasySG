// App settings (backend address, refresh rate, feedback link), read from the .env file. See .env.example.
const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export const config = {
  /** API Gateway base URL, e.g. https://abc123.execute-api.ap-southeast-1.amazonaws.com/Prod */
  apiUrl,

  notificationsApiUrl:
    (import.meta.env.VITE_NOTIFICATIONS_API_URL || '').replace(/\/$/, ''),
  /** true = use placeholder data from src/api/mock. Stays true until VITE_API_URL is set. */
  useMock: import.meta.env.VITE_USE_MOCK === 'true' || !apiUrl,
  /** How often to re-fetch readings. NEA publishes hourly and the backend caches for 15 min. */
  refreshMs: Number(import.meta.env.VITE_REFRESH_MS) || 5 * 60 * 1000,
  /** Optional link to the user-testing questionnaire, shown in the sidebar. */
  feedbackUrl: import.meta.env.VITE_FEEDBACK_URL || '',
}
