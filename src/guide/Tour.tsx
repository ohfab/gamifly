import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useGame, type Tab } from '../store/useGame'
import { Lumi } from '../companion/Lumi'
import { speak, stopSpeaking } from '../companion/voice'
import { sfx } from '../lib/sfx'

interface Step { tab?: Tab; target?: string; title: string; text: string }

const STEPS: Step[] = [
  { tab: 'status', title: 'Willkommen, Player!', text: 'Ich bin Lumi, dein System-Guide. In einer Minute zeige ich dir, wie Gamifly funktioniert. Tippe auf Weiter.' },
  { tab: 'status', target: 'status', title: 'Dein Status-Fenster', text: 'Hier siehst du Level, Rang, HP, MP und deine sechs Attribute. Sie wachsen, wenn du im echten Leben passende Dinge tust.' },
  { tab: 'status', target: 'daily', title: 'Die Daily Quest', text: 'Sechs kleine Aufgaben pro Tag. Schaffst du alle, wächst dein Streak. Verpasst du sie, landest du in der Strafzone. Halte den Haken gedrückt zum Abhaken.' },
  { tab: 'status', target: 'boss', title: 'Der Wochenboss', text: 'Jede Woche erscheint ein Boss. Alles, was du erledigst, macht ihm Schaden. Gegen seine Schwäche sogar doppelt.' },
  { tab: 'quests', target: 'quests', title: 'Das Quest-Log', text: 'Hier liegen tägliche, wöchentliche und Story-Quests. Mit dem Plus legst du eigene Quests an. Jeden Tag gibt es eine Bonus-Quest.' },
  { tab: 'home', target: 'home3d', title: 'Deine Wohnung in 3D', text: 'Tippe einen Raum an, um zu sehen, was wo liegt und was er braucht. Lampen schaltest du direkt im Modell.' },
  { tab: 'home', target: 'fridge', title: 'Kühlschrank & Rezepte', text: 'Hier trägst du Lebensmittel mit Haltbarkeit ein. Ich schlage dir Rezepte aus deinem Vorrat vor.' },
  { tab: 'style', target: 'style3d', title: 'Das Style Studio', text: 'Fotografiere deine Kleidung und probiere sie am 3D-Modell an. Ich stelle dir Outfits für jeden Anlass zusammen.' },
  { tab: 'life', target: 'water', title: 'Life & Health', text: 'Wasser, Schritte, Workout, Schlaf und Stimmung. Was du hier einträgst, zählt automatisch für deine Daily Quest.' },
  { tab: 'life', target: 'gate', title: 'Fokus-Gates', text: 'Ein Gate ist ein Fokus-Timer. Halte durch und du bekommst XP und Loot. Verlässt du es früher, gibt es nichts.' },
  { tab: 'inventory', target: 'inventory', title: 'Inventar & Shop', text: 'Hier sind deine Items, deine Ausrüstung, der Shop mit echten Belohnungen, die Fusion und deine Erfolge.' },
  { target: 'nav', title: 'Navigation', text: 'Mit dieser Leiste wechselst du zwischen allen Bereichen.' },
  { target: 'lumi', title: 'Und ich bin immer da', text: 'Du findest mich oben rechts. Tippe mich jederzeit an. Ich gebe dir dein Tagesbriefing, trage Dinge für dich ein und erkläre alles. Du kannst auch mit mir sprechen.' },
  { title: 'Bereit, Player?', text: 'Das war die Tour. Als Belohnung bekommst du einen Rosenquarz-Trank. Viel Spaß beim Leveln!' },
]

export function Tour() {
  const step = useGame((s) => s.tourStep)
  const setUi = useGame((s) => s.setUi)
  const setTab = useGame((s) => s.setTab)
  const c = useGame((s) => s.companion)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const cur = step != null ? STEPS[step] : null

  const measure = useCallback(() => {
    if (!cur?.target) { setRect(null); return }
    const el = document.querySelector(`[data-tour="${cur.target}"]`)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [cur])

  useEffect(() => {
    if (!cur) return
    if (cur.tab) setTab(cur.tab)
    let tries = 0
    let raf = 0
    const find = () => {
      const el = cur.target ? document.querySelector(`[data-tour="${cur.target}"]`) : null
      if (cur.target && !el && tries++ < 90) { raf = requestAnimationFrame(find); return }
      if (el) {
        const r = el.getBoundingClientRect()
        const fixed = getComputedStyle(el).position === 'fixed' || el.closest('.nav, .lumi-fab-wrap')
        if (!fixed && (r.top < 80 || r.bottom > window.innerHeight - 220)) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        setTimeout(measure, 450)
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setRect(null)
      }
    }
    raf = requestAnimationFrame(find)
    if (c.voice) speak(`${cur.title}. ${cur.text}`, { voiceURI: c.voiceURI, rate: c.rate, pitch: c.pitch })
    return () => cancelAnimationFrame(raf)
  }, [step])

  useLayoutEffect(() => {
    if (step == null) return
    const on = () => measure()
    window.addEventListener('resize', on)
    window.addEventListener('scroll', on, true)
    // pages lazy-load and animate in, so keep following the target while the step is shown
    const t = setInterval(on, 250)
    return () => { clearInterval(t); window.removeEventListener('resize', on); window.removeEventListener('scroll', on, true) }
  }, [step, measure])

  const finish = (done: boolean) => {
    stopSpeaking()
    setUi({ tourStep: null })
    const s = useGame.getState()
    if (!s.tourDone) {
      useGame.setState({ tourDone: true })
      if (done) { s.grant('potion_xp_m'); s.notify({ tone: 'loot', icon: 'potion_rose', title: 'Tour abgeschlossen', body: 'Rosenquarz-Trank erhalten' }) }
    }
    setTab('status')
  }
  const go = (d: number) => {
    sfx.tap()
    if (step == null) return
    const n = step + d
    if (n >= STEPS.length) finish(true)
    else if (n >= 0) setUi({ tourStep: n })
  }

  if (!cur || step == null) return null
  const pad = 8
  const vh = window.innerHeight
  const top = rect ? Math.max(6, rect.top - pad) : 0
  const bottom = rect ? Math.min(vh - 6, rect.bottom + pad) : 0
  const hole = rect && bottom > top ? { left: rect.left - pad, top, width: rect.width + pad * 2, height: bottom - top } : null
  const cardTop = hole && hole.top + hole.height + 220 < vh ? hole.top + hole.height + 14 : hole && hole.top > 260 ? Math.max(12, hole.top - 236) : null
  return (
    <AnimatePresence>
      <motion.div key="tour" className="tour" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        {hole ? (
          <motion.div className="tour-hole" animate={hole} transition={{ type: 'spring', stiffness: 220, damping: 28 }} />
        ) : <div className="tour-dim" />}
        <motion.div key={step} className="tour-card" style={cardTop != null ? { top: cardTop } : undefined}
          initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
          <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
            <Lumi size={58} mood="happy" />
            <div className="grow">
              <div className="mono tiny muted">{step + 1} / {STEPS.length}</div>
              <b style={{ fontSize: 17 }}>{cur.title}</b>
              <p className="small" style={{ margin: '4px 0 0', lineHeight: 1.45 }}>{cur.text}</p>
            </div>
          </div>
          <div className="tour-dots">{STEPS.map((_, i) => <i key={i} className={i === step ? 'on' : i < step ? 'done' : ''} />)}</div>
          <div className="row between">
            <button className="btn ghost sm" onClick={() => finish(false)}>Überspringen</button>
            <div className="row" style={{ gap: 6 }}>
              {step > 0 && <button className="btn ghost sm" onClick={() => go(-1)}>Zurück</button>}
              <button className="btn sm" onClick={() => go(1)}>{step === STEPS.length - 1 ? 'Los geht’s!' : 'Weiter'}</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
