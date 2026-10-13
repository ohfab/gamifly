import { motion, useAnimationControls } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useGame } from '../store/useGame'
import { BOSSES } from '../game/world'
import { Art } from '../art/Art'
import { ColorBar } from './ui'
import { fmt } from '../lib/util'

function untilSunday() {
  const n = new Date()
  const end = new Date(n)
  end.setDate(n.getDate() + ((7 - n.getDay()) % 7))
  end.setHours(23, 59, 59, 999)
  const h = Math.max(0, Math.floor((end.getTime() - n.getTime()) / 3600000))
  return h >= 24 ? `${Math.floor(h / 24)} T ${h % 24} Std` : `${h} Std`
}

export function BossCard() {
  const boss = useGame((s) => s.boss)
  const hit = useGame((s) => s.bossHit)
  const controls = useAnimationControls()
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    if (!hit) return
    void controls.start({ x: [0, -8, 7, -5, 3, 0], rotate: [0, -3, 3, -1, 0], transition: { duration: 0.45 } })
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 220)
    return () => clearTimeout(t)
  }, [hit, controls])
  if (!boss) return null
  const b = BOSSES[boss.idx]
  const pct = boss.hp / boss.maxHp
  return (
    <div className={`boss-card ${boss.defeated ? 'won' : ''}`} data-tour="boss">
      <div className="row" style={{ alignItems: 'center', gap: 14 }}>
        <motion.div animate={controls} className="boss-art" style={{ filter: flash ? 'brightness(1.8) saturate(.4)' : undefined }}>
          <motion.div animate={boss.defeated ? { rotate: 90, opacity: 0.35, y: 10 } : { y: [0, -4, 0] }} transition={boss.defeated ? { duration: 0.6 } : { repeat: Infinity, duration: 2.6 }}>
            <Art name={b.art} size={92} />
          </motion.div>
        </motion.div>
        <div className="grow col" style={{ gap: 6 }}>
          <div className="row between">
            <span className="mono tiny" style={{ letterSpacing: '.14em', opacity: 0.8 }}>WOCHENBOSS</span>
            <span className="tiny muted">{boss.defeated ? 'besiegt' : `noch ${untilSunday()}`}</span>
          </div>
          <b style={{ fontSize: 17, lineHeight: 1.15 }}>{b.name}</b>
          <ColorBar value={boss.hp} max={boss.maxHp} color={pct > 0.5 ? '#dc7c6c' : pct > 0.2 ? '#ecb94e' : '#86bf5c'} />
          <div className="row between tiny">
            <span className="mono">{fmt(boss.hp)} / {fmt(boss.maxHp)} HP</span>
            <span className="muted">Schwäche: {b.weakness}</span>
          </div>
        </div>
      </div>
      {!boss.defeated && <p className="tiny muted" style={{ margin: '10px 0 0' }}>{b.desc} Jede Quest, jedes Gate und jeder geputzte Raum macht Schaden.</p>}
      {boss.defeated && <p className="small" style={{ margin: '10px 0 0', fontWeight: 600 }}>Besiegt! Nächsten Montag erscheint ein neuer Boss.</p>}
    </div>
  )
}
