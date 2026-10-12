import { AnimatePresence, motion } from 'framer-motion'
import { Lock, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { effectiveStats, useGame } from '../store/useGame'
import { ITEMS, RARITY_ORDER, SLOT_META } from '../game/items'
import { ACHIEVEMENTS } from '../game/achievements'
import { RARITY_META, STAT_KEYS, STAT_META } from '../game/leveling'
import type { ItemDef, ItemType, Slot } from '../game/types'
import { Empty, Seg, Sheet } from '../components/ui'

type View = 'bag' | 'equip' | 'shop' | 'fusion' | 'trophies'
const TYPE_LABEL: Record<ItemType | 'all', string> = { all: 'Alle', consumable: 'Tränke & Boxen', equipment: 'Ausrüstung', material: 'Material', reward: 'Belohnungen', key: 'Key Items' }

function ItemSheet({ def, onClose }: { def: ItemDef | null; onClose: () => void }) {
  const s = useGame()
  if (!def) return <Sheet open={false} onClose={onClose}>{null}</Sheet>
  const qty = s.inventory.find((i) => i.defId === def.id)?.qty ?? 0
  const equipped = def.slot && s.equipped[def.slot] === def.id
  return (
    <Sheet open={!!def} onClose={onClose}>
      <div className={`col r-${def.rarity}`} style={{ alignItems: 'center', gap: 10, textAlign: 'center' }}>
        <motion.div className="slot" style={{ width: 110, fontSize: 56 }} initial={{ rotateY: 90 }} animate={{ rotateY: 0 }}>{def.icon}</motion.div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20 }}>{def.name}</div>
          <div className="r-text mono tiny" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>{RARITY_META[def.rarity].label} · {TYPE_LABEL[def.type]}</div>
        </div>
        <p className="muted" style={{ margin: 0 }}>{def.desc}</p>
        {def.bonus && (
          <div className="row wrap" style={{ justifyContent: 'center', gap: 6 }}>
            {Object.entries(def.bonus).map(([k, v]) => <span key={k} className="pill" style={{ color: '#2fb385' }}>{STAT_META[k as keyof typeof STAT_META].short} +{v}</span>)}
            {def.slot && <span className="pill">{SLOT_META[def.slot].icon} {SLOT_META[def.slot].label}</span>}
          </div>
        )}
        <div className="small muted">Im Besitz: <b className="mono">{qty}</b></div>
        <div className="row" style={{ marginTop: 6 }}>
          {def.type === 'equipment' && qty > 0 && (
            equipped
              ? <button className="btn ghost" onClick={() => { s.unequip(def.slot!); onClose() }}>Ablegen</button>
              : <button className="btn" onClick={() => { s.equip(def.id); onClose() }}>Ausrüsten</button>
          )}
          {(def.type === 'consumable' || def.type === 'reward') && def.effect?.kind !== 'streakShield' && qty > 0 && (
            <button className="btn" onClick={() => { s.useItem(def.id); onClose() }}>{def.type === 'reward' ? 'Einlösen 💖' : def.effect?.kind === 'mystery' ? 'Öffnen ✨' : 'Benutzen'}</button>
          )}
          {def.effect?.kind === 'streakShield' && <span className="small muted">Wird automatisch verwendet, wenn du eine Daily Quest verpasst.</span>}
        </div>
      </div>
    </Sheet>
  )
}

function Bag({ onOpen }: { onOpen: (d: ItemDef) => void }) {
  const s = useGame()
  const [filter, setFilter] = useState<ItemType | 'all'>('all')
  useEffect(() => () => useGame.getState().markSeen(), [])
  const entries = s.inventory
    .map((e) => ({ e, d: s.itemDef(e.defId)! }))
    .filter((x) => x.d && (filter === 'all' || x.d.type === filter))
    .sort((a, b) => RARITY_ORDER.indexOf(b.d.rarity) - RARITY_ORDER.indexOf(a.d.rarity))
  const cap = 48
  const used = s.inventory.length
  return (
    <div className="card">
      <div className="chips" style={{ marginBottom: 14 }}>
        {(Object.keys(TYPE_LABEL) as (ItemType | 'all')[]).map((t) => (
          <button key={t} className={`chip ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>{TYPE_LABEL[t]}</button>
        ))}
      </div>
      <motion.div className="inv-grid" layout>
        <AnimatePresence>
          {entries.map(({ e, d }, i) => (
            <motion.button
              key={e.defId}
              layout
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1, transition: { delay: i * 0.02 } }}
              exit={{ opacity: 0, scale: 0.6 }}
              whileTap={{ scale: 0.9 }}
              className={`slot r-${d.rarity}`}
              onClick={() => onOpen(d)}
              title={d.name}
            >
              {d.icon}
              {e.qty > 1 && <span className="qty">×{e.qty}</span>}
              {e.isNew && <span className="new" />}
              {Object.values(s.equipped).includes(d.id) && <span className="eq-tag">E</span>}
            </motion.button>
          ))}
        </AnimatePresence>
        {filter === 'all' && Array.from({ length: Math.max(0, Math.min(12, cap - used)) }, (_, i) => <div key={'e' + i} className="slot empty" />)}
      </motion.div>
      <div className="row between tiny muted mono" style={{ marginTop: 12 }}><span>Platz {used}/{cap}</span><span>Tippe ein Item für Details</span></div>
    </div>
  )
}

function Equip({ onOpen }: { onOpen: (d: ItemDef) => void }) {
  const s = useGame()
  const { total, bonus } = effectiveStats(s)
  const owned = s.inventory.map((e) => s.itemDef(e.defId)!).filter((d) => d?.type === 'equipment')
  const slots = Object.keys(SLOT_META) as Slot[]
  return (
    <div className="grid-2">
      <div className="card">
        <div className="paperdoll">
          {slots.map((slot, i) => {
            const def = s.equipped[slot] ? s.itemDef(s.equipped[slot]!) : undefined
            return (
              <motion.button key={slot} whileTap={{ scale: 0.92 }} className={`pd-slot pd-${i}`} onClick={() => def && onOpen(def)}>
                <div className={`slot ${def ? `r-${def.rarity}` : 'empty'}`}>{def ? def.icon : SLOT_META[slot].icon}</div>
                <span className="tiny muted">{SLOT_META[slot].label}</span>
              </motion.button>
            )
          })}
          <div className="pd-center">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }} className="pd-figure">
              {s.equipped.aura && <span className="pd-aura" />}
              🧚
            </motion.div>
          </div>
        </div>
      </div>
      <div className="card">
        <h3>Ausrüstungs-Boni</h3>
        <div className="col" style={{ gap: 8 }}>
          {STAT_KEYS.map((k) => (
            <div key={k} className="row between small">
              <span>{STAT_META[k].icon} {STAT_META[k].label}</span>
              <span className="mono"><b>{total[k]}</b> {bonus[k] > 0 && <span style={{ color: '#2fb385' }}>(+{bonus[k]})</span>}</span>
            </div>
          ))}
        </div>
        <div className="divider" />
        <h3>Verfügbar</h3>
        {owned.length ? (
          <div className="inv-grid">
            {owned.map((d) => (
              <button key={d.id} className={`slot r-${d.rarity}`} onClick={() => onOpen(d)} title={d.name}>
                {d.icon}{Object.values(s.equipped).includes(d.id) && <span className="eq-tag">E</span>}
              </button>
            ))}
          </div>
        ) : <Empty icon="🗡️" text="Noch keine Ausrüstung – schließe Quests ab oder besuche den Shop." />}
      </div>
    </div>
  )
}

function ShopCard({ d, removable }: { d: ItemDef; removable?: boolean }) {
  const s = useGame()
  const canBuy = d.gemPrice ? s.player.gems >= d.gemPrice : s.player.gold >= (d.price ?? Infinity)
  return (
    <motion.div className={`shop-item r-${d.rarity}`} whileHover={{ y: -3 }}>
      <div className="slot" style={{ width: 54, fontSize: 26 }}>{d.icon}</div>
      <div className="grow">
        <div style={{ fontWeight: 700, fontSize: 14 }}>{d.name}</div>
        <div className="tiny muted">{d.desc}</div>
      </div>
      <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
        <button className="btn xs" disabled={!canBuy} onClick={() => s.buy(d.id)}>{d.gemPrice ? `💎 ${d.gemPrice}` : `🪙 ${d.price}`}</button>
        {removable && <button className="btn ghost xs" onClick={() => s.removeReward(d.id)} aria-label="Belohnung entfernen"><Trash2 size={12} /></button>}
      </div>
    </motion.div>
  )
}

function Shop() {
  const s = useGame()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🧋')
  const [price, setPrice] = useState(300)
  const [adding, setAdding] = useState(false)
  const goods = ITEMS.filter((i) => i.price || i.gemPrice)
  const rewards = s.customItems.filter((i) => i.type === 'reward')
  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-title"><h2>💖 Echte Belohnungen</h2><button className="btn soft xs" onClick={() => setAdding(true)}><Plus size={14} /> Neu</button></div>
        <p className="small muted" style={{ marginTop: -4 }}>Kaufe dir mit Gold echte Treats. Der Gutschein landet in deiner Tasche – einlösen, wenn du ihn dir gönnst.</p>
        <div className="col" style={{ gap: 10 }}>{rewards.map((d) => <ShopCard key={d.id} d={d} removable />)}</div>
      </div>
      <div className="card">
        <div className="card-title"><h2>🛍️ Händlerin Mira</h2><span className="tiny muted">Feste Preise</span></div>
        <div className="col" style={{ gap: 10 }}>{goods.map((d) => <ShopCard key={d.id} d={d} />)}</div>
      </div>
      <Sheet open={adding} onClose={() => setAdding(false)} title="Neue Belohnung">
        <div className="col" style={{ gap: 12 }}>
          <div className="row">
            <input className="input" style={{ width: 64, textAlign: 'center', fontSize: 24 }} value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} aria-label="Emoji" />
            <input className="input" placeholder="z. B. Neues Buch, Spa-Tag, Sushi…" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <label className="field">Preis: {price} Gold
            <input type="range" min={50} max={3000} step={50} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </label>
          <p className="tiny muted" style={{ margin: 0 }}>Faustregel: ~150 Gold ≈ ein guter Tag voller Quests.</p>
          <button className="btn" disabled={!name.trim()} onClick={() => { s.addReward(name.trim(), icon, price); setName(''); setAdding(false) }}>Hinzufügen</button>
        </div>
      </Sheet>
    </div>
  )
}

function Fusion() {
  const s = useGame()
  const [picked, setPicked] = useState<string[]>([])
  const avail = useMemo(() => {
    const counts: Record<string, number> = {}
    s.inventory.forEach((e) => (counts[e.defId] = e.qty))
    picked.forEach((p) => counts[p]--)
    return counts
  }, [s.inventory, picked])
  const defs = picked.map((p) => s.itemDef(p)!)
  const rarity = defs[0]?.rarity
  const fusable = s.inventory.map((e) => s.itemDef(e.defId)!).filter((d) => d && d.type !== 'key' && d.type !== 'reward' && d.rarity !== 'mythic' && !Object.values(s.equipped).includes(d.id))
  const ok = picked.length === 3 && defs.every((d) => d.rarity === rarity)
  return (
    <div className="grid-2">
      <div className="sys center">
        <div className="sys-head">◆ Fusion ◆</div>
        <p className="small" style={{ marginTop: -4 }}>Kombiniere 3 Items gleicher Seltenheit zu einem zufälligen Item der nächsthöheren Stufe.</p>
        <div className="fusion-ring">
          {[0, 1, 2].map((i) => {
            const d = defs[i]
            return (
              <motion.button key={i} className={`slot ${d ? `r-${d.rarity}` : 'empty'} f-${i}`} onClick={() => setPicked(picked.filter((_, j) => j !== i))} animate={ok ? { scale: [1, 1.08, 1] } : {}} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}>
                {d ? d.icon : '+'}
              </motion.button>
            )
          })}
          <motion.div className="fusion-core" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: ok ? 2 : 12, ease: 'linear' }}>✦</motion.div>
        </div>
        {rarity && <p className="small">Ergebnis: <b className={`r-${RARITY_ORDER[RARITY_ORDER.indexOf(rarity) + 1]}`}><span className="r-text">{RARITY_META[RARITY_ORDER[RARITY_ORDER.indexOf(rarity) + 1]].label}</span></b></p>}
        <button className="btn sys-btn" disabled={!ok} onClick={() => { s.fuse(picked); setPicked([]) }}>Fusionieren</button>
      </div>
      <div className="card">
        <h3>Wähle Items</h3>
        {fusable.length ? (
          <div className="inv-grid">
            {fusable.map((d) => (
              <button key={d.id} className={`slot r-${d.rarity}`} disabled={!avail[d.id] || picked.length >= 3 || (!!rarity && d.rarity !== rarity)} style={{ opacity: !avail[d.id] || (!!rarity && d.rarity !== rarity) ? 0.3 : 1 }} onClick={() => setPicked([...picked, d.id])} title={d.name}>
                {d.icon}<span className="qty">×{avail[d.id]}</span>
              </button>
            ))}
          </div>
        ) : <Empty icon="🔮" text="Sammle Materialien durch Quests." />}
      </div>
    </div>
  )
}

function Trophies() {
  const s = useGame()
  return (
    <div className="card">
      <div className="card-title"><h2>Erfolge</h2><span className="mono small">{s.achievements.length}/{ACHIEVEMENTS.length}</span></div>
      <div className="trophy-grid">
        {ACHIEVEMENTS.map((a, i) => {
          const got = s.achievements.includes(a.id)
          return (
            <motion.div key={a.id} className={`trophy ${got ? 'got' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.025 } }}>
              <div className="t-medal">{got ? a.icon : <Lock size={18} />}</div>
              <div className="grow">
                <div style={{ fontWeight: 700, fontSize: 14 }}>{a.name}</div>
                <div className="tiny muted">{a.desc}</div>
                {a.title && <div className="tiny" style={{ color: 'var(--lilac-deep)', fontWeight: 700 }}>Titel: {a.title}</div>}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default function Inventory() {
  const [view, setView] = useState<View>('bag')
  const [open, setOpen] = useState<ItemDef | null>(null)
  const p = useGame((s) => s.player)
  return (
    <>
      <div className="page-title">
        <div>
          <p>🪙 {p.gold.toLocaleString('de-DE')} Gold · 💎 {p.gems} Kristalle</p>
          <h1><span className="accent">Inventar</span></h1>
        </div>
      </div>
      <div className="scroll-x" style={{ marginBottom: 16 }}>
        <Seg id="inv" value={view} onChange={setView} options={[
          { v: 'bag', label: '🎒 Tasche' }, { v: 'equip', label: '🗡️ Ausrüstung' }, { v: 'shop', label: '🛍️ Shop' }, { v: 'fusion', label: '🔮 Fusion' }, { v: 'trophies', label: '🏆 Erfolge' },
        ]} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
          {view === 'bag' && <Bag onOpen={setOpen} />}
          {view === 'equip' && <Equip onOpen={setOpen} />}
          {view === 'shop' && <Shop />}
          {view === 'fusion' && <Fusion />}
          {view === 'trophies' && <Trophies />}
        </motion.div>
      </AnimatePresence>
      <ItemSheet def={open} onClose={() => setOpen(null)} />
    </>
  )
}
