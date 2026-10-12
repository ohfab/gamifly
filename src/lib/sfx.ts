let ctx: AudioContext | null = null
let enabled = true
export const setSfx = (on: boolean) => { enabled = on }

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.08) {
  if (!ctx) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0, ctx.currentTime + start)
  g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur)
  o.connect(g).connect(ctx.destination)
  o.start(ctx.currentTime + start)
  o.stop(ctx.currentTime + start + dur + 0.05)
}

function ensure() {
  if (!enabled) return false
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return true
  } catch {
    return false
  }
}

export const sfx = {
  tap() { if (ensure()) tone(880, 0, 0.06, 'sine', 0.03) },
  quest() { if (ensure()) { tone(784, 0, 0.18, 'triangle'); tone(1175, 0.09, 0.3, 'triangle') } },
  coin() { if (ensure()) { tone(1319, 0, 0.08, 'square', 0.03); tone(1760, 0.06, 0.18, 'square', 0.03) } },
  loot() { if (ensure()) [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.07, 0.35, 'sine', 0.06)) },
  level() { if (ensure()) [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.09, 0.5, 'triangle', 0.07)) },
  warn() { if (ensure()) { tone(220, 0, 0.25, 'sawtooth', 0.04); tone(196, 0.2, 0.4, 'sawtooth', 0.04) } },
}
