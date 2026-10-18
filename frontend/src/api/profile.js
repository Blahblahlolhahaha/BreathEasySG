// Loads and saves the user's profile, limits and saved places: GET / PUT /api/me, or sample data until the backend address is set.
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

const SETUP_KEY = "be.placeholder.setup";

const SAMPLE_PLACES = [
  {
    id: "home",
    label: "Home",
    type: "home",
    address: "Bishan (sample)",
    lat: 1.3508,
    lng: 103.8485,
    regionId: "central",
  },
  {
    id: "school",
    label: "School",
    type: "school",
    address: "Kent Ridge (sample)",
    lat: 1.2966,
    lng: 103.7764,
    regionId: "south",
    limits: { psi24: 50, pm25: 35 },
  },
  {
    id: "office",
    label: "Office",
    type: "office",
    address: "Raffles Place (sample)",
    lat: 1.284,
    lng: 103.8515,
    regionId: "south",
  },
];

// Tells ProfileContext to load the profile again.
const announceChange = () => window.dispatchEvent(new Event("be:mock-change"));

/** 'done' | 'skipped' | null — only used by the placeholder setup page while there is no backend. */
export function getSetupState() {
  try {
    return localStorage.getItem(SETUP_KEY);
  } catch {
    return null;
  }
}

// Used by the placeholder setup page; goes away when the real setup page is built.
export function setSetupState(value) {
  if (!useMock) {
    // Real backend: save the sample places so the dashboard has something to show.
    if (value === "done") {
      saveMe({
        setupComplete: true,
        limits: DEFAULT_LIMITS,
        places: SAMPLE_PLACES,
      })
        .then(announceChange)
        .catch(console.error);
    }
    return;
  }
  try {
    localStorage.setItem(SETUP_KEY, value);
  } catch {
    // ignore
  }
  announceChange();
}

/** GET /api/me: the signed-in user's name, email, limits, alert channels and saved places. */
export async function getMe() {
  if (useMock) {
    const done = getSetupState() === "done";
    return {
      name: "Demo user",
      email: "demo@example.com",
      setupComplete: done,
      limits: DEFAULT_LIMITS,
      channels: { push: true, email: true },
      places: done ? SAMPLE_PLACES : [],
    };
  }
  return apiFetch("/api/me", { auth: true, baseUrl });
}

/**
 * PUT /api/me: saves the settings you pass and returns the updated profile.
 * Only the fields you include are changed, e.g. saveMe({ limits: { psi24: 80, pm25: 40 } }).
 * Afterwards call `refresh()` from useProfile() so the dashboard shows the new values.
 */
export async function saveMe(changes) {
  if (useMock)
    throw new Error(
      "Saving needs a backend: set VITE_API_URL (or VITE_PROFILE_API_URL for local testing).",
    );
  return apiFetch("/api/me", {
    method: "PUT",
    body: changes,
    auth: true,
    baseUrl,
  });
}
