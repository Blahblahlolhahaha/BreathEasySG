// The 24-hour line chart, with the user's limit and the 3-hour estimate as dashed lines.
import { useId } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { METRICS } from '../lib/aq'
import { formatHour, formatTime } from '../lib/format'
import { useTheme } from '../theme/ThemeContext'

const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function ChartTip({ active, payload, metric }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const m = METRICS[metric]
  const isEstimate = p.value == null
  return (
    <div className="chart-tip">
      <span>
        {formatTime(p.time)}
        {isEstimate && ' · estimate'}
      </span>
      <strong>
        {isEstimate && '~'}
        {m.short} {isEstimate ? p.forecast : p.value} {m.unit}
      </strong>
    </div>
  )
}

/**
 * 24-hour line for one metric, with the user's limit drawn as a dashed line.
 * `forecast` (optional) is [{ time, value }] after the last reading, drawn as a dashed continuation.
 */
export function TrendChart({ series, metric, limit, forecast, height = 200 }) {
  const { colors } = useTheme()
  const gradientId = `trend-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const ticks = series.filter((_, i) => i % 6 === 0).map((p) => p.time)
  const last = series.length - 1
  const lastOver = limit != null && series[last]?.value > limit

  // Readings use `value`; the estimate uses `forecast`, starting at the last reading so the two lines join.
  const data = forecast?.length
    ? [...series.map((p, i) => (i === last ? { ...p, forecast: p.value } : p)), ...forecast.map((p) => ({ time: p.time, forecast: p.value }))]
    : series

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 18, right: 8, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.accent} stopOpacity={0.28} />
            <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={colors.line} />
        <XAxis dataKey="time" ticks={ticks} tickFormatter={formatHour} tick={{ fill: colors.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: colors.muted, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={44}
          allowDecimals={false}
          domain={[0, (max) => Math.ceil((Math.max(max, limit || 0) * 1.15) / 10) * 10]}
        />
        <Tooltip content={<ChartTip metric={metric} />} cursor={{ stroke: colors.line }} />
        {limit != null && (
          <ReferenceLine
            y={limit}
            stroke={colors.bad}
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{ value: `Your limit ${limit}`, position: 'insideTopRight', fill: colors.bad, fontSize: 12, fontWeight: 600 }}
          />
        )}
        <Area
          type="monotone"
          dataKey="value"
          stroke={colors.accent}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          isAnimationActive={!reduceMotion}
          activeDot={{ r: 5, stroke: colors.surface, strokeWidth: 2 }}
          dot={(props) =>
            props.index === last ? (
              <circle key="end" cx={props.cx} cy={props.cy} r={5} fill={lastOver ? colors.bad : colors.accent} stroke={colors.surface} strokeWidth={2} />
            ) : (
              <g key={props.index} />
            )
          }
        />
        {forecast?.length > 0 && (
          <Line
            type="monotone"
            dataKey="forecast"
            stroke={colors.muted}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            activeDot={{ r: 4, stroke: colors.surface, strokeWidth: 2 }}
            isAnimationActive={!reduceMotion}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
