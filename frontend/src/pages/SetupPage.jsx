// The 3-step setup after sign-up (/setup): saved places, alert limits, then push / email.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { Skeleton } from "../components/States";
import PlacesEditor from "../components/PlacesEditor";
import LimitsEditor from "../components/LimitsEditor";
import ChannelsEditor from "../components/ChannelsEditor";
import { useAuth } from "../auth/AuthContext";
import { ProfileProvider, useProfile } from "../data/ProfileContext";
import { isValidLimit, saveMe } from "../api/profile";
import "./SetupPage.css";

const STEPS = [
  {
    title: "Where do you want alerts for?",
    sub: "Add the places you spend time at, like home, school or work.",
  },
  {
    title: "When should we warn you?",
    sub: "Pick the air quality level that’s too high for you.",
  },
  {
    title: "How should we reach you?",
    sub: "Choose how you want to be alerted.",
  },
];

function SetupFlow({ initial }) {
  const navigate = useNavigate();
  const { refresh } = useProfile();

  const [step, setStep] = useState(0);
  const [places, setPlaces] = useState(initial.places);
  const [limits, setLimits] = useState(initial.limits);
  const [channels, setChannels] = useState(initial.channels);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const last = step === STEPS.length - 1;

  function next() {
    setError("");
    if (step === 0 && places.length === 0) {
      setError("Add at least one place to continue.");
      return;
    }
    if (
      step === 1 &&
      !(isValidLimit(limits.psi24) && isValidLimit(limits.pm25))
    ) {
      setError("Enter a whole number from 1 to 500 for both limits.");
      return;
    }
    if (last) finish();
    else setStep(step + 1);
  }

  async function finish() {
    setSaving(true);
    try {
      await saveMe({ setupComplete: true, places, limits, channels });
      await refresh();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.message || "We couldn’t save your settings. Please try again.",
      );
      setSaving(false);
    }
  }

  return (
    <div className="center-page">
      <div className="center-logo">
        <Logo />
      </div>

      <div className="card setup-card">
        <div
          className="setup-steps"
          aria-label={`Step ${step + 1} of ${STEPS.length}`}
        >
          {STEPS.map((_, i) => (
            <span key={i} className={`setup-dot${i <= step ? " on" : ""}`} />
          ))}
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
        </div>

        <div>
          <h1 className="page-title">{STEPS[step].title}</h1>
          <p className="muted">{STEPS[step].sub}</p>
        </div>

        {step === 0 && <PlacesEditor places={places} onChange={setPlaces} />}
        {step === 1 && <LimitsEditor value={limits} onChange={setLimits} />}
        {step === 2 && (
          <ChannelsEditor
            value={channels}
            onChange={setChannels}
            email={initial.email}
          />
        )}

        {error && (
          <p className="settings-error" role="alert">
            {error}
          </p>
        )}

        <div className="setup-actions">
          {step > 0 ? (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={saving}
            >
              Back
            </button>
          ) : (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => navigate("/dashboard")}
            >
              Skip for now
            </button>
          )}
          <div className="end">
            <button
              className="btn"
              type="button"
              onClick={next}
              disabled={saving}
            >
              {last ? (saving ? "Saving…" : "Finish") : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupGate() {
  const { user } = useAuth();
  const { profile, error, limits, places } = useProfile();

  // Wait for the saved profile, so the steps start with whatever the user has already set.
  if (!profile && !error) {
    return (
      <div className="center-page">
        <div className="card setup-card">
          <Skeleton height={120} />
        </div>
      </div>
    );
  }

  const initial = {
    places,
    limits,
    // New users start with push off (it needs the browser’s permission) and email on.
    channels: profile?.setupComplete
      ? profile.channels
      : { push: false, email: true },
    email: profile?.email || user?.email || "",
  };
  return <SetupFlow initial={initial} />;
}

// The setup page sits outside the app shell, so it loads the profile itself.
export default function SetupPage() {
  return (
    <ProfileProvider>
      <SetupGate />
    </ProfileProvider>
  );
}
