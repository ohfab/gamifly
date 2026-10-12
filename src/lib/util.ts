export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)

export const dayKey = (d = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export const parseDay = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (k: string, n: number) => {
  const d = parseDay(k)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}
export const daysBetween = (a: string, b: string) => Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000)
export const weekKey = (d = new Date()) => {
  const x = new Date(d)
  const dow = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - dow)
  return dayKey(x)
}
export const lastNDays = (n: number, from = dayKey()) => Array.from({ length: n }, (_, i) => addDays(from, i - n + 1))
export const WEEKDAY = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
export const fmt = (n: number) => n.toLocaleString('de-DE')
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

export const msToMidnight = () => {
  const n = new Date()
  const m = new Date(n)
  m.setHours(24, 0, 0, 0)
  return m.getTime() - n.getTime()
}
export const fmtDuration = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
