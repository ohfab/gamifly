import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useGame, mpLeft, todayLog, vitals } from '../store/useGame'
import { RED_GATE_TASKS, SHADOWS, SHADOW_RANKS, SKILLS, ariseChance } from '../game/skills'
import { effectiveStats } from '../store/useGame'
import { Art } from '../art/Art'
import { Bar, HoldButton, itemV } from './ui'
import { fmtDuration } from '../lib/util'

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}

/** Surprise emergency quest: red window, countdown, progress or hold-to-confirm. */
export function RedGateCard() {
  const rg = useGame((s) => s.redGate)
  const confirm = useGame((s) => s.confirmRedGate)
  const health = useGame((s) => s.health)
  const questsDone = useGame((s) => s.stats.questsDone)
  const now = useNow()
  if (!rg) return null
  const t = RED_GATE_TASKS.find((x) => x.id === rg.task)
  if (!t) return null
  const left = Math.max(0, rg.until - now)
  const cur = t.metric === 'quests' ? questsDone : t.metric ? ((todayLog({ health })[t.metric] as number | undefined) ?? 0) : 0
  const prog = t.amount ? Math.min(t.amount, Math.max(0, cur - rg.base)) : 0
  return (
    <motion.div variants={itemV} className={`red-gate ${rg.done ? 'cleared' : ''}`} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="rg-head">
        <span className="rg-tag">⚠ RED GATE</span>
        <span className="mono rg-time">{rg.done ? 'GECLEART' : fmtDuration(left)}</span>
      </div>
      <div className="row" style={{ gap: 14, alignItems: 'center' }}>
        <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}><Art name="red_gate" size={64} /></motion.div>
        <div className="grow col" style={{ gap: 4 }}>
          <b className="rg-title">{t.title}</b>
          <span className="small">{t.desc}</span>
          {t.amount ? (
            <div className="col" style={{ gap: 4, marginTop: 6 }}>
              <Bar kind="hp" value={prog} max={t.amount} />
              <span className="tiny mono">{prog.toLocaleString('de-DE')} / {t.amount.toLocaleString('de-DE')}</span>
            </div>
          ) : null}
        </div>
        {!t.amount && !rg.done && <HoldButton onDone={confirm} ms={900}><Art name="star" size={20} /></HoldButton>}
      </div>
      {!rg.done && <p className="tiny" style={{ margin: '10px 0 0', opacity: 0.75 }}>Belohnung: 160 XP · 120 Gold · 3 Kristalle · garantiert seltenes Item. Läuft die Zeit ab, verlierst du Gold.</p>}
    </motion.div>
  )
}

/** Active skills: spend today's mana on buffs. */
export function SkillsCard() {
  const s = useGame()
  const cast = useGame((st) => st.castSkill)
  const v = vitals(s)
  const mp = mpLeft(s)
  const now = useNow(5000)
  const b = s.skills.buffs
  const active = [
    b.dash && b.dash.until > now && b.dash.charges > 0 ? `Sprint ${b.dash.charges}× · ${Math.ceil((b.dash.until - now) / 60000)} Min` : null,
    b.bloodlust ? `Blutrausch ${b.bloodlust}×` : null,
    b.stealth ? 'Tarnung bereit' : null,
    b.ruler ? 'Herrscher-Autorität bereit' : null,
  ].filter(Boolean) as string[]
  return (
    <motion.div variants={itemV} className="card skills-card">
      <div className="card-title"><h3 className="row" style={{ gap: 8 }}><Art name="skill" size={24} /> Skills</h3><span className="mono tiny" style={{ color: 'var(--sky)' }}>{mp} / {v.maxMp} MP</span></div>
      <Bar kind="mp" value={mp} max={v.maxMp} />
      <div className="skill-grid">
        {SKILLS.filter((k) => k.id !== 'arise').map((k) => {
          const locked = s.player.level < k.level
          const poor = mp < k.mp
          return (
            <motion.button key={k.id} whileTap={{ scale: 0.95 }} className={`skill ${locked ? 'locked' : ''} ${poor && !locked ? 'poor' : ''}`} onClick={() => cast(k.id)} title={k.desc}>
              <Art name={k.art} size={34} />
              <b className="small">{k.name}</b>
              <span className="tiny mono">{locked ? `LV ${k.level}` : `${k.mp} MP`}</span>
            </motion.button>
          )
        })}
      </div>
      {active.length > 0 && <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>{active.map((a) => <span key={a} className="pill buff">{a}</span>)}</div>}
      <p className="tiny muted" style={{ margin: '10px 0 0' }}>Mana füllt sich jeden Tag neu. Meditation und gute Stimmung geben mehr MP.</p>
    </motion.div>
  )
}

/** Shadows extracted from weekly bosses, each a passive perk that grows with rank. */
export function ShadowArmy() {
  const shadows = useGame((s) => s.shadows)
  return (
    <motion.div variants={itemV} className="card shadow-card">
      <div className="card-title"><h3 className="row" style={{ gap: 8 }}><Art name="shadow" size={24} /> Schattenarmee</h3><span className="tiny muted mono">{shadows.length} / {SHADOWS.length}</span></div>
      {shadows.length === 0 ? (
        <p className="small muted" style={{ margin: 0 }}>Noch keine Schatten. Besiege den Wochenboss und rufe danach „Erhebe dich“, um seinen Schatten in deine Armee aufzunehmen.</p>
      ) : (
        <div className="col" style={{ gap: 8 }}>
          {shadows.map((sh) => {
            const d = SHADOWS.find((x) => x.boss === sh.boss)
            if (!d) return null
            return (
              <div key={sh.boss} className="shadow-row" style={{ ['--sc' as string]: d.color }}>
                <div className="shadow-art"><Art name="shadow" size={44} /></div>
                <div className="grow">
                  <div className="row between"><b className="small">{d.name}</b><span className="tiny mono" style={{ color: d.color }}>{SHADOW_RANKS[sh.rank].toUpperCase()}</span></div>
                  <div className="tiny muted">{d.perk} · aktuell Rang {sh.rank + 1}</div>
                  <div className="shadow-pips">{SHADOW_RANKS.map((_, i) => <i key={i} className={i <= sh.rank ? 'on' : ''} />)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

/** Button + cinematic for extracting a shadow from the defeated weekly boss. */
export function AriseButton() {
  const s = useGame()
  const arise = useGame((st) => st.arise)
  const fx = useGame((st) => st.ariseFx)
  const [show, setShow] = useState<null | boolean>(null)
  const boss = s.boss
  useEffect(() => {
    if (!fx) return
    setShow(!!useGame.getState().boss?.extracted)
    const t = setTimeout(() => setShow(null), 2600)
    return () => clearTimeout(t)
  }, [fx])
  if (!boss?.defeated) return null
  const tries = boss.arise ?? 0
  const chance = Math.round(ariseChance(effectiveStats(s).total.int) * 100)
  return (
    <>
      {!boss.extracted && tries < 3 && (
        <motion.button className="btn arise-btn" whileTap={{ scale: 0.96 }} onClick={() => arise()}>
          <Art name="shadow" size={22} /> ERHEBE DICH <span className="tiny mono">40 MP · {chance} % · {3 - tries}×</span>
        </motion.button>
      )}
      {boss.extracted && <p className="small" style={{ margin: '10px 0 0', color: 'var(--lilac)' }}>Schatten extrahiert. Er kämpft jetzt in deiner Armee.</p>}
      <AnimatePresence>
        {show != null && (
          <motion.div className="arise-fx" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShow(null)}>
            <motion.div initial={{ y: 60, scale: 0.6, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 12 }}>
              <Art name="shadow" size={160} />
            </motion.div>
            <motion.div className="arise-text" initial={{ letterSpacing: '1.2em', opacity: 0 }} animate={{ letterSpacing: '0.3em', opacity: 1 }} transition={{ duration: 0.9 }}>
              {show ? 'ERHEBE DICH' : 'FEHLGESCHLAGEN'}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
