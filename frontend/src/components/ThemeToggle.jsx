// Switch between light, dark and device theme.
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '../theme/ThemeContext'

const OPTIONS = [
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'system', label: 'Match device', Icon: Monitor },
  { id: 'dark', label: 'Dark', Icon: Moon },
]

/** Three-way theme switch. `compact` shows a single button that cycles through the options. */
export function ThemeToggle({ compact = false }) {
  const { mode, setMode } = useTheme()

  if (compact) {
    const i = OPTIONS.findIndex((o) => o.id === mode)
    const current = OPTIONS[i]
    const next = OPTIONS[(i + 1) % OPTIONS.length]
    return (
      <button type="button" className="icon-btn" onClick={() => setMode(next.id)} aria-label={`Theme: ${current.label}. Switch to ${next.label}`} title={`Theme: ${current.label}`}>
        <current.Icon size={18} />
      </button>
    )
  }

  return (
    <div className="seg seg-sm" role="group" aria-label="Theme">
      {OPTIONS.map(({ id, label, Icon }) => (
        <button key={id} type="button" aria-pressed={mode === id} aria-label={label} title={label} onClick={() => setMode(id)}>
          <Icon size={16} />
        </button>
      ))}
    </div>
  )
}
