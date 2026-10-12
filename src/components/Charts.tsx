import { motion } from 'framer-motion'
import { useState } from 'react'
import type { StatKey, Stats } from '../game/types'
import { STAT_KEYS, STAT_META } from '../game/leveling'
import { WEEKDAY, parseDay } from '../lib/util'

export function Radar({ stats, size = 240 }: { stats: Stats; size?: number }) {
  const c = size / 2
  const R = size / 2 - 34
  const max = Math.max(20, ...STAT_KEYS.map((k) => stats[k])) * 1.1
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i / STAT_KEYS.length) * Math.PI * 2
    return [c + Math.cos(a) * r, c + Math.sin(a) * r]
  }
  const poly = STAT_KEYS.map((k, i) => pt(i, (stats[k] / max) * R).join(',')).join(' ')
  const [hover, setHover] = useState<StatKey | null>(null)
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block', margin: '0 auto', overflow: 'visible' }} role="img" aria-label={STAT_KEYS.map((k) => `${STAT_META[k].label} ${stats[k]}`).join(', ')}>
      <defs>
        <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--pink)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--lilac)" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={STAT_KEYS.map((_, i) => pt(i, R * f).join(',')).join(' ')} fill="none" stroke="var(--line)" strokeWidth={1} />
      ))}
      {STAT_KEYS.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" /> })}
      <motion.polygon
        points={poly}
        fill="url(#radarFill)"
        stroke="var(--pink-deep)"
        strokeWidth={2}
        strokeLinejoin="round"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ transformOrigin: `${c}px ${c}px` }}
        transition={{ type: 'spring', stiffness: 120, damping: 14 }}
      />
      {STAT_KEYS.map((k, i) => {
        const [x, y] = pt(i, (stats[k] / max) * R)
        const [lx, ly] = pt(i, R + 20)
        return (
          <g key={k} onPointerEnter={() => setHover(k)} onPointerLeave={() => setHover(null)} style={{ cursor: 'default' }}>
            <circle cx={x} cy={y} r={14} fill="transparent" />
            <circle cx={x} cy={y} r={hover === k ? 6 : 4} fill="var(--surface-solid)" stroke="var(--pink-deep)" strokeWidth={2} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={700} fill="var(--ink-2)" fontFamily="var(--mono)">
              {STAT_META[k].short}
            </text>
            {hover === k && (
              <g>
                <rect x={x - 26} y={y - 32} width={52} height={22} rx={8} fill="var(--ink)" />
                <text x={x} y={y - 21} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="var(--bg)" fontWeight={700}>{stats[k]}</text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** Single-series 7-day bar chart: one hue, rounded data-ends on the baseline, hover tooltip, optional goal line. */
export function WeekBars({ days, values, color, goal, unit, format = (v) => String(v) }: {
  days: string[]; values: number[]; color: string; goal?: number; unit: string; format?: (v: number) => string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 300, H = 130, pad = 18, base = H - 20
  const max = Math.max(goal ?? 0, ...values, 1) * 1.15
  const bw = (W - pad * 2) / days.length
  const y = (v: number) => base - (v / max) * (base - 10)
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Letzte 7 Tage: ${values.map((v, i) => `${WEEKDAY[parseDay(days[i]).getDay()]} ${format(v)} ${unit}`).join(', ')}`}>
        <line x1={pad} x2={W - pad} y1={base} y2={base} stroke="var(--line)" />
        {goal != null && (
          <g>
            <line x1={pad} x2={W - pad} y1={y(goal)} y2={y(goal)} stroke="var(--muted)" strokeDasharray="3 4" strokeWidth={1} />
            <text x={W - pad} y={y(goal) - 4} textAnchor="end" fontSize={9} fill="var(--muted)">Ziel {format(goal)}</text>
          </g>
        )}
        {values.map((v, i) => {
          const x = pad + i * bw + bw * 0.22
          const w = bw * 0.56
          const h = Math.max(0, base - y(v))
          const today = i === values.length - 1
          return (
            <g key={days[i]} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onClick={() => setHover(i)}>
              <rect x={pad + i * bw} y={0} width={bw} height={H} fill="transparent" />
              <motion.path
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: hover == null || hover === i ? 1 : 0.45, scaleY: 1 }}
                style={{ transformOrigin: `0 ${base}px` }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 140, damping: 18 }}
                d={h > 0 ? roundedTop(x, base - h, w, h, Math.min(4, h)) : ''}
                fill={color}
                opacity={today ? 1 : 0.8}
              />
              <text x={pad + i * bw + bw / 2} y={H - 5} textAnchor="middle" fontSize={10} fill={today ? 'var(--ink)' : 'var(--muted)'} fontWeight={today ? 700 : 500}>
                {today ? 'Heute' : WEEKDAY[parseDay(days[i]).getDay()]}
              </text>
            </g>
          )
        })}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: `${((pad + hover * bw + bw / 2) / W) * 100}%` }}>
          <b>{format(values[hover])}</b> {unit}
          <div className="tiny muted">{parseDay(days[hover]).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
        </div>
      )}
    </div>
  )
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}
