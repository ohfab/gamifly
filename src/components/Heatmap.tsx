import { useState } from 'react'
import { addDays, dayKey, parseDay } from '../lib/util'

/** 12-week activity calendar: one hue, light to dark by quests completed per day. */
export function Heatmap({ history }: { history: Record<string, string[]> }) {
  const [tip, setTip] = useState<{ k: string; n: number; x: number; y: number } | null>(null)
  const today = dayKey()
  const dow = (parseDay(today).getDay() + 6) % 7
  const start = addDays(today, -(11 * 7 + dow))
  const weeks = Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
  const level = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 6 ? 3 : 4)
  const total = weeks.flat().reduce((a, k) => a + (history[k]?.length ?? 0), 0)
  const active = weeks.flat().filter((k) => (history[k]?.length ?? 0) > 0).length
  return (
    <div style={{ position: 'relative' }}>
      <div className="heat" role="img" aria-label={`Letzte 12 Wochen: ${total} Quests an ${active} Tagen`}>
        <div className="heat-days tiny muted">{['Mo', '', 'Mi', '', 'Fr', '', 'So'].map((d, i) => <span key={i}>{d}</span>)}</div>
        {weeks.map((w, wi) => (
          <div key={wi} className="heat-col">
            {w.map((k) => {
              const n = history[k]?.length ?? 0
              const future = k > today
              return (
                <span key={k} className={`heat-cell l${future ? 'x' : level(n)} ${k === today ? 'today' : ''}`}
                  onPointerEnter={(e) => { const r = (e.target as HTMLElement).getBoundingClientRect(); const p = (e.target as HTMLElement).closest('.heat')!.getBoundingClientRect(); setTip({ k, n, x: r.left - p.left + r.width / 2, y: r.top - p.top }) }}
                  onPointerLeave={() => setTip(null)} />
              )
            })}
          </div>
        ))}
      </div>
      {tip && (
        <div className="chart-tip" style={{ left: tip.x + 22, top: tip.y + 4 }}>
          <b>{tip.n}</b> {tip.n === 1 ? 'Quest' : 'Quests'}
          <div className="tiny muted">{parseDay(tip.k).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
        </div>
      )}
      <div className="row between tiny muted" style={{ marginTop: 8 }}>
        <span>{total} Quests an {active} Tagen</span>
        <span className="row" style={{ gap: 4 }}>weniger {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`heat-cell l${l}`} style={{ width: 10, height: 10 }} />)} mehr</span>
      </div>
    </div>
  )
}
