import { create } from 'zustand'

/** Microphone state, so the System sigil can pulse while it listens. Voice output was removed on purpose. */
export const useVoice = create<{ listening: boolean }>(() => ({ listening: false }))

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
