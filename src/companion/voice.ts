import { create } from 'zustand'

/** Live speaking state so Lumi's mouth can move with the voice. */
export const useVoice = create<{ speaking: boolean; listening: boolean; pulse: number }>(() => ({ speaking: false, listening: false, pulse: 0 }))

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
let voices: SpeechSynthesisVoice[] = []
const load = () => { try { voices = synth?.getVoices() ?? [] } catch { voices = [] } }
load()
if (synth) synth.onvoiceschanged = load

export const canSpeak = !!synth
export const germanVoices = () => {
  load()
  return voices.filter((v) => v.lang?.toLowerCase().startsWith('de'))
}
const PREFERRED = /natural|neural|google|premium|enhanced|siri/i
function pickVoice(uri: string) {
  const de = germanVoices()
  return de.find((v) => v.voiceURI === uri) ?? de.find((v) => PREFERRED.test(v.name)) ?? de[0] ?? voices.find((v) => v.default)
}

/** Strips markdown-ish symbols and splits into sentence chunks the engines handle reliably. */
function chunks(text: string) {
  const clean = text.replace(/[*_#`>~]/g, '').replace(/\s+/g, ' ').trim()
  const parts = clean.match(/[^.!?…]+[.!?…]*\s*/g) ?? [clean]
  const out: string[] = []
  let cur = ''
  for (const p of parts) {
    if ((cur + p).length > 180 && cur) { out.push(cur.trim()); cur = '' }
    cur += p
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

let keepAlive: number | undefined
export function speak(text: string, opts: { voiceURI?: string; rate?: number; pitch?: number } = {}) {
  if (!synth || !text.trim()) return
  stopSpeaking()
  const v = pickVoice(opts.voiceURI ?? '')
  const list = chunks(text)
  list.forEach((c, i) => {
    const u = new SpeechSynthesisUtterance(c)
    u.lang = v?.lang ?? 'de-DE'
    if (v) u.voice = v
    u.rate = opts.rate ?? 1
    u.pitch = opts.pitch ?? 1.1
    u.onstart = () => useVoice.setState({ speaking: true })
    u.onboundary = () => useVoice.setState((s) => ({ pulse: s.pulse + 1 }))
    u.onend = u.onerror = () => { if (i === list.length - 1) { useVoice.setState({ speaking: false }); clearInterval(keepAlive) } }
    synth.speak(u)
  })
  // Chrome pauses long queues; nudging keeps them going.
  clearInterval(keepAlive)
  keepAlive = window.setInterval(() => { if (synth.speaking && !synth.paused) { synth.pause(); synth.resume() } }, 10000)
}
export function stopSpeaking() {
  try { synth?.cancel() } catch { /* ignore */ }
  clearInterval(keepAlive)
  useVoice.setState({ speaking: false })
}

// ---------- speech recognition ----------
interface Rec {
  lang: string; interimResults: boolean; continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null
  start: () => void; stop: () => void
}
const RecCtor = typeof window !== 'undefined'
  ? ((window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => Rec }).webkitSpeechRecognition)
  : undefined
export const canListen = !!RecCtor

export function listen(onText: (text: string, final: boolean) => void, onError?: (msg: string) => void) {
  if (!RecCtor) { onError?.('Spracheingabe wird von diesem Browser nicht unterstützt.'); return () => {} }
  stopSpeaking()
  const rec = new RecCtor()
  rec.lang = 'de-DE'
  rec.interimResults = true
  rec.continuous = false
  rec.onresult = (e) => {
    let txt = ''
    let final = false
    for (let i = 0; i < e.results.length; i++) { txt += e.results[i][0].transcript; final = e.results[i].isFinal }
    onText(txt, final)
  }
  rec.onerror = (e) => onError?.(e.error === 'not-allowed' ? 'Mikrofon-Zugriff wurde nicht erlaubt.' : 'Ich habe dich nicht verstanden.')
  rec.onend = () => useVoice.setState({ listening: false })
  useVoice.setState({ listening: true })
  try { rec.start() } catch { useVoice.setState({ listening: false }) }
  return () => { try { rec.stop() } catch { /* ignore */ } }
}
