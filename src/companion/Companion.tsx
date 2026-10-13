import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Mic, MicOff, Send, Settings2, Square, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store/useGame'
import { Art } from '../art/Art'
import { Lumi, type LumiMood } from './Lumi'
import { think, type Reply } from './brain'
import { runCmd } from './commands'
import { briefing, nextStep } from './context'
import { tipFor } from './tips'
import { canListen, canSpeak, germanVoices, listen, speak, stopSpeaking, useVoice } from './voice'
import { askClaude, CLAUDE_MODEL, resetClaude } from './claude'
import { sfx } from '../lib/sfx'
import { dayKey } from '../lib/util'

const QUICK = [
  { label: 'Tagesbriefing', art: 'sunrise', cmd: 'say:briefing' },
  { label: 'Was als Nächstes?', art: 'stairs', cmd: 'say:next' },
  { label: 'Guide-Tour', art: 'pin', cmd: 'tour' },
  { label: 'Handbuch', art: 'book', cmd: 'guide:start' },
  { label: 'Was koche ich?', art: 'pan', cmd: 'ask:Was soll ich kochen?' },
  { label: 'Outfit-Idee', art: 'dress', cmd: 'ask:Was soll ich heute anziehen?' },
  { label: 'Fokus-Gate', art: 'gate', cmd: 'ask:Starte ein Fokus-Gate' },
  { label: 'Aufräumen', art: 'broom', cmd: 'ask:Was soll ich putzen?' },
]

function useSpeakNow() {
  const c = useGame((s) => s.companion)
  return (text: string) => { if (c.voice && canSpeak) speak(text, { voiceURI: c.voiceURI, rate: c.rate, pitch: c.pitch }) }
}

export function LumiFab() {
  const tab = useGame((s) => s.tab)
  const open = useGame((s) => s.companionOpen)
  const setUi = useGame((s) => s.setUi)
  const tips = useGame((s) => s.companion.tips)
  const tourDone = useGame((s) => s.tourDone)
  const tourStep = useGame((s) => s.tourStep)
  const seeTip = useGame((s) => s.seeTip)
  const [bubble, setBubble] = useState<{ text: string; tour?: boolean } | null>(null)
  const [laterTour, setLaterTour] = useState(false)

  useEffect(() => {
    if (open || tourStep != null) { setBubble(null); return }
    if (!tourDone && !laterTour) { setBubble({ text: 'Hi, ich bin Lumi! Soll ich dir in einer kurzen Tour alles zeigen?', tour: true }); return }
    const st = useGame.getState()
    const today = dayKey()
    if (!tips || st.tipsSeen[tab] === today) { setBubble(null); return }
    const tip = tipFor(tab)
    if (!tip) return
    const t1 = setTimeout(() => { setBubble({ text: tip }); seeTip(tab) }, 900)
    const t2 = setTimeout(() => setBubble(null), 9500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [tab, open, tips, tourDone, tourStep, laterTour, seeTip])

  return (
    <div className="lumi-fab-wrap">
      <motion.button className="lumi-fab" data-tour="lumi" whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} onClick={() => { sfx.tap(); setUi({ companionOpen: !open }) }} aria-label="Lumi öffnen">
        <Lumi size={46} mood={bubble ? 'happy' : 'idle'} />
      </motion.button>
      <AnimatePresence>
        {bubble && (
          <motion.div className="lumi-bubble" initial={{ opacity: 0, y: -8, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.95 }}>
            <button className="lumi-bubble-x" onClick={() => { setBubble(null); if (bubble.tour) setLaterTour(true) }} aria-label="Schließen"><X size={14} /></button>
            <p onClick={() => !bubble.tour && setUi({ companionOpen: true })}>{bubble.text}</p>
            {bubble.tour && (
              <div className="row" style={{ gap: 6 }}>
                <button className="btn xs" onClick={() => { setBubble(null); setUi({ tourStep: 0 }) }}>Tour starten</button>
                <button className="btn ghost xs" onClick={() => { setBubble(null); setLaterTour(true) }}>Später</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function LumiSettings({ onBack }: { onBack: () => void }) {
  const c = useGame((s) => s.companion)
  const set = useGame((s) => s.setCompanion)
  const clearChat = useGame((s) => s.clearChat)
  const [voices, setVoices] = useState(germanVoices())
  const [key, setKey] = useState(c.apiKey)
  useEffect(() => { const t = setTimeout(() => setVoices(germanVoices()), 400); return () => clearTimeout(t) }, [])
  return (
    <div className="col" style={{ gap: 14 }}>
      <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={onBack}><ArrowLeft size={16} /> Zurück</button>
      <div className="card" style={{ padding: 14, boxShadow: 'none' }}>
        <h3 className="row" style={{ gap: 8 }}><Art name="speaker_on" size={22} /> Stimme</h3>
        {!canSpeak && <p className="small muted">Dieser Browser unterstützt keine Sprachausgabe.</p>}
        <label className="row between small"><span>Lumi spricht</span><input type="checkbox" checked={c.voice} onChange={(e) => set({ voice: e.target.checked })} /></label>
        <label className="row between small mt"><span>Antworten automatisch vorlesen</span><input type="checkbox" checked={c.autoSpeak} onChange={(e) => set({ autoSpeak: e.target.checked })} /></label>
        <label className="field mt" htmlFor="lumi-voice">Stimme
          <select id="lumi-voice" className="input" value={c.voiceURI} onChange={(e) => set({ voiceURI: e.target.value })}>
            <option value="">Automatisch (beste deutsche Stimme)</option>
            {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
          </select>
        </label>
        <label className="field mt" htmlFor="lumi-rate">Tempo {c.rate.toFixed(2)}
          <input id="lumi-rate" type="range" min={0.7} max={1.4} step={0.02} value={c.rate} onChange={(e) => set({ rate: Number(e.target.value) })} />
        </label>
        <label className="field" htmlFor="lumi-pitch">Tonhöhe {c.pitch.toFixed(2)}
          <input id="lumi-pitch" type="range" min={0.6} max={1.6} step={0.02} value={c.pitch} onChange={(e) => set({ pitch: Number(e.target.value) })} />
        </label>
        <button className="btn ghost sm mt" onClick={() => speak('Hi! So klinge ich. Gefällt dir meine Stimme?', { voiceURI: c.voiceURI, rate: c.rate, pitch: c.pitch })}>Stimme testen</button>
        <label className="row between small mt"><span>Tipps in der Sprechblase</span><input type="checkbox" checked={c.tips} onChange={(e) => set({ tips: e.target.checked })} /></label>
      </div>
      <div className="card" style={{ padding: 14, boxShadow: 'none' }}>
        <h3 className="row" style={{ gap: 8 }}><Art name="crystal_ball" size={22} /> KI-Gehirn (optional)</h3>
        <p className="small muted" style={{ marginTop: -4 }}>Ohne Schlüssel antworte ich mit meinem eingebauten Wissen, komplett offline. Mit einem eigenen Anthropic-API-Schlüssel nutze ich Claude ({CLAUDE_MODEL}) und verstehe freie Fragen viel besser.</p>
        <label className="field" htmlFor="lumi-key">Anthropic API-Schlüssel
          <input id="lumi-key" className="input" type="password" autoComplete="off" placeholder="sk-ant-…" value={key} onChange={(e) => setKey(e.target.value)} />
        </label>
        <div className="row mt">
          <button className="btn sm" disabled={!key.trim()} onClick={() => { set({ apiKey: key.trim(), useClaude: true }); resetClaude() }}>Speichern & aktivieren</button>
          {c.apiKey && <button className="btn danger sm" onClick={() => { set({ apiKey: '', useClaude: false }); setKey(''); resetClaude() }}>Entfernen</button>}
        </div>
        {c.apiKey && <label className="row between small mt"><span>Claude verwenden</span><input type="checkbox" checked={c.useClaude} onChange={(e) => set({ useClaude: e.target.checked })} /></label>}
        <p className="tiny muted" style={{ marginBottom: 0 }}>Der Schlüssel bleibt nur auf diesem Gerät und wird direkt an Anthropic gesendet. Anfragen kosten Guthaben auf deinem Anthropic-Konto. Lege am besten einen eigenen Schlüssel mit Ausgabelimit an.</p>
      </div>
      <button className="btn ghost sm" onClick={() => { clearChat(); resetClaude() }}>Chatverlauf löschen</button>
    </div>
  )
}

export function CompanionSheet() {
  const open = useGame((s) => s.companionOpen)
  const setUi = useGame((s) => s.setUi)
  const chat = useGame((s) => s.chat)
  const push = useGame((s) => s.pushChat)
  const c = useGame((s) => s.companion)
  const setC = useGame((s) => s.setCompanion)
  const name = useGame((s) => s.player.name)
  const speaking = useVoice((s) => s.speaking)
  const listening = useVoice((s) => s.listening)
  const speakNow = useSpeakNow()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [mood, setMood] = useState<LumiMood>('happy')
  const [view, setView] = useState<'chat' | 'settings'>('chat')
  const stopRef = useRef<() => void>(() => {})
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [chat.length, busy, open])
  useEffect(() => {
    if (!open) { stopSpeaking(); stopRef.current(); return }
    if (chat.length === 0) {
      const hello = `Hey ${name}! Ich bin Lumi, dein System-Guide. Frag mich alles, sag mir was du erledigt hast, oder tippe unten auf eine Aktion.`
      push({ role: 'lumi', text: hello, actions: [{ label: 'Tagesbriefing', cmd: 'say:briefing' }, { label: 'Guide-Tour', cmd: 'tour' }] })
      if (c.autoSpeak) speakNow(hello)
    }
  }, [open])

  const answer = (r: Reply) => {
    push({ role: 'lumi', text: r.text, actions: r.actions })
    setMood(r.mood ?? 'happy')
    if (c.autoSpeak) speakNow(r.text)
  }

  const send = async (raw: string) => {
    const msg = raw.trim()
    if (!msg || busy) return
    setText('')
    push({ role: 'user', text: msg })
    setMood('think')
    setBusy(true)
    try {
      if (c.useClaude && c.apiKey) {
        try {
          const reply = await askClaude(msg, c.apiKey)
          answer({ text: reply, mood: 'happy' })
        } catch (e) {
          const local = think(msg)
          answer({ ...local, text: `${(e as Error).message} ${local.text}` })
        }
      } else {
        await new Promise((r) => setTimeout(r, 350))
        answer(think(msg))
      }
    } finally {
      setBusy(false)
    }
  }

  const act = (cmd: string) => {
    sfx.tap()
    if (cmd === 'say:briefing') { const b = briefing(); answer({ text: b.text, actions: b.actions }); return }
    if (cmd === 'say:next') { const n = nextStep(); answer({ text: n.text, actions: n.actions }); return }
    if (cmd.startsWith('ask:')) { void send(cmd.slice(4)); return }
    const res = runCmd(cmd)
    if (res) answer({ text: res, mood: 'happy' })
  }

  const mic = () => {
    if (listening) { stopRef.current(); return }
    stopRef.current = listen((t, final) => { setText(t); if (final) void send(t) }, (err) => push({ role: 'lumi', text: err }))
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay sheet-overlay lumi-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setUi({ companionOpen: false })}>
          <motion.div className="sheet lumi-sheet" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }} onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <div className="lumi-head">
              <Lumi size={84} mood={busy ? 'think' : mood} />
              <div className="grow">
                <div className="lumi-name">Lumi</div>
                <div className="tiny muted">{busy ? 'denkt nach…' : listening ? 'hört zu…' : speaking ? 'spricht…' : c.useClaude && c.apiKey ? 'System-Guide · Claude verbunden' : 'System-Guide · offline'}</div>
              </div>
              {speaking && <button className="btn ghost icon" onClick={stopSpeaking} aria-label="Stopp"><Square size={16} /></button>}
              <button className="btn ghost icon" onClick={() => { setC({ voice: !c.voice }); if (c.voice) stopSpeaking() }} aria-label={c.voice ? 'Stimme aus' : 'Stimme an'}>{c.voice ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
              <button className="btn ghost icon" onClick={() => setView(view === 'chat' ? 'settings' : 'chat')} aria-label="Lumi-Einstellungen"><Settings2 size={18} /></button>
              <button className="btn ghost icon" onClick={() => setUi({ companionOpen: false })} aria-label="Schließen"><X size={18} /></button>
            </div>
            {view === 'settings' ? <LumiSettings onBack={() => setView('chat')} /> : (
              <>
                <div className={`lumi-quick ${chat.length > 1 ? 'compact' : ''}`}>
                  {QUICK.map((q) => (
                    <motion.button key={q.label} whileTap={{ scale: 0.94 }} onClick={() => act(q.cmd)}>
                      <Art name={q.art} size={34} /><span>{q.label}</span>
                    </motion.button>
                  ))}
                </div>
                <div className="lumi-chat">
                  {chat.map((m) => (
                    <motion.div key={m.id} className={`msg ${m.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="bubble">
                        {m.text}
                        {m.role === 'lumi' && canSpeak && <button className="replay" onClick={() => speak(m.text, { voiceURI: c.voiceURI, rate: c.rate, pitch: c.pitch })} aria-label="Vorlesen"><Volume2 size={13} /></button>}
                      </div>
                      {m.actions && m.actions.length > 0 && (
                        <div className="msg-actions">{m.actions.map((a) => <button key={a.label} className="chip" onClick={() => act(a.cmd)}>{a.label}</button>)}</div>
                      )}
                    </motion.div>
                  ))}
                  {busy && <div className="msg lumi"><div className="bubble typing"><i /><i /><i /></div></div>}
                  <div ref={end} />
                </div>
                <form className="lumi-input" onSubmit={(e) => { e.preventDefault(); void send(text) }}>
                  {canListen && (
                    <button type="button" className={`btn icon ${listening ? '' : 'ghost'}`} onClick={mic} aria-label={listening ? 'Zuhören stoppen' : 'Sprechen'}>
                      {listening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                  )}
                  <input id="lumi-text" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={listening ? 'Ich höre zu…' : 'Frag Lumi oder sag, was du erledigt hast'} autoComplete="off" />
                  <button type="submit" className="btn icon" disabled={!text.trim() || busy} aria-label="Senden"><Send size={18} /></button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
