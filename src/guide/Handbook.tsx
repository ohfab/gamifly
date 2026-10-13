import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useGame } from '../store/useGame'
import { Art } from '../art/Art'
import { Sheet } from '../components/ui'
import { TOPICS, topicById } from './topics'

export function Handbook() {
  const id = useGame((s) => s.handbook)
  const setUi = useGame((s) => s.setUi)
  const setTab = useGame((s) => s.setTab)
  const topic = id && id !== 'start' ? topicById(id === 'start_' ? 'start' : id) : null
  const close = () => setUi({ handbook: null })
  return (
    <Sheet open={id != null} onClose={close} title="Handbuch">
      <AnimatePresence mode="wait">
        {!topic ? (
          <motion.div key="list" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="col" style={{ gap: 10 }}>
            <div className="list-item" style={{ alignItems: 'flex-start' }}>
              <Art name="lumi" size={48} />
              <div className="grow small">Alles über Gamifly an einem Ort. Tippe ein Thema an, lass es dir vorlesen, oder starte die geführte Tour.</div>
            </div>
            <button className="btn" onClick={() => setUi({ handbook: null, companionOpen: false, tourStep: 0 })}>Geführte Tour starten</button>
            <div className="handbook-grid">
              {TOPICS.map((t) => (
                <motion.button key={t.id} whileTap={{ scale: 0.96 }} className="handbook-tile" onClick={() => setUi({ handbook: t.id === 'start' ? 'start_' : t.id })}>
                  <Art name={t.art} size={40} />
                  <b className="small">{t.title}</b>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key={topic.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="col" style={{ gap: 12 }}>
            <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setUi({ handbook: 'start' })}><ArrowLeft size={16} /> Alle Themen</button>
            <div className="row" style={{ gap: 14 }}>
              <div className="slot" style={{ width: 80, ['--r' as string]: 'var(--lilac)' }}><Art name={topic.art} size={60} /></div>
              <h3 style={{ margin: 0, fontSize: 22 }}>{topic.title}</h3>
            </div>
            <p style={{ margin: 0, lineHeight: 1.55 }}>{topic.say}</p>
            <ul className="handbook-points">{topic.points.map((p) => <li key={p}>{p}</li>)}</ul>
            <div className="row wrap">
              {topic.tab && <button className="btn sm" onClick={() => { setTab(topic.tab!); setUi({ handbook: null, companionOpen: false }) }}>Dorthin</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  )
}
