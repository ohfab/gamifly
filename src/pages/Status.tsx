import { motion } from 'framer-motion'
import { Flame, Gift, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { effectiveStats, useGame, vitals } from '../store/useGame'
import { STAT_KEYS, STAT_META, STAT_XP_PER_POINT, rankFor, xpToNext } from '../game/leveling'
import { SLOT_META } from '../game/items'
import type { Slot } from '../game/types'
import { dayKey, fmt, fmtDuration, msToMidnight } from '../lib/util'
import { Bar, ColorBar, HoldButton, Stagger, itemV } from '../components/ui'
import { Radar } from '../components/Charts'

function Countdown() {
  const [ms, setMs] = useState(msToMidnight())
  useEffect(() => { const t = setInterval(() => setMs(msToMidnight()), 1000); return () => clearInterval(t) }, [])
  return <span className="mono">{fmtDuration(ms)}</span>
}

export default function Status() {
  const s = useGame()
  const p = s.player
  const { total, bonus } = effectiveStats(s)
  const v = vitals(s)
  const rank = rankFor(p.level)
  const dailies = s.quests.filter((q) => q.type === 'daily')
  const doneCount = dailies.filter((q) => q.done).length
  const penalty = s.quests.filter((q) => q.type === 'penalty' && !q.done)
  const chestReady = s.chestDay !== dayKey()
  const hour = new Date().getHours()
  const greet = hour < 11 ? 'Guten Morgen' : hour < 17 ? 'Hey' : hour < 22 ? 'Guten Abend' : 'Gute Nacht'

  return (
    <>
      <div className="page-title">
        <div>
          <p>{greet}, {p.name} ✨</p>
          <h1>Dein <span className="accent">Status</span></h1>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <motion.span className="currency" animate={p.streak > 0 ? { scale: [1, 1.08, 1] } : {}} transition={{ repeat: Infinity, duration: 2 }} style={{ color: p.streak > 0 ? '#ff7a45' : undefined }}>
            <Flame size={15} /> {p.streak}
          </motion.span>
        </div>
      </div>

      {penalty.length > 0 && (
        <motion.div className="sys" style={{ marginBottom: 16, ['--sys' as string]: 'var(--danger)', ['--sys-glow' as string]: 'rgba(239,90,122,.4)' }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="sys-head">⚠ Strafzone ⚠</div>
          {penalty.map((q) => (
            <div key={q.id} className="row">
              <div className="grow"><b>{q.title}</b><div className="small muted">{q.desc}</div></div>
              <HoldButton onDone={() => s.completeQuest(q.id)}>✓</HoldButton>
            </div>
          ))}
        </motion.div>
      )}

      <div className="grid-2">
        <Stagger className="col" >
          <motion.div variants={itemV} className="sys">
            <div className="sys-head">◆ Status ◆</div>
            <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
              <div className="avatar-orb">
                <span>{p.name.slice(0, 1).toUpperCase() || '✦'}</span>
                {s.equipped.aura && <i className="aura" />}
              </div>
              <div className="grow col" style={{ gap: 6 }}>
                <div className="row between">
                  <span className="mono small muted">NAME</span><b>{p.name}</b>
                </div>
                <div className="row between">
                  <span className="mono small muted">LEVEL</span><b className="mono">{p.level}</b>
                </div>
                <div className="row between">
                  <span className="mono small muted">RANG</span><span className="rank-tag" style={{ background: rank.color }}>{rank.rank}-Rang</span>
                </div>
                <div className="row between">
                  <span className="mono small muted">TITEL</span>
                  <select className="input" style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }} value={p.title} onChange={(e) => s.setTitle(e.target.value)}>
                    {s.titles.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="col" style={{ gap: 8, marginTop: 14 }}>
              <div className="row"><span className="mono tiny" style={{ width: 26 }}>HP</span><div className="grow"><Bar kind="hp" value={v.hp} max={v.maxHp} /></div><span className="mono tiny muted" style={{ width: 64, textAlign: 'right' }}>{v.hp}/{v.maxHp}</span></div>
              <div className="row"><span className="mono tiny" style={{ width: 26 }}>MP</span><div className="grow"><Bar kind="mp" value={v.mp} max={v.maxMp} /></div><span className="mono tiny muted" style={{ width: 64, textAlign: 'right' }}>{v.mp}/{v.maxMp}</span></div>
              <div className="row"><span className="mono tiny" style={{ width: 26 }}>XP</span><div className="grow"><Bar value={p.xp} max={xpToNext(p.level)} /></div><span className="mono tiny muted" style={{ width: 64, textAlign: 'right' }}>{Math.round((p.xp / xpToNext(p.level)) * 100)}%</span></div>
              <p className="tiny muted" style={{ margin: 0 }}>HP steigt mit Schlaf, Wasser & Schritten · MP mit Stimmung & Meditation</p>
            </div>
            <div className="divider" />
            <div className="row between" style={{ marginBottom: 8 }}>
              <span className="mono small" style={{ fontWeight: 700 }}>ATTRIBUTE</span>
              {p.statPoints > 0 && (
                <motion.span className="pill" animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} style={{ background: 'var(--sys)', color: 'white', border: 'none' }}>
                  {p.statPoints} freie Punkte
                </motion.span>
              )}
            </div>
            <div className="stat-grid">
              {STAT_KEYS.map((k) => (
                <div key={k} className="stat-cell">
                  <div className="row between">
                    <span className="small"><span style={{ marginRight: 4 }}>{STAT_META[k].icon}</span><b className="mono">{STAT_META[k].short}</b></span>
                    <span className="row" style={{ gap: 6 }}>
                      <motion.b key={total[k]} className="mono" initial={{ scale: 1.6, color: '#ee4f9b' }} animate={{ scale: 1, color: 'var(--ink)' }}>{total[k]}</motion.b>
                      {bonus[k] > 0 && <span className="tiny" style={{ color: '#2fb385', fontWeight: 700 }}>+{bonus[k]}</span>}
                      {p.statPoints > 0 && (
                        <motion.button whileTap={{ scale: 0.8 }} className="stat-plus" onClick={() => s.allocate(k)} aria-label={`${STAT_META[k].label} erhöhen`}><Plus size={14} /></motion.button>
                      )}
                    </span>
                  </div>
                  <ColorBar value={p.statXp[k]} max={STAT_XP_PER_POINT} color="linear-gradient(90deg,var(--pink),var(--lilac))" />
                  <div className="tiny muted">{STAT_META[k].desc}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemV} className="card">
            <div className="card-title"><h3>Attribut-Profil</h3><span className="tiny muted">Basis + Ausrüstung</span></div>
            <Radar stats={total} />
          </motion.div>
        </Stagger>

        <Stagger className="col">
          <motion.div variants={itemV} className="sys">
            <div className="sys-head">◆ Daily Quest ◆</div>
            <p className="center mono small" style={{ marginTop: -4 }}>Tägliche Quest: Vorbereitung, um stärker zu werden.</p>
            <div className="col" style={{ gap: 8 }}>
              {dailies.map((q) => (
                <div key={q.id} className={`daily-row ${q.done ? 'done' : ''}`}>
                  <span className="grow">{q.title}</span>
                  <span className="mono small">
                    [{q.target ? `${fmt(Math.min(q.progress ?? 0, q.target))}/${fmt(q.target)}` : q.done ? '1/1' : '0/1'}]
                  </span>
                  {!q.target && !q.done && <HoldButton onDone={() => s.completeQuest(q.id)}>✓</HoldButton>}
                  {q.done && <span className="check">✓</span>}
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="row between small">
              <span>Fortschritt <b className="mono">{doneCount}/{dailies.length}</b></span>
              <span className="muted">Reset in <Countdown /></span>
            </div>
            <div className="mt"><Bar value={doneCount} max={dailies.length} size="lg" /></div>
            <p className="tiny center mono" style={{ color: 'var(--danger)', margin: '12px 0 0' }}>
              ⚠ WARNUNG: Wird die Daily Quest nicht abgeschlossen, droht die Strafzone.
            </p>
            <p className="tiny center muted" style={{ margin: '4px 0 0' }}>Wasser, Schritte & Workout trägst du im Life-Tab ein – sie zählen automatisch.</p>
          </motion.div>

          <motion.div variants={itemV} className="card chest-card">
            <div className="row">
              <motion.div className="chest" animate={chestReady ? { rotate: [0, -6, 6, -4, 0], y: [0, -4, 0] } : {}} transition={{ repeat: Infinity, duration: 2.2, repeatDelay: 1 }}>
                {chestReady ? '🎁' : '📭'}
              </motion.div>
              <div className="grow">
                <b>Login-Kiste</b>
                <div className="small muted">{chestReady ? 'Deine tägliche Belohnung wartet!' : 'Morgen gibt es eine neue Kiste.'}</div>
              </div>
              <button className="btn sm" disabled={!chestReady} onClick={() => s.claimChest()}><Gift size={16} /> Öffnen</button>
            </div>
          </motion.div>

          <motion.div variants={itemV} className="card">
            <div className="card-title"><h3>Ausrüstung</h3><button className="btn ghost xs" onClick={() => s.setTab('inventory')}>Inventar →</button></div>
            <div className="equip-mini">
              {(Object.keys(SLOT_META) as Slot[]).map((slot) => {
                const def = s.equipped[slot] ? s.itemDef(s.equipped[slot]!) : undefined
                return (
                  <div key={slot} className={`slot ${def ? `r-${def.rarity}` : 'empty'}`} title={def?.name ?? SLOT_META[slot].label}>
                    {def ? def.icon : <span style={{ opacity: 0.5 }}>{SLOT_META[slot].icon}</span>}
                  </div>
                )
              })}
            </div>
          </motion.div>

          <motion.div variants={itemV} className="card">
            <div className="card-title"><h3>System-Log</h3><span className="tiny muted">{fmt(p.totalXp)} XP gesamt</span></div>
            <div className="col" style={{ gap: 8, maxHeight: 260, overflow: 'auto' }}>
              {s.log.slice(0, 14).map((l, i) => (
                <div key={i} className="row small">
                  <span style={{ width: 22, textAlign: 'center' }}>{l.icon}</span>
                  <span className="grow">{l.text}</span>
                  <span className="tiny muted mono">{new Date(l.t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </Stagger>
      </div>
    </>
  )
}
