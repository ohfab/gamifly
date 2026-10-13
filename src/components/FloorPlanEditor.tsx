import { AnimatePresence, motion } from 'framer-motion'
import { Check, ImagePlus, Minus, MousePointer2, Plus, Ruler, Square, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGame } from '../store/useGame'
import type { FloorPlan, RoomKind, RoomRect } from '../game/types'
import { DEFAULT_RECTS, ROOM_ICON, ROOM_KINDS } from '../data/home'
import { Art } from '../art/Art'
import { uid } from '../lib/util'

interface DraftRoom { id: string; name: string; kind: RoomKind; rect: RoomRect }
type Mode = 'select' | 'draw' | 'calibrate'

const SNAP = 0.1
const snap = (v: number) => Math.round(v / SNAP) * SNAP
const r1 = (v: number) => Math.round(v * 100) / 100

const TEMPLATES: { id: string; label: string; rooms: Omit<DraftRoom, 'id'>[] }[] = [
  { id: 'studio', label: '1 Zimmer', rooms: [
    { name: 'Wohnen & Schlafen', kind: 'living', rect: { x: 0, z: 0, w: 5.2, d: 4.6 } },
    { name: 'Küche', kind: 'kitchen', rect: { x: 5.2, z: 0, w: 3, d: 2.6 } },
    { name: 'Bad', kind: 'bath', rect: { x: 5.2, z: 2.6, w: 3, d: 2 } },
  ] },
  { id: 'two', label: '2 Zimmer', rooms: [
    { name: 'Wohnzimmer', kind: 'living', rect: { x: 0, z: 0, w: 5, d: 4.2 } },
    { name: 'Küche', kind: 'kitchen', rect: { x: 5, z: 0, w: 3.4, d: 3 } },
    { name: 'Schlafzimmer', kind: 'bedroom', rect: { x: 0, z: 4.2, w: 4.2, d: 3.6 } },
    { name: 'Flur', kind: 'hall', rect: { x: 4.2, z: 3, w: 1.6, d: 4.8 } },
    { name: 'Bad', kind: 'bath', rect: { x: 5.8, z: 3, w: 2.6, d: 2.4 } },
  ] },
  { id: 'three', label: '3 Zimmer', rooms: [
    { name: 'Wohnzimmer', kind: 'living', rect: { x: 0, z: 0, w: 5.5, d: 4.4 } },
    { name: 'Küche', kind: 'kitchen', rect: { x: 5.5, z: 0, w: 3.5, d: 3.2 } },
    { name: 'Arbeitszimmer', kind: 'office', rect: { x: 9, z: 0, w: 3, d: 3.2 } },
    { name: 'Schlafzimmer', kind: 'bedroom', rect: { x: 0, z: 4.4, w: 4.4, d: 3.8 } },
    { name: 'Flur', kind: 'hall', rect: { x: 4.4, z: 3.2, w: 1.8, d: 5 } },
    { name: 'Bad', kind: 'bath', rect: { x: 6.2, z: 3.2, w: 3, d: 2.6 } },
  ] },
]

async function loadPlanImage(file: File): Promise<Omit<FloorPlan, 'show3d'>> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
    const k = Math.min(1, 2000 / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * k)
    c.height = Math.round(img.height * k)
    const g = c.getContext('2d')!
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, c.width, c.height)
    g.drawImage(img, 0, 0, c.width, c.height)
    // plans are mostly black lines on white: invert so they glow on the dark map
    const d = g.getImageData(0, 0, c.width, c.height)
    for (let i = 0; i < d.data.length; i += 4) {
      const l = 255 - (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11)
      d.data[i] = l * 0.55; d.data[i + 1] = l * 0.8; d.data[i + 2] = l
    }
    g.putImageData(d, 0, 0)
    return { image: c.toDataURL('image/jpeg', 0.85), imgW: c.width, imgH: c.height, ppm: c.width / 12 }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function FloorPlanEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const home = useGame((s) => s.home)
  const setLayout = useGame((s) => s.setLayout)
  const notify = useGame((s) => s.notify)
  const [rooms, setRooms] = useState<DraftRoom[]>([])
  const [plan, setPlan] = useState<FloorPlan | undefined>(undefined)
  const [sel, setSel] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('select')
  const [zoom, setZoom] = useState(1)
  const [cal, setCal] = useState<{ a: [number, number]; b?: [number, number] } | null>(null)
  const [calLen, setCalLen] = useState('')
  const [busy, setBusy] = useState(false)
  const svg = useRef<SVGSVGElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const fitted = useRef(false)
  const file = useRef<HTMLInputElement>(null)
  const drag = useRef<{ kind: 'move' | 'resize' | 'draw'; id: string; corner?: number; start: [number, number]; orig: RoomRect } | null>(null)

  useEffect(() => {
    if (!open) return
    setRooms(home.rooms.map((r) => ({ id: r.id, name: r.name, kind: r.kind, rect: r.rect ?? DEFAULT_RECTS[r.id] ?? { x: 0, z: 0, w: 3, d: 3 } })))
    setPlan(home.plan)
    setSel(null)
    setMode('select')
    setCal(null)
    fitted.current = false
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // extents of everything that is drawn, in metres
  const view = useMemo(() => {
    let minX = 0, minZ = 0, maxX = 10, maxZ = 8
    if (plan?.image) { maxX = Math.max(maxX, plan.imgW / plan.ppm); maxZ = Math.max(maxZ, plan.imgH / plan.ppm) }
    for (const r of rooms) { minX = Math.min(minX, r.rect.x); minZ = Math.min(minZ, r.rect.z); maxX = Math.max(maxX, r.rect.x + r.rect.w); maxZ = Math.max(maxZ, r.rect.z + r.rect.d) }
    return { x: minX - 1, z: minZ - 1, w: maxX - minX + 2, d: maxZ - minZ + 2 }
  }, [plan, rooms])

  const toM = (e: { clientX: number; clientY: number }): [number, number] => {
    const el = svg.current!
    const pt = el.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const p = pt.matrixTransform(el.getScreenCTM()!.inverse())
    return [p.x, p.y]
  }
  const update = (id: string, rect: Partial<RoomRect>) => setRooms((rs) => rs.map((r) => (r.id === id ? { ...r, rect: { ...r.rect, ...rect } } : r)))
  const selected = rooms.find((r) => r.id === sel)

  const onBgDown = (e: React.PointerEvent) => {
    if (mode === 'calibrate') {
      const p = toM(e)
      setCal((c) => (!c || c.b ? { a: p } : { ...c, b: p }))
      return
    }
    if (mode !== 'draw') { setSel(null); return }
    const [x, z] = toM(e).map(snap) as [number, number]
    const id = uid()
    const n = rooms.length + 1
    setRooms((rs) => [...rs, { id, name: `Raum ${n}`, kind: 'other', rect: { x, z, w: 0, d: 0 } }])
    setSel(id)
    drag.current = { kind: 'draw', id, start: [x, z], orig: { x, z, w: 0, d: 0 } }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onRoomDown = (e: React.PointerEvent, id: string) => {
    if (mode !== 'select') { onBgDown(e); return }
    e.stopPropagation()
    setSel(id)
    const r = rooms.find((x) => x.id === id)!
    drag.current = { kind: 'move', id, start: toM(e), orig: r.rect }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onHandleDown = (e: React.PointerEvent, id: string, corner: number) => {
    e.stopPropagation()
    const r = rooms.find((x) => x.id === id)!
    drag.current = { kind: 'resize', id, corner, start: toM(e), orig: r.rect }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const [mx, mz] = toM(e)
    const o = d.orig
    if (d.kind === 'draw') {
      const x = snap(mx), z = snap(mz)
      update(d.id, { x: Math.min(x, d.start[0]), z: Math.min(z, d.start[1]), w: Math.abs(x - d.start[0]), d: Math.abs(z - d.start[1]) })
    } else if (d.kind === 'move') {
      update(d.id, { x: snap(o.x + mx - d.start[0]), z: snap(o.z + mz - d.start[1]) })
    } else {
      const left = d.corner === 0 || d.corner === 3, top = d.corner === 0 || d.corner === 1
      const x2 = o.x + o.w, z2 = o.z + o.d
      const nx = left ? Math.min(snap(o.x + mx - d.start[0]), x2 - 0.8) : o.x
      const nz = top ? Math.min(snap(o.z + mz - d.start[1]), z2 - 0.8) : o.z
      const nx2 = left ? x2 : Math.max(snap(x2 + mx - d.start[0]), o.x + 0.8)
      const nz2 = top ? z2 : Math.max(snap(z2 + mz - d.start[1]), o.z + 0.8)
      update(d.id, { x: nx, z: nz, w: nx2 - nx, d: nz2 - nz })
    }
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (d?.kind === 'draw') {
      const r = rooms.find((x) => x.id === d.id)
      if (!r || r.rect.w < 0.8 || r.rect.d < 0.8) setRooms((rs) => rs.filter((x) => x.id !== d.id))
      else setMode('select')
    }
  }

  const applyCalibration = () => {
    if (!cal?.b || !plan) return
    const m = parseFloat(calLen.replace(',', '.'))
    if (!(m > 0)) return
    const dist = Math.hypot(cal.b[0] - cal.a[0], cal.b[1] - cal.a[1])
    const k = m / dist // metres per current metre
    const ppm = plan.ppm / k
    setPlan({ ...plan, ppm })
    setRooms((rs) => rs.map((r) => ({ ...r, rect: { x: r1(r.rect.x * k), z: r1(r.rect.z * k), w: r1(r.rect.w * k), d: r1(r.rect.d * k) } })))
    setCal(null)
    setCalLen('')
    setMode('select')
    notify({ tone: 'system', icon: 'blueprint', title: 'Maßstab gesetzt', body: `${m.toLocaleString('de-DE')} m Referenz übernommen` })
  }

  const onFile = async (f?: File) => {
    if (!f) return
    setBusy(true)
    try {
      const p = await loadPlanImage(f)
      setPlan({ ...p, show3d: true })
      setMode('calibrate')
      setCal(null)
      notify({ tone: 'system', icon: 'blueprint', title: 'Bauplan geladen', body: 'Tippe zwei Punkte einer bekannten Wand an und gib ihre Länge ein.' })
    } catch {
      notify({ tone: 'warn', icon: 'blueprint', title: 'Bild konnte nicht gelesen werden' })
    } finally {
      setBusy(false)
    }
  }

  const save = () => {
    if (!rooms.length) { notify({ tone: 'warn', icon: 'blueprint', title: 'Mindestens ein Raum nötig' }); return }
    // move everything so the plan starts near the origin; keeps the 3D view centred
    setLayout(rooms.map((r) => ({ ...r, rect: { x: r1(r.rect.x), z: r1(r.rect.z), w: r1(r.rect.w), d: r1(r.rect.d) } })), plan)
    notify({ tone: 'system', icon: 'house', title: 'Grundriss gespeichert', body: `${rooms.length} Räume im 3D-Modell` })
    onClose()
  }

  const grid = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = []
    for (let x = Math.ceil(view.x * 2) / 2; x <= view.x + view.w; x += 0.5) out.push({ x1: x, y1: view.z, x2: x, y2: view.z + view.d, major: Math.abs(x % 1) < 0.01 })
    for (let z = Math.ceil(view.z * 2) / 2; z <= view.z + view.d; z += 0.5) out.push({ x1: view.x, y1: z, x2: view.x + view.w, y2: z, major: Math.abs(z % 1) < 0.01 })
    return out
  }, [view])

  // fit the whole plan into the available width once per opening
  useEffect(() => {
    if (!open || fitted.current || !box.current || !rooms.length) return
    fitted.current = true
    const w = box.current.clientWidth - 4, h = box.current.clientHeight - 4
    setZoom(Math.max(0.35, Math.min(2.2, Math.min(w / (view.w * 46), h / (view.d * 46)))))
  }, [open, rooms.length, view.w, view.d])

  const pxPerM = 46 * zoom
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fp-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="fpe-head">
            <div className="row" style={{ gap: 10 }}>
              <Art name="blueprint" size={34} />
              <div>
                <div className="fpe-title">BAUPLAN</div>
                <div className="tiny muted mono">{rooms.length} RÄUME · {plan?.image ? `MASSSTAB ${Math.round(plan.ppm)} PX/M` : 'KEIN PLAN GELADEN'}</div>
              </div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn ghost icon" onClick={onClose} aria-label="Abbrechen"><X size={18} /></button>
              <button className="btn sm" onClick={save}><Check size={16} /> Übernehmen</button>
            </div>
          </div>

          <div className="fpe-tools">
            <div className="fp-seg">
              <button className={mode === 'select' ? 'on' : ''} onClick={() => setMode('select')}><MousePointer2 size={13} /> Wählen</button>
              <button className={mode === 'draw' ? 'on' : ''} onClick={() => { setMode('draw'); setSel(null) }}><Square size={13} /> Raum</button>
              <button className={mode === 'calibrate' ? 'on' : ''} disabled={!plan?.image} onClick={() => { setMode('calibrate'); setCal(null) }}><Ruler size={13} /> Maßstab</button>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn ghost icon" onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))} aria-label="Verkleinern"><Minus size={16} /></button>
              <button className="btn ghost icon" onClick={() => setZoom((z) => Math.min(3, z * 1.25))} aria-label="Vergrößern"><Plus size={16} /></button>
              <button className="btn ghost sm" onClick={() => file.current?.click()} disabled={busy}><ImagePlus size={15} /> {plan?.image ? 'Neuer Plan' : 'Plan hochladen'}</button>
              <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
            </div>
          </div>

          <div className="fpe-hint tiny mono">
            {mode === 'draw' && 'ZIEH EIN RECHTECK AUF, UM EINEN RAUM ANZULEGEN'}
            {mode === 'select' && 'RAUM ANTIPPEN ZUM BEARBEITEN · ZIEHEN VERSCHIEBT · ECKEN ÄNDERN DIE GRÖSSE'}
            {mode === 'calibrate' && (cal?.b ? 'GIB DIE ECHTE LÄNGE DER LINIE EIN' : cal ? 'TIPPE DEN ZWEITEN PUNKT AN' : 'TIPPE ANFANG UND ENDE EINER BEKANNTEN WAND AN')}
          </div>

          <div className="fpe-canvas" ref={box}>
            <svg ref={svg} width={view.w * pxPerM} height={view.d * pxPerM} viewBox={`${view.x} ${view.z} ${view.w} ${view.d}`}
              onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              style={{ touchAction: mode === 'select' ? 'pan-x pan-y' : 'none' }}>
              <rect x={view.x} y={view.z} width={view.w} height={view.d} fill="#050913" onPointerDown={onBgDown} />
              {plan?.image && <image href={plan.image} x={0} y={0} width={plan.imgW / plan.ppm} height={plan.imgH / plan.ppm} opacity={0.85} style={{ pointerEvents: 'none' }} />}
              {grid.map(({ major, ...g }, i) => <line key={i} {...g} stroke="var(--sys)" strokeOpacity={major ? 0.18 : 0.07} strokeWidth={major ? 0.02 : 0.012} style={{ pointerEvents: 'none' }} />)}
              {rooms.map((r) => {
                const on = r.id === sel
                return (
                  <g key={r.id}>
                    <rect x={r.rect.x} y={r.rect.z} width={Math.max(0.01, r.rect.w)} height={Math.max(0.01, r.rect.d)}
                      fill="var(--sys)" fillOpacity={on ? 0.22 : 0.1} stroke="var(--sys)" strokeWidth={on ? 0.06 : 0.035}
                      style={{ touchAction: 'none', cursor: mode === 'select' ? 'move' : undefined }} onPointerDown={(e) => onRoomDown(e, r.id)} />
                    {r.rect.w > 1 && r.rect.d > 0.8 && (
                      <g style={{ pointerEvents: 'none' }}>
                        <text x={r.rect.x + r.rect.w / 2} y={r.rect.z + r.rect.d / 2 - 0.08} textAnchor="middle" fontSize={0.32} fill="#e7f0ff" fontWeight={700}>{r.name}</text>
                        <text x={r.rect.x + r.rect.w / 2} y={r.rect.z + r.rect.d / 2 + 0.32} textAnchor="middle" fontSize={0.24} fill="var(--sys)" fontFamily="Chakra Petch, monospace">{r1(r.rect.w).toLocaleString('de-DE')} × {r1(r.rect.d).toLocaleString('de-DE')} m</text>
                      </g>
                    )}
                    {on && mode === 'select' && [[r.rect.x, r.rect.z], [r.rect.x + r.rect.w, r.rect.z], [r.rect.x + r.rect.w, r.rect.z + r.rect.d], [r.rect.x, r.rect.z + r.rect.d]].map(([x, z], i) => (
                      <circle key={i} cx={x} cy={z} r={0.22} fill="#04060c" stroke="var(--sys)" strokeWidth={0.06} style={{ touchAction: 'none', cursor: 'nwse-resize' }} onPointerDown={(e) => onHandleDown(e, r.id, i)} />
                    ))}
                  </g>
                )
              })}
              {cal && (
                <g style={{ pointerEvents: 'none' }}>
                  <circle cx={cal.a[0]} cy={cal.a[1]} r={0.12} fill="#f5c451" />
                  {cal.b && <><line x1={cal.a[0]} y1={cal.a[1]} x2={cal.b[0]} y2={cal.b[1]} stroke="#f5c451" strokeWidth={0.06} strokeDasharray="0.2 0.12" /><circle cx={cal.b[0]} cy={cal.b[1]} r={0.12} fill="#f5c451" /></>}
                </g>
              )}
            </svg>
          </div>

          <div className="fpe-panel">
            {mode === 'calibrate' && cal?.b ? (
              <div className="row">
                <input className="input" inputMode="decimal" autoFocus placeholder="Länge in Metern, z. B. 4,20" value={calLen} onChange={(e) => setCalLen(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyCalibration()} />
                <button className="btn" onClick={applyCalibration}>Setzen</button>
              </div>
            ) : selected ? (
              <div className="col" style={{ gap: 10 }}>
                <div className="row">
                  <Art name={ROOM_ICON[selected.kind]} size={32} />
                  <input className="input" value={selected.name} onChange={(e) => setRooms((rs) => rs.map((r) => (r.id === selected.id ? { ...r, name: e.target.value } : r)))} />
                  <button className="btn danger icon" onClick={() => { setRooms((rs) => rs.filter((r) => r.id !== selected.id)); setSel(null) }} aria-label="Raum löschen"><Trash2 size={16} /></button>
                </div>
                <div className="chips">
                  {ROOM_KINDS.map((k) => <button key={k.v} className={`chip ${selected.kind === k.v ? 'active' : ''}`} onClick={() => setRooms((rs) => rs.map((r) => (r.id === selected.id ? { ...r, kind: k.v } : r)))}><Art name={ROOM_ICON[k.v]} size={16} /> {k.label}</button>)}
                </div>
                <div className="row">
                  <label className="field grow">Breite (m)<input className="input" type="number" step={0.1} min={0.8} value={r1(selected.rect.w)} onChange={(e) => update(selected.id, { w: Math.max(0.8, +e.target.value || 0.8) })} /></label>
                  <label className="field grow">Tiefe (m)<input className="input" type="number" step={0.1} min={0.8} value={r1(selected.rect.d)} onChange={(e) => update(selected.id, { d: Math.max(0.8, +e.target.value || 0.8) })} /></label>
                </div>
              </div>
            ) : (
              <div className="col" style={{ gap: 10 }}>
                <div className="tiny muted mono">VORLAGEN</div>
                <div className="chips">
                  {TEMPLATES.map((t) => <button key={t.id} className="chip" onClick={() => { setRooms(t.rooms.map((r) => ({ ...r, id: uid() }))); setSel(null) }}>{t.label}</button>)}
                  <button className="chip" onClick={() => { setRooms(Object.entries(DEFAULT_RECTS).map(([id, rect]) => ({ id, rect, name: home.rooms.find((r) => r.id === id)?.name ?? id, kind: (home.rooms.find((r) => r.id === id)?.kind ?? 'other') as RoomKind }))); setSel(null) }}>Beispiel</button>
                </div>
                {plan?.image && (
                  <div className="row between">
                    <label className="row small" style={{ gap: 8 }}><input type="checkbox" checked={plan.show3d} onChange={(e) => setPlan({ ...plan, show3d: e.target.checked })} /> Plan im 3D-Modell einblenden</label>
                    <button className="btn ghost xs" onClick={() => setPlan(undefined)}>Plan entfernen</button>
                  </div>
                )}
                <p className="tiny muted" style={{ margin: 0 }}>Tipp: Foto oder Screenshot vom Grundriss hochladen (PDF vorher als Bild speichern). Räume, die sich eine Wand teilen, bekommen automatisch eine Tür.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
