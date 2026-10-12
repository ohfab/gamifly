import { AnimatePresence, motion } from 'framer-motion'
import { Lightbulb, Moon, Plus, Power, RotateCcw, ShoppingCart, Sun, Thermometer, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useGame } from '../store/useGame'
import { Apartment, type ApartmentHandle } from '../scene/Apartment'
import { ROOM_ICON } from '../data/home'
import { foodEmoji } from '../data/food'
import type { Device, FridgeZone, Room } from '../game/types'
import { addDays, dayKey, daysBetween } from '../lib/util'
import { ColorBar, Empty, Seg, Sheet } from '../components/ui'

const cleanliness = (r: Room) => Math.max(0, Math.round(100 - ((Date.now() - r.lastCleaned) / 86400000) * 14))
const DEVICE_ICON: Record<Device['kind'], string> = { light: '💡', thermostat: '🌡️', plug: '🔌', vacuum: '🤖', speaker: '🔊', blinds: '🪟' }

function expiryInfo(exp?: string) {
  if (!exp) return null
  const d = daysBetween(dayKey(), exp)
  if (d < 0) return { label: 'abgelaufen', color: '#ef5a7a' }
  if (d === 0) return { label: 'heute', color: '#ff8a5b' }
  if (d <= 2) return { label: `${d} T.`, color: '#ffb84d' }
  return { label: `${d} T.`, color: '#3fc796' }
}

function DeviceRow({ d }: { d: Device }) {
  const toggle = useGame((s) => s.toggleDevice)
  const setV = useGame((s) => s.setDevice)
  const rooms = useGame((s) => s.home.rooms)
  return (
    <div className={`device ${d.on ? 'on' : ''}`}>
      <div className="row">
        <span className="dev-icon">{DEVICE_ICON[d.kind]}</span>
        <div className="grow">
          <b className="small">{d.name}</b>
          <div className="tiny muted">{rooms.find((r) => r.id === d.roomId)?.name}{d.kind === 'thermostat' && ` · ${d.value}°C`}{d.kind === 'light' && d.on && ` · ${d.value}%`}</div>
        </div>
        <button className={`switch ${d.on ? 'on' : ''}`} onClick={() => toggle(d.id)} aria-label={`${d.name} schalten`}><motion.i layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} /></button>
      </div>
      {d.on && (d.kind === 'light' || d.kind === 'thermostat' || d.kind === 'speaker') && (
        <div className="row" style={{ marginTop: 8 }}>
          {d.kind === 'thermostat' ? <Thermometer size={14} /> : <Lightbulb size={14} />}
          <input type="range" min={d.kind === 'thermostat' ? 16 : 5} max={d.kind === 'thermostat' ? 26 : 100} step={d.kind === 'thermostat' ? 0.5 : 5} value={d.value ?? 50} onChange={(e) => setV(d.id, Number(e.target.value))} />
        </div>
      )}
    </div>
  )
}

function RoomPanel({ room }: { room: Room }) {
  const s = useGame()
  const [item, setItem] = useState('')
  const [where, setWhere] = useState('')
  const [need, setNeed] = useState('')
  const clean = cleanliness(room)
  const devices = s.home.devices.filter((d) => d.roomId === room.id)
  const cleanedToday = dayKey(new Date(room.lastCleaned)) === dayKey()
  return (
    <motion.div key={room.id} className="col" style={{ gap: 14 }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className="card">
        <div className="row between">
          <div className="row"><span style={{ fontSize: 30 }}>{ROOM_ICON[room.kind]}</span>
            <input className="room-name" value={room.name} onChange={(e) => s.renameRoom(room.id, e.target.value)} aria-label="Raumname" />
          </div>
        </div>
        <div className="row mt">
          <span className="small" style={{ width: 92 }}>Sauberkeit</span>
          <div className="grow"><ColorBar value={clean} max={100} color={clean > 66 ? '#3fc796' : clean > 33 ? '#ffb84d' : '#ef5a7a'} /></div>
          <b className="mono small">{clean}%</b>
        </div>
        <button className="btn mt" style={{ width: '100%' }} onClick={() => s.cleanRoom(room.id)}>
          🧹 {cleanedToday ? 'Heute schon aufgeräumt ✓' : 'Aufgeräumt! (+20 XP)'}
        </button>
      </div>

      <div className="card">
        <div className="card-title"><h3>📍 Was ist wo?</h3><span className="tiny muted">{room.items.length} Dinge</span></div>
        <div className="col" style={{ gap: 8 }}>
          <AnimatePresence initial={false}>
            {room.items.map((i) => (
              <motion.div key={i.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="list-item">
                <span style={{ fontSize: 20 }}>{i.icon}</span>
                <div className="grow"><b className="small">{i.name}</b>{i.where && <div className="tiny muted">{i.where}</div>}</div>
                <button className="btn ghost icon" style={{ width: 30, height: 30 }} onClick={() => s.removeRoomItem(room.id, i.id)} aria-label="Entfernen"><Trash2 size={14} /></button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="col mt" style={{ gap: 8 }}>
          <input className="input" placeholder="Gegenstand, z. B. Taschenlampe" value={item} onChange={(e) => setItem(e.target.value)} />
          <div className="row">
            <input className="input" placeholder="Wo genau? z. B. Schublade links" value={where} onChange={(e) => setWhere(e.target.value)} />
            <button className="btn icon" disabled={!item.trim()} onClick={() => { s.addRoomItem(room.id, { name: item.trim(), where: where.trim(), icon: foodEmoji(item) === '🥫' ? '📦' : foodEmoji(item) }); setItem(''); setWhere('') }} aria-label="Hinzufügen"><Plus size={18} /></button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title"><h3>✨ Was es braucht</h3></div>
        <div className="col" style={{ gap: 8 }}>
          {room.needs.map((n) => (
            <div key={n.id} className="list-item">
              <button className={`check-box ${n.done ? 'on' : ''}`} onClick={() => s.toggleNeed(room.id, n.id)} aria-label="Erledigt">{n.done && '✓'}</button>
              <span className="grow small" style={{ textDecoration: n.done ? 'line-through' : undefined, opacity: n.done ? 0.5 : 1 }}>{n.text}</span>
              {!n.done && <button className="btn ghost icon" style={{ width: 30, height: 30 }} title="Auf Einkaufsliste" onClick={() => s.needToShopping(room.id, n)}><ShoppingCart size={14} /></button>}
              <button className="btn ghost icon" style={{ width: 30, height: 30 }} onClick={() => s.removeNeed(room.id, n.id)} aria-label="Löschen"><Trash2 size={14} /></button>
            </div>
          ))}
          {!room.needs.length && <p className="small muted" style={{ margin: 0 }}>Alles da – dieser Raum ist happy. 💖</p>}
        </div>
        <div className="row mt">
          <input className="input" placeholder="z. B. Glühbirne E27, Pflanze gießen…" value={need} onChange={(e) => setNeed(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && need.trim()) { s.addNeed(room.id, need.trim()); setNeed('') } }} />
          <button className="btn icon" disabled={!need.trim()} onClick={() => { s.addNeed(room.id, need.trim()); setNeed('') }} aria-label="Hinzufügen"><Plus size={18} /></button>
        </div>
      </div>

      {devices.length > 0 && (
        <div className="card">
          <h3>🏠 Smart Home</h3>
          <div className="col" style={{ gap: 8 }}>{devices.map((d) => <DeviceRow key={d.id} d={d} />)}</div>
        </div>
      )}
    </motion.div>
  )
}

function FridgeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useGame()
  const [zone, setZone] = useState<FridgeZone>('fridge')
  const [name, setName] = useState('')
  const [qty, setQty] = useState(1)
  const [unit, setUnit] = useState('Stk')
  const [days, setDays] = useState(5)
  const [shop, setShop] = useState('')
  const list = s.home.fridge.filter((f) => f.zone === zone).sort((a, b) => (a.expires ?? '9').localeCompare(b.expires ?? '9'))
  const soon = s.home.fridge.filter((f) => f.expires && daysBetween(dayKey(), f.expires) <= 2)
  return (
    <Sheet open={open} onClose={onClose} title="Kühlschrank 🧊">
      <div className="col" style={{ gap: 14 }}>
        {soon.length > 0 && (
          <div className="list-item" style={{ borderColor: '#ffb84d', background: 'color-mix(in srgb, #ffb84d 10%, transparent)' }}>
            <span style={{ fontSize: 20 }}>⏰</span>
            <span className="small grow">Zuerst verbrauchen: <b>{soon.map((f) => f.name).join(', ')}</b></span>
          </div>
        )}
        <Seg id="zone" value={zone} onChange={setZone} options={[{ v: 'fridge', label: '🧊 Kühlschrank' }, { v: 'freezer', label: '❄️ Gefrier' }, { v: 'pantry', label: '🥫 Vorrat' }]} />
        <div className="col" style={{ gap: 8 }}>
          <AnimatePresence initial={false}>
            {list.map((f) => {
              const e = expiryInfo(f.expires)
              return (
                <motion.div key={f.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: 40 }} className="list-item">
                  <span style={{ fontSize: 24 }}>{f.icon}</span>
                  <div className="grow">
                    <b className="small">{f.name}</b>
                    <div className="tiny muted">{f.qty} {f.unit}</div>
                  </div>
                  {e && <span className="pill" style={{ color: e.color, borderColor: e.color }}>{e.label}</span>}
                  <button className="btn ghost xs" onClick={() => f.qty <= 1 ? s.removeFridge(f.id) : s.updateFridge(f.id, { qty: f.qty - 1 })} aria-label="weniger">−</button>
                  <button className="btn ghost xs" onClick={() => s.updateFridge(f.id, { qty: f.qty + 1 })} aria-label="mehr">+</button>
                  <button className="btn ghost xs" title="Leer → Einkaufsliste" onClick={() => { s.addShopping(f.name); s.removeFridge(f.id) }}><ShoppingCart size={12} /></button>
                </motion.div>
              )
            })}
          </AnimatePresence>
          {!list.length && <Empty icon="🫙" text="Hier ist noch nichts." />}
        </div>
        <div className="card" style={{ padding: 14, boxShadow: 'none' }}>
          <div className="row">
            <span className="emoji-btn">{foodEmoji(name)}</span>
            <input className="input" placeholder="Lebensmittel hinzufügen" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="row mt">
            <input className="input" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: 80 }} aria-label="Menge" />
            <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)} style={{ width: 90 }} aria-label="Einheit">{['Stk', 'g', 'kg', 'L', 'ml', 'Pkg'].map((u) => <option key={u}>{u}</option>)}</select>
            {zone !== 'pantry' && <select className="input" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Haltbar">{[1, 2, 3, 5, 7, 14, 30, 90].map((d) => <option key={d} value={d}>{d} Tage haltbar</option>)}</select>}
          </div>
          <button className="btn mt" style={{ width: '100%' }} disabled={!name.trim()} onClick={() => { s.addFridge({ name: name.trim(), icon: foodEmoji(name), qty, unit, zone, expires: zone === 'pantry' ? undefined : addDays(dayKey(), days) }); setName('') }}><Plus size={16} /> Einräumen</button>
        </div>
        <div>
          <div className="card-title"><h3>🛒 Einkaufsliste</h3>{s.home.shopping.some((x) => x.done) && <button className="btn ghost xs" onClick={s.clearShopping}>Erledigte entfernen</button>}</div>
          <div className="col" style={{ gap: 6 }}>
            {s.home.shopping.map((x) => (
              <button key={x.id} className="list-item" style={{ textAlign: 'left' }} onClick={() => s.toggleShopping(x.id)}>
                <span className={`check-box ${x.done ? 'on' : ''}`}>{x.done && '✓'}</span>
                <span className="grow small" style={{ textDecoration: x.done ? 'line-through' : undefined, opacity: x.done ? 0.5 : 1 }}>{x.name}</span>
              </button>
            ))}
          </div>
          <div className="row mt">
            <input className="input" placeholder="Artikel" value={shop} onChange={(e) => setShop(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && shop.trim()) { s.addShopping(shop.trim()); setShop('') } }} />
            <button className="btn icon" disabled={!shop.trim()} onClick={() => { s.addShopping(shop.trim()); setShop('') }} aria-label="Hinzufügen"><Plus size={18} /></button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

export default function Home() {
  const s = useGame()
  const [selected, setSelected] = useState<string | null>(null)
  const [fridge, setFridge] = useState(false)
  const [nightScene, setNightScene] = useState(s.settings.theme === 'night')
  const apt = useRef<ApartmentHandle>(null)
  const labels = useRef<HTMLDivElement>(null)
  const room = s.home.rooms.find((r) => r.id === selected)
  const fridgeWarn = useMemo(() => s.home.fridge.some((f) => f.expires && daysBetween(dayKey(), f.expires) <= 1), [s.home.fridge])
  const select = (id: string | null) => { setSelected(id); apt.current?.focus(id) }
  const lightsOn = s.home.devices.filter((d) => d.kind === 'light' && d.on).length
  const openNeeds = s.home.rooms.reduce((a, r) => a + r.needs.filter((n) => !n.done).length, 0)

  return (
    <>
      <div className="page-title">
        <div>
          <p>Tippe auf Räume, Lampen, Kühlschrank oder Kleiderschrank</p>
          <h1>Mein <span className="accent">Zuhause</span></h1>
        </div>
      </div>
      <div className="home-layout">
        <div className="canvas-wrap home-canvas">
          <Apartment ref={apt} rooms={s.home.rooms} devices={s.home.devices} selected={selected} onSelect={select} onToggle={s.toggleDevice} onFridge={() => setFridge(true)} onWardrobe={() => s.setTab('style')} fridgeWarn={fridgeWarn} night={nightScene} cleanliness={cleanliness} portal={labels} theme={s.settings.theme} />
          <div ref={labels} className="labels-layer" />
          <div className="fab-row" style={{ top: 12, right: 12 }}>
            <button className="btn ghost icon" onClick={() => setNightScene(!nightScene)} aria-label="Tag/Nacht">{nightScene ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="btn ghost icon" onClick={() => select(null)} aria-label="Ansicht zurücksetzen"><RotateCcw size={18} /></button>
          </div>
          <div className="fab-row" style={{ left: 12, bottom: 12 }}>
            <span className="pill">💡 {lightsOn} an</span>
            <span className="pill">✨ {openNeeds} To-dos</span>
            <button className="pill" onClick={() => setFridge(true)}>🧊 {s.home.fridge.length} im Kühlschrank{fridgeWarn ? ' ⏰' : ''}</button>
          </div>
        </div>
        <div className="home-panel">
          <AnimatePresence mode="wait">
            {room ? (
              <div key={room.id}>
                <button className="btn ghost sm" style={{ marginBottom: 12 }} onClick={() => select(null)}>← Übersicht</button>
                <RoomPanel room={room} />
              </div>
            ) : (
              <motion.div key="overview" className="col" style={{ gap: 14 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="card">
                  <h3>Räume</h3>
                  <div className="col" style={{ gap: 8 }}>
                    {s.home.rooms.map((r) => {
                      const c = cleanliness(r)
                      return (
                        <motion.button key={r.id} whileHover={{ x: 3 }} className="list-item" style={{ textAlign: 'left' }} onClick={() => select(r.id)}>
                          <span style={{ fontSize: 22 }}>{ROOM_ICON[r.kind]}</span>
                          <div className="grow">
                            <b className="small">{r.name}</b>
                            <div style={{ marginTop: 4 }}><ColorBar value={c} max={100} color={c > 66 ? '#3fc796' : c > 33 ? '#ffb84d' : '#ef5a7a'} /></div>
                          </div>
                          <span className="tiny muted" style={{ width: 60, textAlign: 'right' }}>{r.needs.filter((n) => !n.done).length} To-dos</span>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
                <div className="card">
                  <div className="card-title"><h3>🏠 Smart Home</h3><span className="pill">Demo</span></div>
                  <div className="col" style={{ gap: 8 }}>{s.home.devices.map((d) => <DeviceRow key={d.id} d={d} />)}</div>
                  <p className="tiny muted" style={{ margin: '10px 0 0' }}><Power size={11} style={{ verticalAlign: -1 }} /> Steuert aktuell die 3D-Ansicht. Echte Geräte (Home Assistant, Matter, Hue) lassen sich später anbinden.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <FridgeSheet open={fridge} onClose={() => setFridge(false)} />
    </>
  )
}
