// The two alert limits (24-hour PSI and 1-hour PM2.5), used by the Setup and Alerts pages.
import { bandFor } from "../lib/aq";
import "./SettingsForm.css";

const FIELDS = [
  { key: "psi24", label: "24-hour PSI limit" },
  { key: "pm25", label: "1-hour PM2.5 limit (µg/m³)" },
];

// Ready-made limits, based on the same NEA levels the dashboard uses (see src/lib/aq.js).
const SUGGESTIONS = {
  psi24: [
    {
      value: 50,
      title: "Sensitive",
      text: "Warns you as soon as the air leaves “Good”. For children, older adults, and people with asthma or heart or lung conditions.",
    },
    {
      value: 80,
      title: "Sports",
      text: "An earlier warning, before the air reaches the top of “Moderate”. For people who run or exercise outdoors and breathe harder.",
    },
    {
      value: 100,
      title: "General",
      text: "Warns you when the air turns “Unhealthy”. A sensible starting point for healthy adults.",
    },
  ],
  pm25: [
    {
      value: 35,
      title: "Sensitive",
      text: "An early warning, well inside the “Normal” level, for people who feel the haze sooner.",
    },
    {
      value: 45,
      title: "Sports",
      text: "A little earlier than the “Normal” limit, for people exercising outdoors.",
    },
    {
      value: 55,
      title: "General",
      text: "Warns you when PM2.5 leaves the “Normal” level.",
    },
  ],
};

/**
 * `value` is { psi24, pm25 }. A box may be '' while the user is typing. `onChange(newValue)` runs on every edit.
 * Set `showSuggestions` to show the ready-made limits under each box (the Setup page does).
 */
export default function LimitsEditor({
  value,
  onChange,
  showSuggestions = false,
}) {
  return (
    <div className="settings-section">
      {FIELDS.map(({ key, label }) => {
        const n = value[key];
        const band = typeof n === "number" && n > 0 ? bandFor(key, n) : null;
        return (
          <div className="settings-field" key={key}>
            <label className="settings-field" htmlFor={`limit-${key}`}>
              {label}
              <input
                id={`limit-${key}`}
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
            </label>
            <span className="settings-hint">
              We’ll alert you when the reading goes over this.
              {band && ` At ${n} the air is “${band.label}”.`}
            </span>

            {showSuggestions && (
              <div
                className="settings-suggest-list"
                role="group"
                aria-label={`Suggested ${label}`}
              >
                {SUGGESTIONS[key].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className="settings-suggest"
                    aria-pressed={n === s.value}
                    onClick={() => onChange({ ...value, [key]: s.value })}
                  >
                    <strong>
                      {s.value} · {s.title}
                    </strong>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {showSuggestions && (
        <p className="settings-hint">
          These are general suggestions based on NEA’s levels, not medical
          advice. You can type any number you like.
        </p>
      )}
    </div>
  );
}
