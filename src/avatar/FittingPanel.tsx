import { AnimatePresence, motion } from 'framer-motion'
import { Maximize2, Minimize2, Pause, Play, Shuffle, SlidersHorizontal } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useGame } from '../store/useGame'
import type { Cloth } from '../game/types'
import { Sheet } from '../components/ui'
import { outfitParts } from './map'
import { BODY_SLIDERS, BROWS, EYE_COLORS, HAIR_COLORS, HAIR_STYLES, POSE_LIST, SKIN_TONES, type AvatarLook } from './look'
import type { Framing } from './FittingRoom'

const FittingRoom = lazy(() => import('./FittingRoom'))

const FRAMINGS: { v: Framing; label: string }[] = [
  { v: 'full', label: 'Körper' }, { v: 'upper', label: 'Oben' }, { v: 'face', label: 'Gesicht' }, { v: 'feet', label: 'Schuhe' },
]

/** Avatar appearance editor — every change shows live on the model behind the sheet. */
export function AvatarEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const look = useGame((s) => s.avatar)
  const setAvatar = useGame((s) => s.setAvatar)
  const sw = (on: boolean) => `swatch-btn ${on ? 'on' : ''}`
  return (
    <Sheet open={open} onClose={onClose} title="Avatar anpassen">
      <div className="col av-editor" style={{ gap: 18 }}>
        <section>
          <h4 className="sys-label">Körper</h4>
          {BODY_SLIDERS.map((b) => (
            <label key={b.k} className="av-slider">
              <span className="row between"><b>{b.label}</b><span className="tiny muted">{b.lo} · {b.hi}</span></span>
              <input type="range" min={b.min} max={b.max} step={0.01} value={look.shape[b.k]}
                onChange={(e) => setAvatar({ shape: { ...look.shape, [b.k]: +e.target.value } })} />
            </label>
          ))}
        </section>
        <section>
          <h4 className="sys-label">Hautton</h4>
          <div className="row wrap" style={{ gap: 10 }}>
            {SKIN_TONES.map((t) => (
              <button key={t.v} className={sw(look.skin === t.v)} onClick={() => setAvatar({ skin: t.v })} aria-label={t.label} title={t.label}>
                <i style={{ background: t.sw }} /><span className="tiny">{t.label}</span>
              </button>
            ))}
          </div>
        </section>
        <section>
          <h4 className="sys-label">Augen</h4>
          <div className="row wrap" style={{ gap: 8 }}>
            {EYE_COLORS.map((t) => (
              <button key={t.v} className={sw(look.eyes === t.v)} onClick={() => setAvatar({ eyes: t.v })} aria-label={t.v}>
                <i style={{ background: `radial-gradient(circle, #050505 22%, ${t.sw} 24%, ${t.sw} 62%, #f2efe9 66%)` }} />
              </button>
            ))}
          </div>
        </section>
        <section>
          <h4 className="sys-label">Frisur</h4>
          <div className="chips">
            {HAIR_STYLES.map((h) => <button key={h.v} className={`chip ${look.hair === h.v ? 'active' : ''}`} onClick={() => setAvatar({ hair: h.v })}>{h.label}</button>)}
          </div>
          <div className="row wrap" style={{ gap: 8, marginTop: 12 }}>
            {HAIR_COLORS.map((c) => (
              <button key={c.v} className={sw(look.hairColor === c.v)} onClick={() => setAvatar({ hairColor: c.v })} aria-label={c.label} title={c.label}>
                <i style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${c.v} 70%, white), ${c.v} 55%, color-mix(in srgb, ${c.v} 70%, black))` }} />
              </button>
            ))}
            <label className="swatch-btn" title="Eigene Farbe">
              <input type="color" value={look.hairColor} onChange={(e) => setAvatar({ hairColor: e.target.value })} aria-label="Eigene Haarfarbe" />
            </label>
          </div>
        </section>
        <section>
          <h4 className="sys-label">Augenbrauen</h4>
          <div className="chips">
            {BROWS.map((b) => <button key={b.v} className={`chip ${look.brows === b.v ? 'active' : ''}`} onClick={() => setAvatar({ brows: b.v })}>{b.label}</button>)}
          </div>
        </section>
        <p className="tiny muted">Körper, Haut, Haare und Kleidung basieren auf freien CC0-Daten von MakeHuman, die Stoffe auf Scans von Poly Haven.</p>
      </div>
    </Sheet>
  )
}

function Stage({ fullscreen, children }: { fullscreen: boolean; children: ReactNode }) {
  useEffect(() => {
    if (!fullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [fullscreen])
  return fullscreen ? createPortal(<div className="fr-fullscreen">{children}</div>, document.body) : <>{children}</>
}

/** The fitting room card on the Style page: model, camera framings, poses, fullscreen and the look editor. */
export default function FittingPanel({ worn, score, onShuffle }: { worn: Cloth[]; score?: { value: number; why: string } | null; onShuffle?: () => void }) {
  const look = useGame((s) => s.avatar) as AvatarLook
  const [framing, setFraming] = useState<Framing>('full')
  const [pose, setPose] = useState('idle')
  const [spin, setSpin] = useState(false)
  const [full, setFull] = useState(false)
  const [edit, setEdit] = useState(false)
  const parts = useMemo(() => outfitParts(worn), [worn])

  useEffect(() => {
    if (!full) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [full])

  const panel = (
    <div className={`fitting-panel ${full ? 'is-full' : ''}`} data-tour="style3d">
      <Suspense fallback={<div className="fr-loading"><div className="fr-sys">SYSTEM</div><div className="fr-msg">Anprobe wird geladen</div></div>}>
        <FittingRoom look={look} parts={parts} pose={pose} framing={framing} spin={spin} onFraming={setFraming} />
      </Suspense>
      <div className="fp-hud">
        <span className="fp-tag">ANPROBE</span>
        <span className="fp-sub mono">{worn.length ? `${worn.length} TEIL${worn.length > 1 ? 'E' : ''} AUSGERÜSTET` : 'BASIS-SET'}</span>
      </div>
      <div className="fp-tools">
        <button className="fp-btn" onClick={() => setEdit(true)} aria-label="Avatar anpassen" title="Avatar anpassen"><SlidersHorizontal size={17} /></button>
        <button className="fp-btn" onClick={() => setSpin(!spin)} aria-label={spin ? 'Drehen stoppen' : 'Drehen'} title="Drehen">{spin ? <Pause size={17} /> : <Play size={17} />}</button>
        {onShuffle && <button className="fp-btn" onClick={onShuffle} aria-label="Zufallsoutfit" title="Zufallsoutfit"><Shuffle size={17} /></button>}
        <button className="fp-btn" onClick={() => setFull(!full)} aria-label={full ? 'Vollbild verlassen' : 'Vollbild'} title="3D erkunden">{full ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
      </div>
      <AnimatePresence>
        {score && (
          <motion.div className="fp-score" key={score.why} initial={{ x: -12, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <span className="tiny mono">STYLE</span>
            <b className="mono">{Math.round(score.value * 100)}</b>
            <span className="tiny">{score.why}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="fp-bottom">
        <div className="fp-seg" role="tablist" aria-label="Kamera">
          {FRAMINGS.map((f) => <button key={f.v} role="tab" aria-selected={framing === f.v} className={framing === f.v ? 'on' : ''} onClick={() => setFraming(f.v)}>{f.label}</button>)}
        </div>
        <div className="fp-poses">
          {POSE_LIST.map((p) => <button key={p.v} className={pose === p.v ? 'on' : ''} onClick={() => setPose(p.v)}>{p.label}</button>)}
        </div>
        <div className="fp-hint tiny">Wischen zum Drehen · Doppeltipp wechselt Ansicht{full ? ' · Pinch zum Zoomen' : ''}</div>
      </div>
    </div>
  )
  return (
    <>
      <Stage fullscreen={full}>{panel}</Stage>
      {full && <div className="fitting-panel placeholder" />}
      <AvatarEditor open={edit} onClose={() => setEdit(false)} />
    </>
  )
}
