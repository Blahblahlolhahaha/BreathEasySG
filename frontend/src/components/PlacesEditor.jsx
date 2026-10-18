// Lists the user's saved places and lets them add or remove one (used by the Setup and Alerts pages).
// PLACEHOLDER — Location & Alerts: when api/places.js (OneMap search) exists, replace the "Area" dropdown in PlaceForm with that search.
import { useState } from "react";
import { Briefcase, GraduationCap, House, MapPin, Plus, X } from "lucide-react";
import "./SettingsForm.css";

const TYPES = [
  { id: "home", label: "Home" },
  { id: "school", label: "School" },
  { id: "office", label: "Office" },
  { id: "other", label: "Other" },
];
const ICONS = { home: House, school: GraduationCap, office: Briefcase };
const MAX_PLACES = 10;

// Middle of each NEA region. Until the OneMap search exists, a place is pinned to the middle of the region the user picks.
const REGIONS = [
  { id: "north", name: "North", lat: 1.41803, lng: 103.82 },
  { id: "south", name: "South", lat: 1.29587, lng: 103.82 },
  { id: "east", name: "East", lat: 1.35735, lng: 103.94 },
  { id: "west", name: "West", lat: 1.35735, lng: 103.7 },
  { id: "central", name: "Central", lat: 1.35735, lng: 103.82 },
];

const newId = () =>
  `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function PlaceForm({ onAdd }) {
  const [type, setType] = useState("home");
  const [label, setLabel] = useState("Home");
  const [address, setAddress] = useState("");
  const [regionId, setRegionId] = useState("central");
  const [error, setError] = useState("");

  const changeType = (next) => {
    setType(next);
    // Fill in a sensible name, unless the user typed their own.
    if (!label || TYPES.some((t) => t.label === label))
      setLabel(TYPES.find((t) => t.id === next).label);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = label.trim();
    if (!name) {
      setError("Give this place a name, like “Home”.");
      return;
    }
    const region = REGIONS.find((r) => r.id === regionId);
    onAdd({
      id: newId(),
      label: name,
      type,
      address: address.trim(),
      lat: region.lat,
      lng: region.lng,
      regionId,
    });
    setLabel("");
    setAddress("");
    setError("");
  };

  return (
    <form className="settings-add" onSubmit={handleSubmit}>
      <div className="settings-add-row">
        <label className="settings-field">
          Type
          <select value={type} onChange={(e) => changeType(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="settings-field">
          Name
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={60}
          />
        </label>
      </div>
      <div className="settings-add-row">
        <label className="settings-field">
          Address (optional)
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={200}
            placeholder="e.g. Bishan"
          />
        </label>
        <label className="settings-field">
          Area
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
          >
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p className="settings-error" role="alert">
          {error}
        </p>
      )}
      <div>
        <button className="btn btn-ghost btn-sm" type="submit">
          <Plus size={16} aria-hidden="true" /> Add place
        </button>
      </div>
    </form>
  );
}

/** `places` is the saved list; `onChange(newList)` is called whenever a place is added or removed. */
export default function PlacesEditor({ places, onChange }) {
  const regionName = (id) => REGIONS.find((r) => r.id === id)?.name;

  return (
    <div className="settings-section">
      {places.length > 0 && (
        <ul className="settings-places">
          {places.map((p) => {
            const Icon = ICONS[p.type] || MapPin;
            const area = regionName(p.regionId);
            return (
              <li key={p.id}>
                <Icon size={18} aria-hidden="true" />
                <span className="grow">
                  <strong>{p.label}</strong>
                  <span>{[p.address, area].filter(Boolean).join(" · ")}</span>
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  aria-label={`Remove ${p.label}`}
                  onClick={() => onChange(places.filter((x) => x.id !== p.id))}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {places.length < MAX_PLACES ? (
        <PlaceForm onAdd={(place) => onChange([...places, place])} />
      ) : (
        <p className="settings-hint">You can save up to {MAX_PLACES} places.</p>
      )}
    </div>
  );
}
