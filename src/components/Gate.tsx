import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useGame } from '../store/useGame'
import { GATE_RANKS } from '../game/world'
import { Art } from '../art/Art'

export function GateCard() {
  const gate = useGame((s) => s.gate)
  const start = useGame((s) => s.startGate)
  const leave = useGame((s) => s.abandonGate)
  const check = useGame((s) => s.checkGate)
  const cleared = useGame((s) => s.stats.gatesCleared)
  const [rank, setRank] = useState('C')
  const [now, setNow] = useState(Date.now())
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (!gate) return
    const t = setInterval(() => { setNow(Date.now()); check() }, 1000)
    return () => clearInterval(t)
  }, [gate, check])
  const g = GATE_RANKS.find((x) => x.rank === (gate?.rank ?? rank))!
  const left = gate ? Math.max(0, gate.start + gate.minutes * 60000 - now) : g.minutes * 60000
  const pct = gate ? 1 - left / (gate.minutes * 60000) : 0
  const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000)
  return (
    <div className={`gate-card ${gate ? 'active' : ''}`} data-tour="gate">
      <div className="row between">
        <div>
          <span className="mono tiny" style={{ letterSpacing: '.14em', opacity: 0.8 }}>FOKUS-GATE</span>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{gate ? `Rang ${gate.rank} läuft` : 'Betritt ein Gate'}</div>
        </div>
        <span className="tiny" style={{ opacity: 0.75 }}>{cleared} gecleart</span>
      </div>
      <div className="gate-stage">
        <svg viewBox="0 0 120 120" className="gate-ring" aria-hidden>
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="6" />
          <motion.circle cx="60" cy="60" r="54" fill="none" stroke={g.color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={339.3} animate={{ strokeDashoffset: 339.3 * (1 - pct) }} transition={{ duration: 0.6 }} transform="rotate(-90 60 60)" />
        </svg>
        <motion.div animate={gate ? { scale: [1, 1.06, 1], rotate: [0, 2, -2, 0] } : { scale: 1 }} transition={{ repeat: Infinity, duration: 3 }}>
          <Art name="gate" size={104} />
        </motion.div>
        <div className="gate-time mono">{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</div>
      </div>
      <AnimatePresence mode="wait">
        {!gate ? (
          <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="col" style={{ gap: 10 }}>
            <div className="gate-ranks">
              {GATE_RANKS.map((r) => (
                <button key={r.rank} className={rank === r.rank ? 'on' : ''} style={{ ['--gc' as string]: r.color }} onClick={() => setRank(r.rank)}>
                  <b className="mono">{r.rank}</b><span>{r.minutes}′</span>
                </button>
              ))}
            </div>
            <p className="tiny" style={{ margin: 0, opacity: 0.8 }}>{g.minutes} Minuten fokussiert arbeiten oder lernen. Belohnung: {g.xp} XP, INT-Training und ein Item. Verlässt du das Gate früher, gibt es nichts.</p>
            <button className="btn" style={{ background: 'var(--cream)', color: '#2a2340' }} onClick={() => start(rank)}>Gate betreten</button>
          </motion.div>
        ) : (
          <motion.div key="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="col" style={{ gap: 8 }}>
            <p className="small center" style={{ margin: 0, opacity: 0.85 }}>Bleib fokussiert. Handy weg, eine Aufgabe, los.</p>
            {!confirm
              ? <button className="btn ghost sm" onClick={() => setConfirm(true)}>Gate verlassen</button>
              : <div className="row" style={{ justifyContent: 'center' }}><button className="btn ghost sm" onClick={() => setConfirm(false)}>Weiter fokussieren</button><button className="btn danger sm" onClick={() => { leave(); setConfirm(false) }}>Wirklich verlassen</button></div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
