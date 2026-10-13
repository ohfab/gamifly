import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useGame } from '../store/useGame'
import { sfx } from '../lib/sfx'
import { Art } from '../art/Art'

const LINES = [
  'Du hast die Voraussetzungen erfüllt.',
  'Du wurdest als PLAYER ausgewählt.',
  'Ab heute wird dein Alltag zum Spiel: Quests, Level, Loot – und echte Belohnungen.',
]

export function Awakening() {
  const awaken = useGame((s) => s.awaken)
  const [step, setStep] = useState(0)
  const [shown, setShown] = useState(0)
  const [name, setName] = useState('')

  useEffect(() => {
    if (step !== 1 || shown >= LINES.length) return
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 300 : 1100)
    return () => clearTimeout(t)
  }, [step, shown])

  return (
    <div className="awaken">
      <div className="awaken-rings" aria-hidden>
        {[0, 1, 2].map((i) => <span key={i} style={{ animationDelay: `${i * 1.3}s` }} />)}
      </div>
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" className="awaken-hero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, filter: 'blur(8px)' }}>
            <div className="awaken-top">
              <motion.div className="awaken-mark" animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 4 }}><Art name="bow" size={64} /></motion.div>
              <motion.h1 className="awaken-title" initial="h" animate="s" variants={{ h: {}, s: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } }}>
                {['Dein', 'Leben.', 'Dein', 'Level.'].map((w, i) => (
                  <motion.span key={i} className={i % 2 ? 'hl' : ''} variants={{ h: { opacity: 0, y: 30 }, s: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 18 } } }}>{w}</motion.span>
                ))}
              </motion.h1>
              <p className="awaken-sub">Gamifly macht deinen Alltag zum RPG: Wohnung, Style & Health mit Quests, Level und Loot.</p>
            </div>
            <button className="btn awaken-cta" onClick={() => { sfx.level(); setStep(1) }}>Erwachen</button>
          </motion.div>
        )}
        {step === 1 && (
          <motion.div key="s1" className="sys" style={{ width: 'min(440px, 100%)' }} initial={{ opacity: 0, scale: 0.8, rotateX: 30 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 18 }}>
            <div className="sys-head">◆ Benachrichtigung ◆</div>
            <div className="col" style={{ gap: 12, minHeight: 130 }}>
              {LINES.slice(0, shown).map((l, i) => (
                <motion.p key={i} className="mono" style={{ margin: 0, textAlign: 'center', fontSize: 15 }} initial={{ opacity: 0, filter: 'blur(6px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }}>{l}</motion.p>
              ))}
            </div>
            <AnimatePresence>
              {shown >= LINES.length && (
                <motion.div className="col" style={{ gap: 12, marginTop: 16 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <label className="field">Wie sollen wir dich nennen?
                    <input className="input" autoFocus value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Dein Player-Name" onKeyDown={(e) => e.key === 'Enter' && name.trim() && awaken(name)} />
                  </label>
                  <button className="btn sys-btn" disabled={!name.trim()} onClick={() => awaken(name)}>Akzeptieren</button>
                  <p className="tiny muted center" style={{ margin: 0 }}>Alles wird nur lokal auf deinem Gerät gespeichert.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
