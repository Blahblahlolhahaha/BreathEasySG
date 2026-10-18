// The profile page (/profile): account details, a summary of the user's alert settings, and signing out.
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Skeleton } from "../components/States";
import { useAuth } from "../auth/AuthContext";
import { useProfile } from "../data/ProfileContext";
import { saveMe } from "../api/profile";
import "./ProfilePage.css";

export default function ProfilePage() {
  const { signOut, user } = useAuth();
  const { profile, loading, error, limits, places, refresh } = useProfile();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Name and email come from the saved profile, or from the login if the profile hasn’t loaded.
  const displayName = profile?.name || user?.name || "";
  const email = profile?.email || user?.email || "";

  const channelNames = [];
  if (profile?.channels?.push) channelNames.push("Push");
  if (profile?.channels?.email) channelNames.push("Email");

  const startEditing = () => {
    setName(displayName);
    setMessage("");
    setEditing(true);
  };

  async function handleSave(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage("Please enter a name.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await saveMe({ name: trimmed });
      await refresh();
      setEditing(false);
    } catch (err) {
      setMessage(err.message || "Could not save your name. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile">
      <PageHeader title="Profile" />

      <section className="card">
        <h2 className="card-title">Account</h2>

        {editing ? (
          <form className="profile-form" onSubmit={handleSave}>
            <label className="profile-field">
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                autoComplete="name"
                required
              />
            </label>
            <div className="row gap-8 wrap">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="profile-list">
            <div className="profile-row">
              <dt>Name</dt>
              <dd>
                {displayName || <span className="muted">Not set</span>}{" "}
                <button
                  className="profile-link"
                  type="button"
                  onClick={startEditing}
                >
                  Edit
                </button>
              </dd>
            </div>
            <div className="profile-row">
              <dt>Email</dt>
              <dd>{email}</dd>
            </div>
          </dl>
        )}
        {message && (
          <p className="profile-error" role="alert">
            {message}
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Places &amp; alerts</h2>

        {loading && <Skeleton height={72} />}

        {error && !profile && (
          <p className="muted">
            We couldn’t load your alert settings. Check your connection and try
            again later.
          </p>
        )}

        {profile && (
          <dl className="profile-list">
            <div className="profile-row">
              <dt>Saved places</dt>
              <dd>
                {places.length === 0 ? (
                  <span className="muted">None yet</span>
                ) : (
                  places.length
                )}
              </dd>
            </div>
            <div className="profile-row">
              <dt>24-hour PSI limit</dt>
              <dd>{limits.psi24}</dd>
            </div>
            <div className="profile-row">
              <dt>1-hour PM2.5 limit</dt>
              <dd>{limits.pm25}</dd>
            </div>
            <div className="profile-row">
              <dt>Alerts by</dt>
              <dd>
                {channelNames.length ? (
                  channelNames.join(" and ")
                ) : (
                  <span className="muted">Off</span>
                )}
              </dd>
            </div>
          </dl>
        )}

        <Link className="btn btn-ghost" to="/alerts">
          Change places &amp; alerts
        </Link>
      </section>

      <div>
        <button className="btn btn-ghost" type="button" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
