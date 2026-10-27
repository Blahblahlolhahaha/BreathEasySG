// The two alert limits (24-hour PSI and 1-hour PM2.5), used by the Setup and Alerts pages.
import { bandFor } from "../lib/aq";
import "./SettingsForm.css";

const FIELDS = [
  { key: "psi24", label: "24-hour PSI limit" },
  { key: "pm25", label: "1-hour PM2.5 limit (µg/m³)" },
];

/** `value` is { psi24, pm25 }. A box may be '' while the user is typing. `onChange(newValue)` runs on every edit. */
export default function LimitsEditor({ value, onChange }) {
  return (
    <div className="settings-section">
      {FIELDS.map(({ key, label }) => {
        const n = value[key];
        const band = typeof n === "number" && n > 0 ? bandFor(key, n) : null;
        return (
          <label className="settings-field" key={key}>
            {label}
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              step={1}
              value={n}
              onChange={(e) =>
                onChange({
                  ...value,
                  [key]: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
            />
            <span className="settings-hint">
              We’ll alert you when the reading goes over this.
              {band && ` At ${n} the air is “${band.label}”.`}
            </span>
          </label>
        );
      })}
    </div>
  );
}
