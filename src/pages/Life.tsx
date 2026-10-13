import { AnimatePresence, motion } from 'framer-motion'
import { Minus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { todayLog, useGame } from '../store/useGame'
import { addDays, dayKey, fmt, lastNDays, parseDay, WEEKDAY } from '../lib/util'
import { WeekBars } from '../components/Charts'
import { Seg, Stagger, itemV } from '../components/ui'
import { sfx } from '../lib/sfx'
import { Art } from '../art/Art'
import { GateCard } from '../components/Gate'
import { Heatmap } from '../components/Heatmap'

const MOODS = [
  { v: 1, e: 'mood1', l: 'Mies' },
  { v: 2, e: 'mood2', l: 'Meh' },
  { v: 3, e: 'mood3', l: 'Okay' },
  { v: 4, e: 'mood4', l: 'Gut' },
  { v: 5, e: 'mood5', l: 'Super' },
]

function Glass({ filled, onClick, i }: { filled: boolean; onClick: () => void; i: number }) {
  return (
    <motion.button whileTap={{ scale: 0.85 }} onClick={onClick} className="glass" aria-label={`Glas ${i + 1}`}>
      <svg viewBox="0 0 40 52" width="100%">
        <defs><clipPath id={`gl${i}`}><path d="M6 4 L34 4 L30 48 Q20 51 10 48 Z" /></clipPath></defs>
        <g clipPath={`url(#gl${i})`}>
          <motion.rect x="0" width="40" height="52" fill="url(#water)" initial={false} animate={{ y: filled ? 12 : 52 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }} />
          {filled && <motion.circle cx="14" cy="34" r="2" fill="white" opacity={0.7} animate={{ cy: [40, 16], opacity: [0.8, 0] }} transition={{ repeat: Infinity, duration: 2.2, delay: i * 0.2 }} />}
        </g>
        <path d="M6 4 L34 4 L30 48 Q20 51 10 48 Z" fill="none" stroke="var(--sky)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </motion.button>
  )
}

function Breathe() {
  const addHealth = useGame((s) => s.addHealth)
  const [mins, setMins] = useState(3)
  const [left, setLeft] = useState(0)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => clearInterval(timer.current), [])
  const start = () => {
    setLeft(mins * 60)
    clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(timer.current)
          addHealth('meditationMin', mins)
          sfx.quest()
          useGame.getState().notify({ tone: 'system', icon: 'lotus', title: 'Meditation abgeschlossen', body: `+${mins} Min. · MP regeneriert` })
          return 0
        }
        return l - 1
      })
    }, 1000)
  }
  const running = left > 0
  const phase = running ? (Math.floor((mins * 60 - left) / 4) % 2 === 0 ? 'Einatmen' : 'Ausatmen') : ''
  return (
    <div className="col" style={{ alignItems: 'center', gap: 14 }}>
      <div className="breathe-wrap">
        <motion.div className="breathe" animate={running ? { scale: [0.7, 1, 0.7] } : { scale: 0.8 }} transition={running ? { repeat: Infinity, duration: 8, ease: 'easeInOut' } : {}} />
        <div className="breathe-label">
          {running ? <><b>{phase}</b><div className="mono small">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</div></> : <span className="small muted">bereit</span>}
        </div>
      </div>
      {!running ? (
        <div className="row">
          <Seg id="med" value={String(mins)} onChange={(v) => setMins(Number(v))} options={[1, 3, 5, 10].map((m) => ({ v: String(m), label: `${m}′` }))} />
          <button className="btn sm" onClick={start}>Start</button>
        </div>
      ) : (
        <button className="btn ghost sm" onClick={() => { clearInterval(timer.current); setLeft(0) }}>Abbrechen</button>
      )}
    </div>
  )
}

function Stepper({ label, icon, value, unit, onAdd, steps }: { label: string; icon: string; value: number; unit: string; onAdd: (n: number) => void; steps: number[] }) {
  return (
    <div className="tracker">
      <div className="row between">
        <span className="row" style={{ gap: 8 }}><Art name={icon} size={30} /><b>{label}</b></span>
        <motion.span key={value} className="mono" style={{ fontSize: 22, fontWeight: 700 }} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          {fmt(value)} <span className="small muted">{unit}</span>
        </motion.span>
      </div>
      <div className="row wrap" style={{ gap: 6 }}>
        <button className="btn ghost xs" onClick={() => onAdd(-steps[0])} aria-label="weniger"><Minus size={14} /></button>
        {steps.map((n) => <button key={n} className="btn soft xs" onClick={() => onAdd(n)}>+{fmt(n)}</button>)}
      </div>
    </div>
  )
}

export default function Life() {
  const s = useGame()
  const d = todayLog(s)
  const days = lastNDays(7)
  const get = (k: string) => days.map((x) => (s.health[x]?.[k as 'water'] as number | undefined) ?? 0)
  const [chart, setChart] = useState<'water' | 'steps' | 'sleep' | 'workoutMin'>('steps')
  const [sleep, setSleep] = useState(d.sleep ?? 7.5)

  const dailies = s.quests.filter((q) => q.type === 'daily')
  const streakFor = (id: string) => {
    let n = 0
    let k = dayKey()
    if (!(s.history[k] ?? []).includes(id)) k = addDays(k, -1)
    while ((s.history[k] ?? []).includes(id)) { n++; k = addDays(k, -1) }
    return n
  }

  const chartMeta = {
    steps: { color: '#4cc9ff', goal: 6000, unit: 'Schritte', fmt: (v: number) => fmt(v) },
    water: { color: '#5e9bff', goal: 8, unit: 'Gläser', fmt: (v: number) => String(v) },
    sleep: { color: '#a98bff', goal: 8, unit: 'Stunden', fmt: (v: number) => v.toLocaleString('de-DE') },
    workoutMin: { color: '#ff7a5c', goal: 15, unit: 'Min.', fmt: (v: number) => String(v) },
  }[chart]

  return (
    <>
      <div className="page-title">
        <div>
          <p>{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>Life & <span className="accent">Health</span></h1>
        </div>
      </div>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs><linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bfe3ff" /><stop offset="1" stopColor="#6fb6ff" /></linearGradient></defs>
      </svg>

      <Stagger className="grid-2">
        <motion.div variants={itemV} className="card" data-tour="water">
          <div className="card-title"><h2 className="row" style={{ gap: 8 }}><Art name="drop" size={28} /> Hydration</h2><span className="mono small">{d.water}/8</span></div>
          <div className="glasses">
            {Array.from({ length: Math.max(8, d.water + (d.water >= 8 ? 1 : 0)) }, (_, i) => (
              <Glass key={i} i={i} filled={i < d.water} onClick={() => { sfx.tap(); s.logHealth({ water: i < d.water ? i : i + 1 }) }} />
            ))}
          </div>
          <p className="tiny muted" style={{ margin: '10px 0 0' }}>Tippe auf ein Glas, um es zu füllen. 8 Gläser schließen die Daily Quest ab.</p>
        </motion.div>

        <motion.div variants={itemV} className="card col" style={{ gap: 12 }}>
          <Stepper label="Schritte" icon="run_shoe" value={d.steps} unit="" steps={[500, 1000, 2500]} onAdd={(n) => s.addHealth('steps', n)} />
          <Stepper label="Workout" icon="dumbbell" value={d.workoutMin} unit="Min." steps={[5, 15, 30]} onAdd={(n) => { s.addHealth('workoutMin', n); if (n > 0) s.addStatXp({ str: Math.round(n / 2) }) }} />
        </motion.div>

        <motion.div variants={itemV} className="card">
          <div className="card-title"><h2 className="row" style={{ gap: 8 }}><Art name="moon_sleep" size={28} /> Schlaf</h2>{d.sleep != null && <span className="pill">eingetragen ✓</span>}</div>
          <div className="row">
            <input type="range" min={3} max={12} step={0.5} value={sleep} onChange={(e) => setSleep(Number(e.target.value))} />
            <b className="mono" style={{ width: 64, textAlign: 'right' }}>{sleep.toLocaleString('de-DE')} h</b>
          </div>
          <div className="row between mt">
            <span className="small muted">{sleep >= 7.5 ? 'Beauty Sleep erreicht' : sleep >= 6 ? 'Fast genug Schlaf' : 'Zu wenig – HP sinken'}</span>
            <button className="btn sm" onClick={() => { s.logHealth({ sleep }); sfx.quest() }}>Speichern</button>
          </div>
          <div className="divider" />
          <div className="card-title" style={{ marginBottom: 8 }}><h3>Wie fühlst du dich?</h3></div>
          <div className="moods">
            {MOODS.map((m) => (
              <motion.button key={m.v} whileTap={{ scale: 0.8 }} whileHover={{ y: -3 }} className={`mood ${d.mood === m.v ? 'active' : ''}`} onClick={() => { sfx.tap(); s.logHealth({ mood: m.v }) }}>
                <Art name={m.e} size={40} /><small>{m.l}</small>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemV} className="card">
          <div className="card-title"><h2 className="row" style={{ gap: 8 }}><Art name="lotus" size={28} /> Atem & Ruhe</h2><span className="small muted">{d.meditationMin} Min. heute</span></div>
          <Breathe />
        </motion.div>

        <motion.div variants={itemV}><GateCard /></motion.div>

        <motion.div variants={itemV} className="card">
          <div className="card-title" style={{ flexWrap: 'wrap' }}>
            <h2>Letzte 7 Tage</h2>
            <div className="scroll-x">
              <Seg id="chart" value={chart} onChange={setChart} options={[{ v: 'steps', label: 'Schritte' }, { v: 'water', label: 'Wasser' }, { v: 'sleep', label: 'Schlaf' }, { v: 'workoutMin', label: 'Sport' }]} />
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={chart} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WeekBars days={days} values={get(chart)} color={chartMeta.color} goal={chartMeta.goal} unit={chartMeta.unit} format={chartMeta.fmt} />
            </motion.div>
          </AnimatePresence>
          <div className="row between small" style={{ marginTop: 6 }}>
            <span className="muted">Ø {chartMeta.fmt(chart === 'steps' ? Math.round(get(chart).reduce((a, b) => a + b, 0) / 7) : Math.round((get(chart).reduce((a, b) => a + b, 0) / 7) * 10) / 10)} {chartMeta.unit}</span>
            <span className="muted row" style={{ gap: 2 }}>Mood: {days.map((x) => { const m = MOODS.find((mm) => mm.v === s.health[x]?.mood); return m ? <Art key={x} name={m.e} size={16} /> : <span key={x} style={{ width: 16, textAlign: 'center' }}>·</span> })}</span>
          </div>
        </motion.div>

        <motion.div variants={itemV} className="card">
          <div className="card-title"><h2>Habit-Streaks</h2><span className="tiny muted">Daily Quests</span></div>
          <div className="col" style={{ gap: 10 }}>
            {dailies.map((q) => (
              <div key={q.id} className="row">
                <span className="grow small" style={{ fontWeight: 600 }}>{q.title}</span>
                <div className="row" style={{ gap: 4 }}>
                  {days.map((x) => (
                    <span key={x} title={`${WEEKDAY[parseDay(x).getDay()]}: ${(s.history[x] ?? []).includes(q.id) ? 'erledigt' : 'offen'}`} className={`hdot ${(s.history[x] ?? []).includes(q.id) ? 'on' : ''}`} />
                  ))}
                </div>
                <span className="mono tiny row" style={{ width: 40, justifyContent: 'flex-end', gap: 2 }}><Art name="flame" size={14} />{streakFor(q.id)}</span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div variants={itemV} className="card">
          <div className="card-title"><h2 className="row" style={{ gap: 8 }}><Art name="calendar" size={28} /> Aktivität</h2><span className="tiny muted">12 Wochen</span></div>
          <Heatmap history={s.history} />
        </motion.div>

        <motion.div variants={itemV}><Journal /></motion.div>
      </Stagger>
    </>
  )
}

function Journal() {
  const today = dayKey()
  const saved = useGame((s) => s.journal[today])
  const save = useGame((s) => s.saveJournal)
  const [text, setText] = useState(saved?.text ?? '')
  const [g, setG] = useState<string[]>(saved?.grateful ?? ['', '', ''])
  return (
    <div className="card journal">
      <div className="card-title"><h2 className="row" style={{ gap: 8 }}><Art name="book" size={28} /> Abend-Reflexion</h2>{saved && <span className="pill">gespeichert</span>}</div>
      <label className="field" htmlFor="journal-text">Wie war dein Tag?
        <textarea id="journal-text" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Was lief gut, was nimmst du mit?" />
      </label>
      <div className="field mt">Drei Dinge, für die du dankbar bist
        {g.map((v, i) => (
          <input key={i} id={`grateful-${i}`} className="input" value={v} placeholder={['z. B. Sonne auf dem Heimweg', 'z. B. Kaffee mit einer Freundin', 'z. B. Workout geschafft'][i]} onChange={(e) => setG(g.map((x, j) => (j === i ? e.target.value : x)))} />
        ))}
      </div>
      <button className="btn mt" style={{ width: '100%' }} disabled={!text.trim() && !g.some((x) => x.trim())} onClick={() => save({ text, grateful: g })}>Reflexion speichern{saved ? '' : ' (+20 XP)'}</button>
    </div>
  )
}
