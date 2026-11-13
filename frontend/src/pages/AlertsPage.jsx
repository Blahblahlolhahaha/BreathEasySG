// The "Places & alerts" page (/alerts): change saved places, alert limits and how alerts are sent.
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Skeleton } from "../components/States";
import PlacesEditor from "../components/PlacesEditor";
import LimitsEditor from "../components/LimitsEditor";
import ChannelsEditor from "../components/ChannelsEditor";
import { useProfile } from "../data/ProfileContext";
import { isValidLimit, saveMe } from "../api/profile";
import "./AlertsPage.css";

function AlertsForm({ saved }) {
  const { refresh } = useProfile();

  // What is on the server now, and what the user has changed on this page.
  const [base, setBase] = useState(saved);
  const [places, setPlaces] = useState(saved.places);
  const [limits, setLimits] = useState(saved.limits);
  const [channels, setChannels] = useState(saved.channels);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const snapshot = (v) =>
    JSON.stringify({
      places: v.places,
      limits: v.limits,
      channels: v.channels,
    });
  const changed = snapshot({ places, limits, channels }) !== snapshot(base);

  // Any edit clears the old "Saved" or error message.
  const edit = (setter) => (value) => {
    setter(value);
    setJustSaved(false);
    setError("");
  };

  const reset = () => {
    setPlaces(base.places);
    setLimits(base.limits);
    setChannels(base.channels);
    setError("");
  };

  async function handleSave() {
    setError("");
    if (!(isValidLimit(limits.psi24) && isValidLimit(limits.pm25))) {
      setError("Enter a whole number from 1 to 500 for both limits.");
      return;
    }
    setSaving(true);
    try {
      await saveMe({ setupComplete: true, places, limits, channels });
      await refresh();
      setBase({ places, limits, channels });
      setJustSaved(true);
    } catch (err) {
      setError(
        err.message || "We couldn’t save your changes. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="alerts">
      <PageHeader title="Places & alerts" />

      <section className="card">
        <h2 className="card-title">Your places</h2>
        <PlacesEditor places={places} onChange={edit(setPlaces)} />
      </section>

      <section className="card">
        <h2 className="card-title">Alert limits</h2>
        <LimitsEditor value={limits} onChange={edit(setLimits)} />
      </section>

      <section className="card">
        <h2 className="card-title">How to reach you</h2>
        <ChannelsEditor
          value={channels}
          onChange={edit(setChannels)}
          email={saved.email}
        />
      </section>

      {error && (
        <p className="settings-error" role="alert">
          {error}
        </p>
      )}

      <div className="alerts-actions">
        <button
          className="btn"
          type="button"
          onClick={handleSave}
          disabled={saving || !changed}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {changed && !saving && (
          <button className="btn btn-ghost" type="button" onClick={reset}>
            Discard changes
          </button>
        )}
        {justSaved && !changed && (
          <p className="alerts-saved" role="status">
            Saved.
          </p>
        )}
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { profile, error, limits, places } = useProfile();

  if (!profile && !error) {
    return (
      <div className="alerts">
        <PageHeader title="Places & alerts" />
        <Skeleton height={160} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="alerts">
        <PageHeader title="Places & alerts" />
        <p className="muted">
          We couldn’t load your settings. Check your connection and try again
          later.
        </p>
      </div>
    );
  }

  const saved = {
    places,
    limits,
    channels: profile.channels || { push: false, email: true },
    email: profile.email,
  };
  return <AlertsForm saved={saved} />;
}
