import { useState, useEffect } from "react";
import {
  Briefcase,
  GraduationCap,
  House,
  MapPin,
  Plus,
  X,
  Search,
} from "lucide-react";
import { REGIONS, findRegionForCoords } from "../api/location.js";
import "./SettingsForm.css";

const TYPES = [
  { id: "home", label: "Home" },
  { id: "school", label: "School" },
  { id: "office", label: "Office" },
  { id: "other", label: "Other" },
];
const ICONS = { home: House, school: GraduationCap, office: Briefcase };
const MAX_PLACES = 10;

const newId = () =>
  `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function PlaceForm({ onAdd }) {
  const [type, setType] = useState("home");
  const [label, setLabel] = useState("Home");
  const [address, setAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const changeType = (next) => {
    setType(next);
    if (!label || TYPES.some((t) => t.label === label))
      setLabel(TYPES.find((t) => t.id === next).label);
  };

  // OneMap search query effect with 300ms debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3 || selectedLocation) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
            searchQuery,
          )}&returnGeom=Y&getAddrDetails=Y`,
        );
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (err) {
        console.error("OneMap search error:", err);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedLocation]);

  const handleSelectResult = (item) => {
    const lat = parseFloat(item.LATITUDE);
    const lng = parseFloat(item.LONGITUDE);
    const formattedAddress = item.ADDRESS || searchQuery;

    setSelectedLocation({
      address: formattedAddress,
      lat,
      lng,
      regionId: findRegionForCoords(lat, lng),
    });
    setAddress(formattedAddress);
    setSearchQuery(formattedAddress);
    setSearchResults([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = label.trim();
    if (!name) {
      setError("Give this place a name, like “Home”.");
      return;
    }

    // Without a picked result we would not know where the place is, so ask for one.
    if (!selectedLocation) {
      setError("Search for the address and pick one of the results.");
      return;
    }
    const { lat, lng, regionId } = selectedLocation;

    onAdd({
      id: newId(),
      label: name,
      type,
      address: address.trim() || searchQuery.trim(),
      lat,
      lng,
      regionId,
    });

    setLabel("");
    setAddress("");
    setSearchQuery("");
    setSelectedLocation(null);
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

      <div
        className="settings-add-row"
        style={{ position: "relative", gridTemplateColumns: "1fr" }}
      >
        <label
          className="settings-field"
          style={{ flex: "1 1 100%", width: "100%" }}
        >
          Search Location
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              width: "100%",
            }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedLocation(null);
                setAddress(e.target.value);
              }}
              maxLength={200}
              placeholder="e.g. Computing Drive, 117417"
              style={{ width: "100%" }}
            />
            <Search size={18} aria-hidden="true" style={{ opacity: 0.6 }} />
          </div>
          {loading && (
            <span className="settings-hint">Searching OneMap...</span>
          )}
          {searchResults.length > 0 && (
            <ul
              className="onemap-dropdown"
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "var(--surface)",
                color: "var(--fg)",
                border: "1px solid var(--line)",
                zIndex: 10,
                maxHeight: "150px",
                overflowY: "auto",
                listStyle: "none",
                padding: 0,
                margin: 0,
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              }}
            >
              {searchResults.map((item, idx) => (
                <li
                  key={idx}
                  onClick={() => handleSelectResult(item)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--line)",
                    fontSize: "0.9rem",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--surface-2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--surface)")
                  }
                >
                  <strong>{item.BUILDING || item.SEARCHVAL}</strong>
                  <br />
                  <small style={{ color: "var(--muted)" }}>
                    {item.ADDRESS}
                  </small>
                </li>
              ))}
            </ul>
          )}
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
