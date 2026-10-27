// Loads and saves the user's profile, limits and saved places: GET / PUT /api/me, or a copy kept in this browser until the backend address is set.
import { config } from "../config";
import { apiFetch } from "./client";
import { DEFAULT_LIMITS } from "../lib/aq";

// To test the profile backend running on your own computer, put VITE_PROFILE_API_URL=http://localhost:8000 in .env.local.
// That points only the profile calls at it, so the dashboard readings keep working. Leave it empty once the backend is deployed.
const profileUrl = (import.meta.env.VITE_PROFILE_API_URL || "").replace(
  /\/$/,
  "",
);
const baseUrl = profileUrl || config.apiUrl;
const useMock = import.meta.env.VITE_USE_MOCK === "true" || !baseUrl;

// Without a backend, saved settings are kept in this browser so the pages still work.
const MOCK_KEY = "be.mock.profile";

// Tells ProfileContext to load the profile again.
const announceChange = () => window.dispatchEvent(new Event("be:mock-change"));

function readMock() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_KEY)) || {};
  } catch {
    return {};
  }
}

const mockProfile = () => ({
  name: "Demo user",
  email: "demo@example.com",
  setupComplete: false,
  limits: DEFAULT_LIMITS,
  channels: { push: true, email: true },
  places: [],
  ...readMock(),
});

/** True when a limit is a whole number the backend accepts (1 to 500). */
export const isValidLimit = (n) => Number.isInteger(n) && n >= 1 && n <= 500;

/** GET /api/me: the signed-in user's name, email, limits, alert channels and saved places. */
export async function getMe() {
  if (useMock) return mockProfile();
  return apiFetch("/api/me", { auth: true, baseUrl });
}

/**
 * PUT /api/me: saves the settings you pass and returns the updated profile.
 * Only the fields you include are changed, e.g. saveMe({ limits: { psi24: 80, pm25: 40 } }).
 * Afterwards call `refresh()` from useProfile() so the dashboard shows the new values.
 */
export async function saveMe(changes) {
  if (useMock) {
    try {
      localStorage.setItem(
        MOCK_KEY,
        JSON.stringify({ ...readMock(), ...changes }),
      );
    } catch {
      // ignore
    }
    announceChange();
    return mockProfile();
  }
  return apiFetch("/api/me", {
    method: "PUT",
    body: changes,
    auth: true,
    baseUrl,
  });
}
