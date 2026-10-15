// Test switch for the made-up data (Clear / Moderate / Haze). Disappears once real data is connected.
import { useEffect, useState } from 'react'
import { config } from '../config'
import { MOCK_SCENARIOS, getMockScenario, setMockScenario } from '../api/mock/mockReadings'

/** Testing aid: switch the placeholder data between clear, moderate and haze. Hidden once real data is connected. */
export function MockScenarioPicker() {
  const [value, setValue] = useState(getMockScenario)
  useEffect(() => {
    const sync = () => setValue(getMockScenario())
    window.addEventListener('be:mock-change', sync)
    return () => window.removeEventListener('be:mock-change', sync)
  }, [])
  if (!config.useMock) return null

  return (
    <label className="mock-picker">
      <span>Sample air</span>
      <select id="mock-scenario" value={value} onChange={(e) => setMockScenario(e.target.value)}>
        {MOCK_SCENARIOS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  )
}
