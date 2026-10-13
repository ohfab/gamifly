import { AnimatePresence, motion } from 'framer-motion'
import { Camera, ExternalLink, Heart, ImagePlus, Pause, Play, Plus, Save, Shuffle, Sparkles, Trash2, Wand2, Pencil } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useGame } from '../store/useGame'
import { Mannequin } from '../scene/Mannequin'
import type { Cloth, ClothCat, ClothFit } from '../game/types'
import { colorName, harmony } from '../lib/color'
import { processClothPhoto } from '../lib/image'
import { CAT_ICON, CAT_LABEL, clothIcon, FITS, OCCASIONS, SAMPLE_WARDROBE, SEASONS, SHOPS, VIBES, WEATHERS, gaps, similarQuery, suggest, type Occasion, type Weather } from '../lib/style'
import { dayKey, uid } from '../lib/util'
import { Empty, Seg, Sheet } from '../components/ui'
import { Art } from '../art/Art'

type View = 'closet' | 'ideas' | 'outfits' | 'shop'

function Swatch({ c, size = 44 }: { c: Cloth; size?: number }) {
  return c.photo
    ? <img src={c.photo} alt={c.name} className="swatch" style={{ width: size, height: size }} />
    : <span className="swatch" style={{ width: size, height: size, background: `linear-gradient(160deg, ${c.color}, color-mix(in srgb, ${c.color} 55%, white))` }}><Art name={clothIcon(c)} size={size * 0.7} /></span>
}

function ShopLinks({ q }: { q: string }) {
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {SHOPS.map((s) => (
        <a key={s.name} className="chip" href={s.url(q)} target="_blank" rel="noopener noreferrer">{s.name} <ExternalLink size={11} /></a>
      ))}
    </div>
  )
}

function ClothEditor({ open, onClose, edit }: { open: boolean; onClose: () => void; edit?: Cloth }) {
  const s = useGame()
  const [draft, setDraft] = useState<Omit<Cloth, 'id' | 'wears' | 'addedAt' | 'fav'>>(() => edit ?? { name: '', cat: 'top', fit: 'default', color: '#f4b6cd', tags: [], seasons: [] })
  const [busy, setBusy] = useState(false)
  const cam = useRef<HTMLInputElement>(null)
  const gal = useRef<HTMLInputElement>(null)
  const set = (p: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...p }))
  const onFile = async (f?: File) => {
    if (!f) return
    setBusy(true)
    try {
      const r = await processClothPhoto(f)
      set({ photo: r.photo, fabric: r.fabric, color: r.color, name: draft.name || `${colorName(r.color)} ${CAT_LABEL[draft.cat]}` })
    } finally { setBusy(false) }
  }
  const toggle = (k: 'tags' | 'seasons', v: string) => set({ [k]: draft[k].includes(v) ? draft[k].filter((x) => x !== v) : [...draft[k], v] })
  const save = () => {
    const name = draft.name.trim() || `${colorName(draft.color)} ${CAT_LABEL[draft.cat]}`
    if (edit) s.updateCloth(edit.id, { ...draft, name })
    else s.addCloth({ ...draft, name })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={edit ? 'Teil bearbeiten' : 'Neues Teil einlesen'}>
      <div className="col" style={{ gap: 14 }}>
        <div className="photo-drop" style={{ background: draft.photo ? undefined : `linear-gradient(135deg, ${draft.color}, color-mix(in srgb, ${draft.color} 40%, white))` }}>
          {draft.photo ? <img src={draft.photo} alt="" /> : <Art name={clothIcon(draft)} size={96} />}
          {busy && <div className="photo-busy"><Sparkles /> analysiere…</div>}
          <div className="row" style={{ position: 'absolute', bottom: 10, right: 10 }}>
            <button className="btn sm" onClick={() => cam.current?.click()}><Camera size={16} /> Foto</button>
            <button className="btn ghost sm" onClick={() => gal.current?.click()}><ImagePlus size={16} /> Galerie</button>
          </div>
          <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <input ref={gal} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        <div className="row">
          <input type="color" value={draft.color} onChange={(e) => set({ color: e.target.value })} aria-label="Farbe" />
          <div className="grow">
            <input className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder={`${colorName(draft.color)} ${CAT_LABEL[draft.cat]}`} />
          </div>
        </div>
        <p className="tiny muted" style={{ margin: '-6px 0 0' }}>Farbe erkannt: <b>{colorName(draft.color)}</b> · Tipp: Foto auf hellem Hintergrund, Teil mittig.</p>
        <div className="field">Kategorie
          <div className="chips">
            {(Object.keys(CAT_LABEL) as ClothCat[]).map((c) => (
              <button key={c} className={`chip ${draft.cat === c ? 'active' : ''}`} onClick={() => set({ cat: c, fit: FITS[c]?.[0].v ?? 'default' })}><Art name={CAT_ICON[c]} size={18} /> {CAT_LABEL[c]}</button>
            ))}
          </div>
        </div>
        {FITS[draft.cat] && (
          <div className="field">Form
            <div className="chips">{FITS[draft.cat]!.map((f) => <button key={f.v} className={`chip ${draft.fit === f.v ? 'active' : ''}`} onClick={() => set({ fit: f.v as ClothFit })}>{f.label}</button>)}</div>
          </div>
        )}
        <div className="field">Vibe
          <div className="row wrap" style={{ gap: 6 }}>{VIBES.map((v) => <button key={v} className={`chip ${draft.tags.includes(v) ? 'active' : ''}`} onClick={() => toggle('tags', v)}>{v}</button>)}</div>
        </div>
        <div className="field">Saison
          <div className="row wrap" style={{ gap: 6 }}>{SEASONS.map((v) => <button key={v} className={`chip ${draft.seasons.includes(v) ? 'active' : ''}`} onClick={() => toggle('seasons', v)}>{v}</button>)}</div>
        </div>
        {edit && (
          <div className="field">Ähnliches shoppen<ShopLinks q={similarQuery(edit)} /></div>
        )}
        <div className="row">
          {edit && <button className="btn danger" onClick={() => { s.removeCloth(edit.id); onClose() }}><Trash2 size={16} /></button>}
          <button className="btn grow" onClick={save}>{edit ? 'Speichern' : 'In den Kleiderschrank'}</button>
        </div>
      </div>
    </Sheet>
  )
}

export default function Style() {
  const s = useGame()
  const w = s.wardrobe
  const [view, setView] = useState<View>('closet')
  const [wearing, setWearing] = useState<string[]>(() => s.wornLog[dayKey()] ?? [])
  const [filter, setFilter] = useState<ClothCat | 'all'>('all')
  const [editor, setEditor] = useState<{ open: boolean; edit?: Cloth; key: number }>({ open: false, key: 0 })
  const [texture, setTexture] = useState(true)
  const [spin, setSpin] = useState(true)
  const [occasion, setOccasion] = useState<Occasion>('alltag')
  const [weather, setWeather] = useState<Weather>('mild')
  const [seed, setSeed] = useState(1)
  const [outfitName, setOutfitName] = useState('')
  const [wxLoading, setWxLoading] = useState(false)

  const worn = wearing.map((id) => w.find((c) => c.id === id)).filter(Boolean) as Cloth[]
  const h = worn.length ? harmony(worn.map((c) => c.color)) : null
  const ideas = useMemo(() => suggest(w, occasion, weather, seed), [w, occasion, weather, seed])
  const missing = useMemo(() => gaps(w), [w])
  const auraOn = s.equipped.aura != null

  const toggleWear = (c: Cloth) => {
    setWearing((cur) => {
      if (cur.includes(c.id)) return cur.filter((x) => x !== c.id)
      const items = cur.map((id) => w.find((x) => x.id === id)!).filter(Boolean)
      const keep = items.filter((x) => {
        if (x.cat === c.cat && c.cat !== 'accessory') return false
        if (c.cat === 'dress' && (x.cat === 'top' || x.cat === 'bottom')) return false
        if ((c.cat === 'top' || c.cat === 'bottom') && x.cat === 'dress') return false
        return true
      })
      return [...keep.map((x) => x.id), c.id]
    })
  }
  const loadSamples = () => {
    useGame.setState((st) => ({ wardrobe: [...st.wardrobe, ...SAMPLE_WARDROBE.map((c) => ({ ...c, id: uid(), addedAt: Date.now() }))] }))
    s.notify({ tone: 'system', icon: 'dress', title: 'Beispiel-Kleiderschrank geladen', body: 'Ersetze die Teile nach und nach durch deine eigenen.' })
    useGame.getState().evaluate()
  }
  const loadWeather = () => {
    if (!navigator.geolocation) return
    setWxLoading(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude.toFixed(2)}&longitude=${pos.coords.longitude.toFixed(2)}&current=temperature_2m,precipitation,weather_code`)
        const j = await r.json()
        const t = j.current.temperature_2m as number
        const rain = (j.current.precipitation as number) > 0.1 || [61, 63, 65, 80, 81, 82, 95].includes(j.current.weather_code)
        setWeather(rain ? 'regen' : t >= 22 ? 'warm' : t >= 12 ? 'mild' : 'kalt')
        s.notify({ tone: 'good', icon: 'cloud_sun', title: `Aktuell ${Math.round(t)}°C`, body: rain ? 'Regen – Jacke einplanen!' : 'Vorschläge angepasst.' })
      } catch {
        s.notify({ tone: 'warn', icon: 'rain', title: 'Wetter nicht verfügbar' })
      } finally { setWxLoading(false) }
    }, () => setWxLoading(false))
  }

  const closet = w.filter((c) => filter === 'all' || c.cat === filter)
  const wornToday = !!s.wornLog[dayKey()]

  return (
    <>
      <div className="page-title">
        <div>
          <p>{w.length} Teile im Kleiderschrank</p>
          <h1>Style <span className="accent">Studio</span></h1>
        </div>
        <button className="btn" onClick={() => setEditor({ open: true, key: Date.now() })}><Plus size={16} /> Teil</button>
      </div>

      <div className="style-layout">
        <div className="col" style={{ gap: 12 }}>
          <div className="canvas-wrap style-canvas" data-tour="style3d">
            <Mannequin items={worn} texture={texture} spin={spin} aura={auraOn} theme={s.settings.theme} />
            <div className="fab-row" style={{ top: 12, right: 12, flexDirection: 'column' }}>
              <button className="btn ghost icon" onClick={() => setSpin(!spin)} aria-label="Drehen">{spin ? <Pause size={16} /> : <Play size={16} />}</button>
              <button className="btn ghost icon" onClick={() => setTexture(!texture)} aria-label="Foto-Textur" title="Foto-Textur an/aus" style={{ opacity: texture ? 1 : 0.5 }}><ImagePlus size={16} /></button>
              <button className="btn ghost icon" onClick={() => { const i = ideas[Math.floor(Math.random() * ideas.length)]; if (i) setWearing(i.items.map((x) => x.id)) }} aria-label="Zufallsoutfit"><Shuffle size={16} /></button>
            </div>
            {h && (
              <motion.div className="style-score" key={h.why} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <b className="mono">{Math.round(h.score * 100)}</b>
                <span className="tiny">{h.why}</span>
              </motion.div>
            )}
            {!worn.length && <div className="style-hint small muted">Tippe Teile im Kleiderschrank an, um sie anzuprobieren.</div>}
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div className="row wrap" style={{ gap: 6, minHeight: 34 }}>
              <AnimatePresence>
                {worn.map((c) => (
                  <motion.button key={c.id} layout initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="chip" onClick={() => toggleWear(c)}>
                    <span className="dot-c" style={{ background: c.color }} />{c.name} ×
                  </motion.button>
                ))}
              </AnimatePresence>
              {!worn.length && <span className="small muted">Noch nichts an.</span>}
            </div>
            <div className="row mt">
              <input className="input" placeholder="Outfit-Name" value={outfitName} onChange={(e) => setOutfitName(e.target.value)} />
              <button className="btn ghost icon" disabled={!worn.length} onClick={() => { s.saveOutfit(outfitName.trim() || `Look #${s.outfits.length + 1}`, wearing); setOutfitName('') }} aria-label="Outfit speichern"><Save size={16} /></button>
            </div>
            <button className="btn mt" style={{ width: '100%' }} disabled={!worn.length} onClick={() => s.wearOutfit(wearing)}>
              <Art name="lipstick" size={20} /> {wornToday ? 'Outfit des Tages aktualisieren' : 'Heute tragen (+25 XP)'}
            </button>
          </div>
        </div>

        <div>
          <div className="scroll-x" style={{ marginBottom: 14 }}>
            <Seg id="style" value={view} onChange={setView} options={[{ v: 'closet', label: <span className="row" style={{ gap: 6 }}><Art name="dress" size={18} /> Schrank</span> }, { v: 'ideas', label: <span className="row" style={{ gap: 6 }}><Art name="sparkle" size={18} /> Vorschläge</span> }, { v: 'outfits', label: <span className="row" style={{ gap: 6 }}><Art name="mirror" size={18} /> Outfits</span> }, { v: 'shop', label: <span className="row" style={{ gap: 6 }}><Art name="shop_bag" size={18} /> Shopping</span> }]} />
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {view === 'closet' && (
                <div className="card">
                  <div className="chips" style={{ marginBottom: 12 }}>
                    <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Alle</button>
                    {(Object.keys(CAT_LABEL) as ClothCat[]).map((c) => <button key={c} className={`chip ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}><Art name={CAT_ICON[c]} size={18} /> {CAT_LABEL[c]}</button>)}
                  </div>
                  {w.length === 0 ? (
                    <Empty icon="dress" text="Dein Kleiderschrank ist noch leer. Fotografiere deine Kleidung – Farbe & Stoff werden automatisch erkannt.">
                      <div className="row" style={{ justifyContent: 'center' }}>
                        <button className="btn" onClick={() => setEditor({ open: true, key: Date.now() })}><Camera size={16} /> Erstes Teil</button>
                        <button className="btn ghost" onClick={loadSamples}>Beispiele laden</button>
                      </div>
                    </Empty>
                  ) : (
                    <div className="closet-grid">
                      <motion.button whileTap={{ scale: 0.95 }} className="cloth add" onClick={() => setEditor({ open: true, key: Date.now() })}><Plus /> <span className="small">Neu</span></motion.button>
                      {closet.map((c, i) => (
                        <motion.div key={c.id} className={`cloth ${wearing.includes(c.id) ? 'on' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.02 } }} whileTap={{ scale: 0.96 }} onClick={() => toggleWear(c)}>
                          <div className="cloth-img" style={{ background: c.photo ? undefined : `linear-gradient(160deg, ${c.color}, color-mix(in srgb, ${c.color} 55%, white))` }}>
                            {c.photo ? <img src={c.photo} alt={c.name} /> : <Art name={clothIcon(c)} size={64} />}
                            <button className={`fav ${c.fav ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); s.updateCloth(c.id, { fav: !c.fav }) }} aria-label="Favorit"><Heart size={14} fill={c.fav ? 'currentColor' : 'none'} /></button>
                            {wearing.includes(c.id) && <span className="wearing">an</span>}
                          </div>
                          <div className="row between" style={{ padding: '8px 4px 2px' }}>
                            <div className="grow" style={{ minWidth: 0 }}>
                              <div className="small" style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                              <div className="tiny muted">{c.wears}× getragen</div>
                            </div>
                            <button className="btn ghost xs" onClick={(e) => { e.stopPropagation(); setEditor({ open: true, edit: c, key: Date.now() }) }} aria-label="Bearbeiten"><Pencil size={13} /></button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {view === 'ideas' && (
                <div className="col" style={{ gap: 14 }}>
                  <div className="card">
                    <div className="field" style={{ marginBottom: 10 }}>Anlass<div className="chips">{OCCASIONS.map((o) => <button key={o.v} className={`chip ${occasion === o.v ? 'active' : ''}`} onClick={() => setOccasion(o.v)}><Art name={o.art} size={18} /> {o.label}</button>)}</div></div>
                    <div className="field">Wetter
                      <div className="chips">
                        {WEATHERS.map((o) => <button key={o.v} className={`chip ${weather === o.v ? 'active' : ''}`} onClick={() => setWeather(o.v)}><Art name={o.art} size={18} /> {o.label}</button>)}
                        <button className="chip" onClick={loadWeather} disabled={wxLoading}><Art name="pin" size={16} /> {wxLoading ? 'lädt…' : 'Live-Wetter'}</button>
                      </div>
                    </div>
                  </div>
                  {ideas.length === 0 ? (
                    <div className="card"><Empty icon="sparkle" text="Für Vorschläge brauchst du mindestens ein Kleid oder ein Oberteil + Unterteil.">{w.length === 0 && <button className="btn ghost" onClick={loadSamples}>Beispiel-Kleiderschrank laden</button>}</Empty></div>
                  ) : ideas.map((sug, i) => (
                    <motion.div key={sug.items.map((x) => x.id).join()} className="card idea" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.07 } }}>
                      <div className="row between">
                        <div className="row" style={{ gap: 6 }}>{sug.items.map((c) => <Swatch key={c.id} c={c} />)}</div>
                        <div className="score-ring" style={{ ['--s' as string]: sug.score }}><span className="mono">{Math.round(sug.score * 100)}</span></div>
                      </div>
                      <div className="small" style={{ marginTop: 10, fontWeight: 600 }}>{sug.items.map((c) => c.name).join(' · ')}</div>
                      <ul className="reasons">{sug.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                      <div className="row">
                        <button className="btn sm" onClick={() => setWearing(sug.items.map((x) => x.id))}><Wand2 size={14} /> Anprobieren</button>
                        <button className="btn ghost sm" onClick={() => s.saveOutfit(`${OCCASIONS.find((o) => o.v === occasion)!.label}-Look`, sug.items.map((x) => x.id))}><Save size={14} /> Speichern</button>
                      </div>
                    </motion.div>
                  ))}
                  {ideas.length > 0 && <button className="btn ghost" onClick={() => setSeed(seed + 1)}><Shuffle size={16} /> Neue Vorschläge</button>}
                </div>
              )}

              {view === 'outfits' && (
                <div className="col" style={{ gap: 12 }}>
                  {s.outfits.length === 0 && <div className="card"><Empty icon="mirror" text="Noch keine Outfits gespeichert. Stelle eins am Modell zusammen und speichere es." /></div>}
                  {s.outfits.map((o) => {
                    const items = o.items.map((id) => w.find((c) => c.id === id)).filter(Boolean) as Cloth[]
                    return (
                      <motion.div layout key={o.id} className="card" style={{ padding: 14 }}>
                        <div className="row between">
                          <b>{o.name}</b>
                          <button className="btn ghost icon" style={{ width: 30, height: 30 }} onClick={() => s.removeOutfit(o.id)} aria-label="Löschen"><Trash2 size={14} /></button>
                        </div>
                        <div className="row mt" style={{ gap: 6 }}>{items.map((c) => <Swatch key={c.id} c={c} size={40} />)}</div>
                        <div className="row mt">
                          <button className="btn sm" onClick={() => setWearing(o.items)}><Wand2 size={14} /> Anprobieren</button>
                          <button className="btn ghost sm" onClick={() => { setWearing(o.items); s.wearOutfit(o.items) }}><Art name="lipstick" size={16} /> Heute tragen</button>
                        </div>
                      </motion.div>
                    )
                  })}
                  {Object.keys(s.wornLog).length > 0 && (
                    <div className="card">
                      <h3>Getragen</h3>
                      <div className="col" style={{ gap: 8 }}>
                        {Object.entries(s.wornLog).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7).map(([d, ids]) => (
                          <div key={d} className="row small">
                            <span className="muted mono" style={{ width: 70 }}>{new Date(d + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                            <div className="row" style={{ gap: 4 }}>{ids.map((id) => w.find((c) => c.id === id)).filter(Boolean).map((c) => <Swatch key={c!.id} c={c!} size={26} />)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {view === 'shop' && (
                <div className="col" style={{ gap: 12 }}>
                  <div className="card">
                    <h3 className="row" style={{ gap: 8 }}><Art name="puzzle" size={24} /> Dir fehlt noch</h3>
                    <p className="small muted" style={{ marginTop: -4 }}>Analyse deiner Capsule Wardrobe – diese Teile würden die meisten neuen Kombis freischalten.</p>
                    <div className="col" style={{ gap: 12 }}>
                      {missing.length === 0 && <p className="small">Dein Schrank ist richtig gut aufgestellt.</p>}
                      {missing.map((g) => (
                        <div key={g.name} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                          <div className="row"><Art name={g.icon} size={36} /><div className="grow"><b className="small">{g.name}</b><div className="tiny muted">{g.why}</div></div></div>
                          <ShopLinks q={g.query} />
                        </div>
                      ))}
                    </div>
                  </div>
                  {worn.length > 0 && (
                    <div className="card">
                      <h3 className="row" style={{ gap: 8 }}><Art name="search" size={24} /> Ähnliche Teile zum aktuellen Look</h3>
                      <div className="col" style={{ gap: 12 }}>
                        {worn.map((c) => (
                          <div key={c.id} className="col" style={{ gap: 6 }}>
                            <div className="row"><Swatch c={c} size={32} /><b className="small">{similarQuery(c)}</b></div>
                            <ShopLinks q={similarQuery(c)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="tiny muted center">Links öffnen die Suche im jeweiligen Shop. Keine Affiliate-Links.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <ClothEditor key={editor.key} open={editor.open} edit={editor.edit} onClose={() => setEditor((e) => ({ ...e, open: false }))} />
    </>
  )
}
