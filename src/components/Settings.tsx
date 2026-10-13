import { BookOpen, Compass, Download, MessageCircle, RotateCcw, Smartphone, Upload, Volume2, VolumeX } from 'lucide-react'
import { useRef, useState } from 'react'
import { useGame } from '../store/useGame'
import { Seg, Sheet } from './ui'

export function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useGame()
  const file = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(s.player.name)
  const [confirmReset, setConfirmReset] = useState(false)

  const doExport = () => {
    const blob = new Blob([s.exportData()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `gamifly-save-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const doImport = async (f: File) => {
    const ok = s.importData(await f.text())
    s.notify(ok ? { tone: 'system', icon: 'star', title: 'Spielstand geladen' } : { tone: 'warn', icon: 'warning', title: 'Import fehlgeschlagen', body: 'Die Datei ist kein gültiger Gamifly-Spielstand.' })
    if (ok) onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Einstellungen">
      <div className="col" style={{ gap: 16 }}>
        <label className="field">Player-Name
          <div className="row">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
            <button className="btn sm" onClick={() => useGame.setState((st) => ({ player: { ...st.player, name: name.trim() || st.player.name } }))}>Speichern</button>
          </div>
        </label>
        <div className="col" style={{ gap: 8 }}>
          <span style={{ fontWeight: 600 }}>System-Farbe</span>
          <Seg id="theme" value={s.settings.theme} onChange={(theme) => s.setSettings({ theme })} options={[
            { v: 'system', label: <span className="row" style={{ gap: 6 }}><i className="skin-dot" style={{ background: '#4cc9ff' }} /> System</span> },
            { v: 'monarch', label: <span className="row" style={{ gap: 6 }}><i className="skin-dot" style={{ background: '#a98bff' }} /> Monarch</span> },
            { v: 'crimson', label: <span className="row" style={{ gap: 6 }}><i className="skin-dot" style={{ background: '#ff5470' }} /> Red Gate</span> },
          ]} />
        </div>
        <div className="row between">
          <span style={{ fontWeight: 600 }}>Sounds</span>
          <button className="btn ghost sm" onClick={() => s.setSettings({ sound: !s.settings.sound })}>
            {s.settings.sound ? <><Volume2 size={16} /> An</> : <><VolumeX size={16} /> Aus</>}
          </button>
        </div>
        <div className="row between">
          <span style={{ fontWeight: 600 }}>Vibration</span>
          <button className="btn ghost sm" onClick={() => s.setSettings({ haptics: !s.settings.haptics })}><Smartphone size={16} /> {s.settings.haptics ? 'An' : 'Aus'}</button>
        </div>
        <div className="divider" style={{ margin: 0 }} />
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>System & Guide</div>
          <div className="row wrap">
            <button className="btn ghost sm" onClick={() => { onClose(); s.setUi({ companionOpen: true }) }}><MessageCircle size={16} /> System öffnen</button>
            <button className="btn ghost sm" onClick={() => { onClose(); s.setUi({ tourStep: 0 }) }}><Compass size={16} /> Tour starten</button>
            <button className="btn ghost sm" onClick={() => { onClose(); s.setUi({ handbook: 'start' }) }}><BookOpen size={16} /> Handbuch</button>
          </div>
        </div>
        <div className="divider" style={{ margin: 0 }} />
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Spielstand</div>
          <p className="small muted" style={{ marginTop: 0 }}>Alles bleibt lokal auf diesem Gerät. Exportiere den Spielstand, um ihn auf Handy und Laptop zu übertragen.</p>
          <div className="row wrap">
            <button className="btn ghost sm" onClick={doExport}><Download size={16} /> Exportieren</button>
            <button className="btn ghost sm" onClick={() => file.current?.click()}><Upload size={16} /> Importieren</button>
            <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          </div>
        </div>
        <div>
          {!confirmReset ? (
            <button className="btn danger sm" onClick={() => setConfirmReset(true)}><RotateCcw size={16} /> Neu beginnen</button>
          ) : (
            <div className="list-item" style={{ borderColor: 'var(--danger)' }}>
              <span className="grow small">Wirklich alles löschen? Das kann nicht rückgängig gemacht werden.</span>
              <button className="btn ghost xs" onClick={() => setConfirmReset(false)}>Abbrechen</button>
              <button className="btn danger xs" onClick={() => { s.resetAll(); setConfirmReset(false); onClose() }}>Löschen</button>
            </div>
          )}
        </div>
        <p className="tiny muted center" style={{ margin: 0 }}>Gamifly · v2.0 · Als App installieren: im Browser „Zum Home-Bildschirm“ wählen.</p>
      </div>
    </Sheet>
  )
}
