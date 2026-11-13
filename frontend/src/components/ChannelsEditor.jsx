// Choose how to get alerts: push and/or email (used by the Setup and Alerts pages).
import { useState } from "react";
import { registerPush } from "../notifications/push";
import "./SettingsForm.css";

/** `value` is { push, email }. `email` is the address alerts are sent to. `onChange(newValue)` runs on every edit. */
export default function ChannelsEditor({ value, onChange, email }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function togglePush(checked) {
    setNote("");
    if (!checked) {
      onChange({ ...value, push: false });
      return;
    }
    // The browser asks for permission here, so this has to happen when the user ticks the box.
    setBusy(true);
    let ok = false;
    try {
      ok = await registerPush();
    } catch(error) {
      console.error("Push registration failed:", error);
      console.error("Error details:", error?.message);
      ok = false;
    }
    setBusy(false);
    if (ok) onChange({ ...value, push: true });
    else
      setNote(
        "Push couldn’t be turned on. Your browser may have blocked it, or it isn’t available yet. You can try again later from Alerts.",
      );
  }

  return (
    <div className="settings-section">
      <label className="settings-check">
        <input
          type="checkbox"
          checked={value.push}
          disabled={busy}
          onChange={(e) => togglePush(e.target.checked)}
        />
        <span>
          <strong>Push notifications</strong>
          <span className="settings-hint">
            Alerts on this device, even when the app is closed.
          </span>
        </span>
      </label>
      {note && (
        <p className="settings-error" role="status">
          {note}
        </p>
      )}

      <label className="settings-check">
        <input
          type="checkbox"
          checked={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.checked })}
        />
        <span>
          <strong>Email</strong>
          <span className="settings-hint">
            {email ? `Sent to ${email}.` : "Sent to your account email."}
          </span>
        </span>
      </label>

      {!value.push && !value.email && (
        <p className="settings-hint">
          With both off, you won’t get alerts. You can still see warnings in the
          app.
        </p>
      )}
    </div>
  );
}
