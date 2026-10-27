// The haze map: colours Singapore by the latest readings, shows each region's value, and opens full screen.
import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, ZoomControl, useMap } from 'react-leaflet'
import { Maximize2, X } from 'lucide-react'
import land from '../data/singapore-land.json'
import { METRICS, bandFor, rampColor, rampGradient } from '../lib/aq'
import { LAND_BOUNDS, MAP_MAX_BOUNDS, ONEMAP_ATTRIBUTION, blendAt, onemapTiles } from '../lib/geo'
import { useTheme } from '../theme/ThemeContext'

/** Paints the blended colour field onto a canvas, cut to Singapore's land outline. Returns a data URL. */
function paintField(regions, metric) {
  const [[south, west], [north, east]] = LAND_BOUNDS
  const W = 640
  const H = Math.round((W * (north - south)) / (east - west))
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(W, H)
  for (let y = 0; y < H; y++) {
    const lat = north - ((y + 0.5) / H) * (north - south)
    for (let x = 0; x < W; x++) {
      const lng = west + ((x + 0.5) / W) * (east - west)
      const [r, g, b] = rampColor(metric, blendAt(lat, lng, regions, metric))
      const i = (y * W + x) * 4
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  // Keep only the pixels inside the land outline.
  ctx.globalCompositeOperation = 'destination-in'
  ctx.beginPath()
  for (const ring of land.rings) {
    ring.forEach(([lng, lat], i) => {
      const px = ((lng - west) / (east - west)) * W
      const py = ((north - lat) / (north - south)) * H
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.closePath()
  }
  ctx.fill()
  return canvas.toDataURL()
}

function ColourField({ regions, metric, opacity }) {
  const map = useMap()
  const url = useMemo(() => paintField(regions, metric), [regions, metric])
  useEffect(() => {
    const layer = L.imageOverlay(url, LAND_BOUNDS, { opacity, interactive: false, className: 'airmap-field' }).addTo(map)
    return () => layer.remove()
  }, [map, url, opacity])
  return null
}

/** Turns dragging and zooming on only when the map is meant to be explored. */
function Interactions({ enabled }) {
  const map = useMap()
  useEffect(() => {
    for (const h of [map.dragging, map.scrollWheelZoom, map.doubleClickZoom, map.touchZoom, map.boxZoom, map.keyboard]) {
      if (h) enabled ? h.enable() : h.disable()
    }
  }, [map, enabled])
  return null
}

/** Re-fits the map whenever its box changes size (e.g. entering full screen). */
function FitOnResize({ trigger }) {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize()
      map.fitBounds(LAND_BOUNDS, { padding: [12, 12] })
    }, 30)
    return () => clearTimeout(t)
  }, [map, trigger])
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(map.getContainer())
    return () => ro.disconnect()
  }, [map])
  return null
}

function RegionPin({ region, metric }) {
  const value = region[metric]
  const icon = useMemo(() => {
    const [r, g, b] = rampColor(metric, value)
    return L.divIcon({
      className: 'region-pin',
      iconSize: null,
      html: `<span style="--pin:rgb(${r},${g},${b})"><b>${value}</b><i>${region.name}</i></span>`,
    })
  }, [metric, value, region.name])
  const psiBand = bandFor('psi24', region.psi24)
  const pmBand = bandFor('pm25', region.pm25)

  return (
    <Marker position={[region.lat, region.lng]} icon={icon} keyboard={false}>
      <Tooltip direction="top" offset={[0, -16]} className="map-tip">
        <strong>{region.name} region</strong>
        <span>
          PSI {region.psi24} · {psiBand.label}
        </span>
        <span>
          PM2.5 {region.pm25} µg/m³ · {pmBand.label}
        </span>
      </Tooltip>
    </Marker>
  )
}

function Legend({ metric }) {
  const m = METRICS[metric]
  const max = m.ramp[m.ramp.length - 1][0]
  return (
    <div className="map-legend">
      <div className="map-legend-title">
        {m.label}
        {m.unit && ` (${m.unit})`}
      </div>
      <div className="map-legend-ramp" style={{ background: rampGradient(metric) }} />
      <div className="map-legend-ticks">
        {m.ticks.map((t) => (
          <span key={t} style={{ left: `${(t / max) * 100}%` }}>
            {t}
          </span>
        ))}
      </div>
      <div className="map-legend-note">Colours blend the 5 NEA regional readings</div>
    </div>
  )
}

/**
 * Haze map of Singapore.
 * variant="preview": a still thumbnail; clicking it opens the full-screen map.
 * variant="inline":  explorable in place, with a full-screen button.
 */
export function AirMap({ regions, places = [], current = null, variant = 'inline', className = '' }) {
  const { theme, colors } = useTheme()
  const [metric, setMetric] = useState('psi24')
  const [full, setFull] = useState(false)
  const explorable = full || variant === 'inline'

  useEffect(() => {
    if (!full) return
    const onKey = (e) => e.key === 'Escape' && setFull(false)
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [full])

  return (
    <div className={`airmap airmap-${variant}${full ? ' is-full' : ''} ${className}`} role="region" aria-label="Air quality map of Singapore">
      <MapContainer
        bounds={LAND_BOUNDS}
        boundsOptions={{ padding: [12, 12] }}
        maxBounds={MAP_MAX_BOUNDS}
        maxBoundsViscosity={1}
        minZoom={10}
        maxZoom={18}
        zoomControl={false}
        scrollWheelZoom={explorable}
        dragging={explorable}
        className="airmap-canvas"
      >
        <TileLayer key={theme} url={onemapTiles(theme)} attribution={ONEMAP_ATTRIBUTION} minZoom={10} maxZoom={19} />
        <ColourField regions={regions} metric={metric} opacity={theme === 'dark' ? 0.5 : 0.55} />
        {regions.map((r) => (
          <RegionPin key={r.id} region={r} metric={metric} />
        ))}
        {places.map((p) => (
          <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={7} pathOptions={{ color: colors.accent, weight: 3, fillColor: colors.surface, fillOpacity: 1 }}>
            <Tooltip direction="top" offset={[0, -8]} className="map-tip">
              <strong>{p.label}</strong>
              <span>{p.address}</span>
            </Tooltip>
          </CircleMarker>
        ))}
        {current && (
          <>
            <CircleMarker center={[current.lat, current.lng]} radius={16} pathOptions={{ stroke: false, fillColor: '#2563EB', fillOpacity: 0.18 }} interactive={false} />
            <CircleMarker center={[current.lat, current.lng]} radius={7} pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: '#2563EB', fillOpacity: 1 }}>
              <Tooltip direction="top" offset={[0, -8]} className="map-tip">
                <strong>You are here</strong>
              </Tooltip>
            </CircleMarker>
          </>
        )}
        {explorable && <ZoomControl position="bottomright" />}
        <Interactions enabled={explorable} />
        <FitOnResize trigger={full} />
      </MapContainer>

      {!explorable && (
        <button type="button" className="airmap-cover" onClick={() => setFull(true)} aria-label="Open the map full screen">
          <span className="airmap-hint">
            <Maximize2 size={15} aria-hidden="true" /> Click to explore
          </span>
        </button>
      )}

      <div className="airmap-tools">
        <div className="seg seg-sm seg-solid" role="group" aria-label="Map shows">
          {['psi24', 'pm25'].map((m) => (
            <button key={m} type="button" aria-pressed={metric === m} onClick={() => setMetric(m)}>
              {METRICS[m].short}
            </button>
          ))}
        </div>
        {(explorable || full) && (
          <button
            type="button"
            className="icon-btn icon-btn-solid"
            onClick={() => setFull((f) => !f)}
            aria-label={full ? 'Close full screen' : 'Open full screen'}
            title={full ? 'Close (Esc)' : 'Full screen'}
          >
            {full ? <X size={18} /> : <Maximize2 size={16} />}
          </button>
        )}
      </div>

      <Legend metric={metric} />
    </div>
  )
}
