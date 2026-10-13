import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2, Check } from 'lucide-react'
import { useState } from 'react'
import { useGame } from '../store/useGame'
import { CAT_META } from '../game/quests'
import { STAT_KEYS, STAT_META } from '../game/leveling'
import type { Quest, QuestCat, QuestType, StatKey } from '../game/types'
import { fmt } from '../lib/util'
import { ColorBar, Empty, HoldButton, Seg, Sheet } from '../components/ui'
import { Art } from '../art/Art'

type View = 'daily' | 'weekly' | 'main' | 'side'
const VIEW_LABEL: Record<View, string> = { daily: 'Täglich', weekly: 'Wöchentlich', main: 'Story', side: 'Neben' }

function QuestCard({ q }: { q: Quest }) {
  const complete = useGame((s) => s.completeQuest)
  const remove = useGame((s) => s.removeQuest)
  const cat = CAT_META[q.cat]
  const manual = !q.target
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className={`quest ${q.done ? 'done' : ''} ${q.type === 'penalty' ? 'penalty' : ''} ${q.bonus ? 'bonus' : ''}`}
      style={{ ['--qc' as string]: cat.color }}
    >
      <div className="q-icon"><Art name={q.type === 'penalty' ? 'warning' : q.bonus ? 'box_holo' : cat.icon} size={30} /></div>
      <div className="grow col" style={{ gap: 6 }}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="q-title">{q.title}</div>
            {q.desc && <div className="small muted">{q.desc}</div>}
          </div>
          {q.custom && !q.done && (
            <button className="btn ghost icon" style={{ width: 30, height: 30 }} onClick={() => remove(q.id)} aria-label="Quest löschen"><Trash2 size={14} /></button>
          )}
        </div>
        {q.target ? (
          <div className="row">
            <div className="grow"><ColorBar value={q.progress ?? 0} max={q.target} color={cat.color} /></div>
            <span className="mono tiny muted">{fmt(Math.min(q.progress ?? 0, q.target))}/{fmt(q.target)} {q.unit}</span>
          </div>
        ) : null}
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="pill"><Art name="xp" size={14} /> {q.xp} XP</span>
          {q.gold > 0 && <span className="pill"><Art name="coin" size={14} /> {q.gold}</span>}
          {q.bonus && <span className="pill"><Art name="gem" size={14} /> +2</span>}
          {Object.entries(q.statXp).map(([k, v]) => (v ? <span key={k} className="pill"><Art name={STAT_META[k as StatKey].icon} size={14} /> {STAT_META[k as StatKey].short}</span> : null))}
          {q.link && !q.done && <span className="pill" style={{ color: 'var(--lilac-deep)' }}>automatisch</span>}
          {q.bonus && !q.done && <span className="pill" style={{ color: 'var(--pink-deep)' }}>Bonus heute</span>}
        </div>
      </div>
      {q.done ? (
        <motion.span className="q-done" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}><Check size={20} strokeWidth={3} /></motion.span>
      ) : manual ? (
        <HoldButton onDone={() => complete(q.id)}><Check size={18} strokeWidth={3} /></HoldButton>
      ) : null}
    </motion.div>
  )
}

const DIFF = [
  { label: 'Leicht', xp: 20 },
  { label: 'Normal', xp: 40 },
  { label: 'Schwer', xp: 80 },
  { label: 'Boss', xp: 160 },
]

function NewQuest({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useGame((s) => s.addQuest)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<QuestType>('daily')
  const [cat, setCat] = useState<QuestCat>('custom')
  const [xp, setXp] = useState(40)
  const [stat, setStat] = useState<StatKey | ''>('')
  const submit = () => {
    if (!title.trim()) return
    add({ title: title.trim(), type, cat, xp, stat: stat || undefined })
    setTitle('')
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Neue Quest">
      <div className="col" style={{ gap: 14 }}>
        <label className="field">Was ist deine Quest?
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Vitamin D nehmen, 1 Kapitel lesen…" autoFocus />
        </label>
        <div className="field">Typ
          <Seg id="qt" value={type} onChange={setType} options={[{ v: 'daily', label: 'Täglich' }, { v: 'weekly', label: 'Wöchentlich' }, { v: 'side', label: 'Einmalig' }]} />
        </div>
        <div className="field">Kategorie
          <div className="chips">
            {(Object.keys(CAT_META) as QuestCat[]).map((c) => (
              <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}><Art name={CAT_META[c].icon} size={18} /> {CAT_META[c].label}</button>
            ))}
          </div>
        </div>
        <div className="field">Schwierigkeit
          <div className="chips">
            {DIFF.map((d) => <button key={d.label} className={`chip ${xp === d.xp ? 'active' : ''}`} onClick={() => setXp(d.xp)}>{d.label} · {d.xp} XP</button>)}
          </div>
        </div>
        <div className="field">Trainiert Attribut
          <div className="chips">
            <button className={`chip ${stat === '' ? 'active' : ''}`} onClick={() => setStat('')}>Keins</button>
            {STAT_KEYS.map((k) => <button key={k} className={`chip ${stat === k ? 'active' : ''}`} onClick={() => setStat(k)}><Art name={STAT_META[k].icon} size={18} /> {STAT_META[k].short}</button>)}
          </div>
        </div>
        <button className="btn" disabled={!title.trim()} onClick={submit}><Plus size={16} /> Quest annehmen</button>
      </div>
    </Sheet>
  )
}

export default function Quests() {
  const quests = useGame((s) => s.quests)
  const [view, setView] = useState<View>('daily')
  const [adding, setAdding] = useState(false)
  const penalty = quests.filter((q) => q.type === 'penalty' && !q.done)
  const list = quests
    .filter((q) => q.type === view)
    .sort((a, b) => Number(a.done) - Number(b.done))
  const doneN = quests.filter((q) => q.type === view && q.done).length

  return (
    <>
      <div className="page-title">
        <div>
          <p>Halte den Haken gedrückt, um abzuschließen</p>
          <h1>Quest-<span className="accent">Log</span></h1>
        </div>
        <button className="btn" onClick={() => setAdding(true)}><Plus size={16} /> Quest</button>
      </div>

      <AnimatePresence>
        {penalty.map((q) => <QuestCard key={q.id} q={q} />)}
      </AnimatePresence>

      <div className="row between wrap" style={{ margin: '6px 0 14px' }}>
        <div className="scroll-x">
          <Seg id="qv" value={view} onChange={setView} options={(Object.keys(VIEW_LABEL) as View[]).map((v) => ({ v, label: VIEW_LABEL[v] }))} />
        </div>
        <span className="small muted mono">{doneN}/{quests.filter((q) => q.type === view).length} erledigt</span>
      </div>

      <div className="grid-2" data-tour="quests">
        <AnimatePresence mode="popLayout">
          {list.map((q) => <QuestCard key={q.id} q={q} />)}
        </AnimatePresence>
      </div>
      {!list.length && (
        <Empty icon="calendar" text={view === 'side' ? 'Noch keine Nebenquests. Erstelle eigene einmalige Aufgaben!' : 'Keine Quests hier.'}>
          <button className="btn soft" onClick={() => setAdding(true)}><Plus size={16} /> Quest erstellen</button>
        </Empty>
      )}
      <NewQuest open={adding} onClose={() => setAdding(false)} />
    </>
  )
}
