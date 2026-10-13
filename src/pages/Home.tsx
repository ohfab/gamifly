import { AnimatePresence, motion } from 'framer-motion'
import { Lightbulb, Maximize2, Minimize2, Moon, PencilRuler, Plus, Power, RotateCcw, ShoppingCart, Sun, Thermometer, Trash2, Check } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import FloorPlanEditor from '../components/FloorPlanEditor'
import { useGame } from '../store/useGame'
import { Apartment, type ApartmentHandle } from '../scene/Apartment'
import { ROOM_ICON } from '../data/home'
import { Art, foodArt, thingArt } from '../art/Art'
import { matchRecipes } from '../data/recipes'
import type { Device, FridgeZone, Room } from '../game/types'
import { addDays, dayKey, daysBetween } from '../lib/util'
import { ColorBar, Empty, Seg, Sheet } from '../components/ui'

const cleanliness = (r: Room) => Math.max(0, Math.round(100 - ((Date.now() - r.lastCleaned) / 86400000) * 14))
const DEVICE_ICON: Record<Device['kind'], string> = { light: 'bulb', thermostat: 'thermo', plug: 'plug', vacuum: 'robot', speaker: 'speaker', blinds: 'blinds' }

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
        <span className="dev-icon"><Art name={DEVICE_ICON[d.kind]} size={28} /></span>
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
          <div className="row"><Art name={ROOM_ICON[room.kind]} size={44} />
            <input className="room-name" value={room.name} onChange={(e) => s.renameRoom(room.id, e.target.value)} aria-label="Raumname" />
          </div>
        </div>
        <div className="row mt">
          <span className="small" style={{ width: 92 }}>Sauberkeit</span>
          <div className="grow"><ColorBar value={clean} max={100} color={clean > 66 ? '#3fc796' : clean > 33 ? '#ffb84d' : '#ef5a7a'} /></div>
          <b className="mono small">{clean}%</b>
        </div>
        <button className="btn mt" style={{ width: '100%' }} onClick={() => s.cleanRoom(room.id)}>
          <Art name="broom" size={20} /> {cleanedToday ? 'Heute schon aufgeräumt' : 'Aufgeräumt! (+20 XP)'}
        </button>
      </div>

      <div className="card">
        <div className="card-title"><h3 className="row" style={{ gap: 8 }}><Art name="pin" size={24} /> Was ist wo?</h3><span className="tiny muted">{room.items.length} Dinge</span></div>
        <div className="col" style={{ gap: 8 }}>
          <AnimatePresence initial={false}>
            {room.items.map((i) => (
              <motion.div key={i.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="list-item">
                <Art name={i.icon} size={32} />
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
            <button className="btn icon" disabled={!item.trim()} onClick={() => { s.addRoomItem(room.id, { name: item.trim(), where: where.trim(), icon: thingArt(item) }); setItem(''); setWhere('') }} aria-label="Hinzufügen"><Plus size={18} /></button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title"><h3 className="row" style={{ gap: 8 }}><Art name="sparkle" size={24} /> Was es braucht</h3></div>
        <div className="col" style={{ gap: 8 }}>
          {room.needs.map((n) => (
            <div key={n.id} className="list-item">
              <button className={`check-box ${n.done ? 'on' : ''}`} onClick={() => s.toggleNeed(room.id, n.id)} aria-label="Erledigt">{n.done && <Check size={14} strokeWidth={3.5} />}</button>
              <span className="grow small" style={{ textDecoration: n.done ? 'line-through' : undefined, opacity: n.done ? 0.5 : 1 }}>{n.text}</span>
              {!n.done && <button className="btn ghost icon" style={{ width: 30, height: 30 }} title="Auf Einkaufsliste" onClick={() => s.needToShopping(room.id, n)}><ShoppingCart size={14} /></button>}
              <button className="btn ghost icon" style={{ width: 30, height: 30 }} onClick={() => s.removeNeed(room.id, n.id)} aria-label="Löschen"><Trash2 size={14} /></button>
            </div>
          ))}
          {!room.needs.length && <p className="small muted" style={{ margin: 0 }}>Alles da – dieser Raum ist happy.</p>}
        </div>
        <div className="row mt">
          <input className="input" placeholder="z. B. Glühbirne E27, Pflanze gießen…" value={need} onChange={(e) => setNeed(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && need.trim()) { s.addNeed(room.id, need.trim()); setNeed('') } }} />
          <button className="btn icon" disabled={!need.trim()} onClick={() => { s.addNeed(room.id, need.trim()); setNeed('') }} aria-label="Hinzufügen"><Plus size={18} /></button>
        </div>
      </div>

      {devices.length > 0 && (
        <div className="card">
          <h3 className="row" style={{ gap: 8 }}><Art name="house" size={24} /> Smart Home</h3>
          <div className="col" style={{ gap: 8 }}>{devices.map((d) => <DeviceRow key={d.id} d={d} />)}</div>
        </div>
      )}
    </motion.div>
  )
}

function Recipes() {
  const fridge = useGame((s) => s.home.fridge)
  const cookedToday = useGame((s) => s.cooked[dayKey()])
  const cooked = cookedToday ?? []
  const cook = useGame((s) => s.cookRecipe)
  const addShopping = useGame((s) => s.addShopping)
  const notify = useGame((s) => s.notify)
  const ideas = useMemo(() => matchRecipes(fridge.map((f) => f.name)).filter((m) => m.have > 0).slice(0, 3), [fridge])
  return (
    <div className="card" style={{ padding: 14, boxShadow: 'none' }}>
      <div className="card-title"><h3 className="row" style={{ gap: 8 }}><Art name="pan" size={24} /> Was kann ich kochen?</h3><span className="tiny muted">aus deinem Vorrat</span></div>
      {!ideas.length && <p className="small muted" style={{ margin: 0 }}>Füge Lebensmittel hinzu, dann schlage ich dir Rezepte vor.</p>}
      <div className="col" style={{ gap: 8 }}>
        {ideas.map(({ r, missing }) => (
          <div key={r.id} className="list-item" style={{ alignItems: 'flex-start' }}>
            <Art name={r.art} size={40} />
            <div className="grow">
              <b className="small">{r.name}</b> <span className="tiny muted">· {r.minutes} Min.</span>
              <div className="tiny muted">{r.tip}</div>
              {missing.length > 0 && <div className="tiny" style={{ color: 'var(--danger)', marginTop: 2 }}>Fehlt: {missing.join(', ')}</div>}
              <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
                <button className="btn xs" disabled={cooked.includes(r.id)} onClick={() => cook(r.id)}>{cooked.includes(r.id) ? 'Heute gekocht' : 'Gekocht! (+30 XP)'}</button>
                {missing.length > 0 && <button className="btn ghost xs" onClick={() => { missing.forEach(addShopping); notify({ tone: 'good', icon: 'cart', title: 'Auf die Einkaufsliste', body: missing.join(', ') }) }}><ShoppingCart size={12} /> Fehlendes</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
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
    <Sheet open={open} onClose={onClose} title="Kühlschrank">
      <div className="col" style={{ gap: 14 }}>
        {soon.length > 0 && (
          <div className="list-item" style={{ borderColor: '#ffb84d', background: 'color-mix(in srgb, #ffb84d 10%, transparent)' }}>
            <Art name="clock" size={28} />
            <span className="small grow">Zuerst verbrauchen: <b>{soon.map((f) => f.name).join(', ')}</b></span>
          </div>
        )}
        <Seg id="zone" value={zone} onChange={setZone} options={[{ v: 'fridge', label: <span className="row" style={{ gap: 6 }}><Art name="fridge" size={18} /> Kühlschrank</span> }, { v: 'freezer', label: <span className="row" style={{ gap: 6 }}><Art name="snow" size={18} /> Gefrier</span> }, { v: 'pantry', label: <span className="row" style={{ gap: 6 }}><Art name="jar" size={18} /> Vorrat</span> }]} />
        <div className="col" style={{ gap: 8 }}>
          <AnimatePresence initial={false}>
            {list.map((f) => {
              const e = expiryInfo(f.expires)
              return (
                <motion.div key={f.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: 40 }} className="list-item">
                  <Art name={foodArt(f.name)} size={34} />
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
          {!list.length && <Empty icon="jar" text="Hier ist noch nichts." />}
        </div>
        <div className="card" style={{ padding: 14, boxShadow: 'none' }}>
          <div className="row">
            <span className="emoji-btn"><Art name={foodArt(name)} size={32} /></span>
            <input className="input" placeholder="Lebensmittel hinzufügen" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="row mt">
            <input className="input" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: 80 }} aria-label="Menge" />
            <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)} style={{ width: 90 }} aria-label="Einheit">{['Stk', 'g', 'kg', 'L', 'ml', 'Pkg'].map((u) => <option key={u}>{u}</option>)}</select>
            {zone !== 'pantry' && <select className="input" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Haltbar">{[1, 2, 3, 5, 7, 14, 30, 90].map((d) => <option key={d} value={d}>{d} Tage haltbar</option>)}</select>}
          </div>
          <button className="btn mt" style={{ width: '100%' }} disabled={!name.trim()} onClick={() => { s.addFridge({ name: name.trim(), icon: foodArt(name), qty, unit, zone, expires: zone === 'pantry' ? undefined : addDays(dayKey(), days) }); setName('') }}><Plus size={16} /> Einräumen</button>
        </div>
        <div>
          <Recipes />
          <div className="card-title mt"><h3 className="row" style={{ gap: 8 }}><Art name="cart" size={24} /> Einkaufsliste</h3>{s.home.shopping.some((x) => x.done) && <button className="btn ghost xs" onClick={s.clearShopping}>Erledigte entfernen</button>}</div>
          <div className="col" style={{ gap: 6 }}>
            {s.home.shopping.map((x) => (
              <button key={x.id} className="list-item" style={{ textAlign: 'left' }} onClick={() => s.toggleShopping(x.id)}>
                <span className={`check-box ${x.done ? 'on' : ''}`}>{x.done && <Check size={14} strokeWidth={3.5} />}</span>
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

const ACCENT = { system: '#4cc9ff', monarch: '#a98bff', crimson: '#ff5470' } as const

/** Renders inline, or into a fullscreen layer on top of everything ("3D erkunden"). */
function Stage({ full, children }: { full: boolean; children: ReactNode }) {
  useEffect(() => {
    if (!full) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [full])
  return full ? createPortal(<div className="home-fullscreen">{children}</div>, document.body) : <>{children}</>
}

export default function Home() {
  const s = useGame()
  const [selected, setSelected] = useState<string | null>(null)
  const fridge = useGame((st) => st.fridgeOpen)
  const setFridge = (v: boolean) => useGame.getState().setUi({ fridgeOpen: v })
  const [nightScene, setNightScene] = useState(false)
  const [full, setFull] = useState(false)
  const [editor, setEditor] = useState(false)
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
        <Stage full={full}>
          <div className={`canvas-wrap home-canvas ${full ? 'is-full' : ''}`} data-tour="home3d">
            <Apartment ref={apt} rooms={s.home.rooms} devices={s.home.devices} plan={s.home.plan} selected={selected} onSelect={select} onToggle={s.toggleDevice}
              onFridge={() => setFridge(true)} onWardrobe={() => s.setTab('style')} fridgeWarn={fridgeWarn} night={nightScene} cleanliness={cleanliness} portal={labels}
              accent={ACCENT[s.settings.theme] ?? ACCENT.system} immersive={full} />
            <div ref={labels} className="labels-layer" />
            <div className="fab-row" style={{ top: 12, right: 12, flexDirection: 'column' }}>
              <button className="btn ghost icon" onClick={() => setFull(!full)} aria-label={full ? 'Vollbild verlassen' : '3D erkunden'} title="3D erkunden">{full ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
              <button className="btn ghost icon" onClick={() => setEditor(true)} aria-label="Grundriss bearbeiten" title="Grundriss / Bauplan"><PencilRuler size={18} /></button>
              <button className="btn ghost icon" onClick={() => setNightScene(!nightScene)} aria-label="Tag/Nacht">{nightScene ? <Sun size={18} /> : <Moon size={18} />}</button>
              <button className="btn ghost icon" onClick={() => select(null)} aria-label="Ansicht zurücksetzen"><RotateCcw size={18} /></button>
            </div>
            <div className="fab-row" style={{ left: 12, bottom: 12, flexWrap: 'wrap', right: 64 }}>
              <span className="pill"><Art name="bulb" size={14} /> {lightsOn} an</span>
              <span className="pill"><Art name="sparkle" size={14} /> {openNeeds} To-dos</span>
              <button className="pill" onClick={() => setFridge(true)} data-tour="fridge"><Art name="fridge" size={14} /> {s.home.fridge.length} im Kühlschrank{fridgeWarn ? ' · bald ablaufend' : ''}</button>
            </div>
            <div className="home-hint tiny mono">{full ? 'ZIEHEN DREHT · PINCH / MAUSRAD ZOOMT · ZWEI FINGER VERSCHIEBEN' : 'SEITLICH WISCHEN DREHT · ⤢ FÜR VOLLE STEUERUNG'}</div>
          </div>
        </Stage>
        {full && <div className="canvas-wrap home-canvas" />}
        <FloorPlanEditor open={editor} onClose={() => setEditor(false)} />
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
                          <Art name={ROOM_ICON[r.kind]} size={36} />
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
                  <div className="card-title"><h3 className="row" style={{ gap: 8 }}><Art name="house" size={24} /> Smart Home</h3><span className="pill">Demo</span></div>
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
