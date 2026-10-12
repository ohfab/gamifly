import { AnimatePresence, motion } from 'framer-motion'
import { Backpack, HeartPulse, House, Settings, Shirt, Sparkles, Swords } from 'lucide-react'
import { useMemo } from 'react'
import { useGame, type Tab } from '../store/useGame'
import { rankFor, xpToNext } from '../game/leveling'
import { fmt } from '../lib/util'
import { sfx } from '../lib/sfx'
import { Bar } from './ui'

export function Ambient() {
  const stars = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ left: Math.random() * 100, top: Math.random() * 100, delay: (i * 0.7) % 5, size: 8 + Math.random() * 10 })),
    [],
  )
  return (
    <div className="ambient" aria-hidden>
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      {stars.map((s, i) => (
        <span key={i} className="star" style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s`, fontSize: s.size }}>✦</span>
      ))}
    </div>
  )
}

export function Hud({ onSettings }: { onSettings: () => void }) {
  const p = useGame((s) => s.player)
  const rank = rankFor(p.level)
  return (
    <header className="hud">
      <div className="hud-inner">
        <motion.div className="lv-badge" key={p.level} initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
          <div className="center"><small>LV</small><br /><b>{p.level}</b></div>
        </motion.div>
        <div className="grow col" style={{ gap: 5 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="name">{p.name || 'Player'}</span>
            <span className="rank-tag" style={{ background: rank.color }}>{rank.rank}</span>
            <span className="title grow">{p.title}</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div className="grow"><Bar value={p.xp} max={xpToNext(p.level)} /></div>
            <span className="mono tiny muted">{fmt(p.xp)}/{fmt(xpToNext(p.level))}</span>
          </div>
        </div>
        <span className="currency" title="Gold">🪙 {fmt(p.gold)}</span>
        <span className="currency hide-sm" title="Kristalle">💎 {p.gems}</span>
        <button className="btn ghost icon" onClick={onSettings} aria-label="Einstellungen"><Settings size={18} /></button>
      </div>
    </header>
  )
}

const TABS: { id: Tab; label: string; Icon: typeof House }[] = [
  { id: 'status', label: 'Status', Icon: Sparkles },
  { id: 'quests', label: 'Quests', Icon: Swords },
  { id: 'home', label: 'Wohnung', Icon: House },
  { id: 'style', label: 'Style', Icon: Shirt },
  { id: 'life', label: 'Life', Icon: HeartPulse },
  { id: 'inventory', label: 'Inventar', Icon: Backpack },
]

export function Nav() {
  const tab = useGame((s) => s.tab)
  const setTab = useGame((s) => s.setTab)
  const hasNew = useGame((s) => s.inventory.some((i) => i.isNew))
  const points = useGame((s) => s.player.statPoints)
  const openQuests = useGame((s) => s.quests.some((q) => q.type === 'penalty' && !q.done))
  return (
    <nav className="nav">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} className={tab === id ? 'active' : ''} onClick={() => { sfx.tap(); setTab(id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          {tab === id && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <motion.span animate={{ y: tab === id ? -1 : 0, scale: tab === id ? 1.12 : 1 }}><Icon size={21} strokeWidth={tab === id ? 2.4 : 2} /></motion.span>
          <span className="lbl">{label}</span>
          {((id === 'inventory' && hasNew) || (id === 'status' && points > 0) || (id === 'quests' && openQuests)) && <span className="dot" />}
        </button>
      ))}
    </nav>
  )
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts)
  const dismiss = useGame((s) => s.dismiss)
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            layout
            key={t.id}
            className={`toast ${t.tone ?? ''}`}
            initial={{ opacity: 0, y: -20, scale: 0.95, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={() => dismiss(t.id)}
          >
            <div className="t-icon">{t.icon ?? '◆'}</div>
            <div className="grow">
              <div className="t-title">{t.tone === 'system' ? `[SYSTEM] ${t.title}` : t.title}</div>
              {t.body && <div className="t-body">{t.body}</div>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function Burst({ n = 26, colors = ['#ff8fc7', '#b49cff', '#ffd36e', '#8ee3c8', '#9fd3ff'] }: { n?: number; colors?: string[] }) {
  const parts = useMemo(() => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.3
    const d = 120 + Math.random() * 140
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, c: colors[i % colors.length], s: 6 + Math.random() * 8, r: Math.random() * 360 }
  }), [n, colors])
  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', pointerEvents: 'none' }}>
      {parts.map((p, i) => (
        <motion.span
          key={i}
          style={{ position: 'absolute', width: p.s, height: p.s, borderRadius: i % 3 ? '50%' : 3, background: p.c }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1, rotate: p.r }}
          transition={{ duration: 1.4, ease: [0.2, 0.8, 0.3, 1], delay: 0.15 }}
        />
      ))}
    </div>
  )
}

export function LevelUp() {
  const lv = useGame((s) => s.levelUp)
  const close = useGame((s) => s.closeLevelUp)
  const setTab = useGame((s) => s.setTab)
  return (
    <AnimatePresence>
      {lv && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <Burst n={36} />
          <motion.div
            className="sys center"
            style={{ width: 'min(400px, 100%)', padding: '28px 22px' }}
            initial={{ scale: 0.6, opacity: 0, rotateX: 40 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sys-head">◆ System ◆</div>
            <motion.div className="mono" initial={{ letterSpacing: '0.6em', opacity: 0 }} animate={{ letterSpacing: '0.18em', opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }} style={{ fontSize: 30, fontWeight: 700, color: 'var(--sys)', textShadow: '0 0 20px var(--sys-glow)' }}>
              LEVEL UP!
            </motion.div>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.45, type: 'spring', stiffness: 260, damping: 12 }} style={{ fontFamily: 'var(--display)', fontStyle: 'var(--display-style)', fontWeight: 'var(--display-weight)', fontStretch: 'var(--display-stretch)', fontSize: 84, lineHeight: 1.1, background: 'linear-gradient(135deg,var(--pink-deep),var(--lilac-deep))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {lv}
            </motion.div>
            <p className="muted" style={{ margin: '6px 0 18px' }}>+3 Statuspunkte · Bonus-Gold erhalten<br />Du bist stärker geworden.</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn ghost" onClick={close}>Weiter</button>
              <button className="btn sys-btn" onClick={() => { close(); setTab('status') }}>Punkte verteilen</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function LootReveal() {
  const items = useGame((s) => s.reveal)
  const close = useGame((s) => s.closeReveal)
  return (
    <AnimatePresence>
      {items && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <Burst />
          <div className="col center" style={{ alignItems: 'center', gap: 18 }} onClick={(e) => e.stopPropagation()}>
            <motion.div className="mono" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ color: 'white', letterSpacing: '0.25em', fontWeight: 700, textShadow: '0 0 18px rgba(255,255,255,.6)' }}>
              ◆ ITEM ERHALTEN ◆
            </motion.div>
            <div className="row" style={{ gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              {items.map((it, i) => (
                <motion.div
                  key={i}
                  className={`r-${it.rarity}`}
                  initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
                  animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.25, type: 'spring', stiffness: 160, damping: 14 }}
                  style={{ width: 170, padding: 18, borderRadius: 22, background: 'var(--surface-solid)', border: '2px solid var(--r)', boxShadow: '0 0 40px var(--r), var(--shadow-lg)' }}
                >
                  <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.4 }} style={{ fontSize: 56 }}>{it.icon}</motion.div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{it.name}</div>
                  <div className="r-text tiny mono" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{rarityLabel(it.rarity)}</div>
                  <div className="tiny muted" style={{ marginTop: 6 }}>{it.desc}</div>
                </motion.div>
              ))}
            </div>
            <motion.button className="btn" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.6 } }} onClick={close}>Einsammeln ✨</motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const rarityLabel = (r: string) => ({ common: 'Gewöhnlich', uncommon: 'Ungewöhnlich', rare: 'Selten', epic: 'Episch', legendary: 'Legendär', mythic: 'Mythisch' } as Record<string, string>)[r]
