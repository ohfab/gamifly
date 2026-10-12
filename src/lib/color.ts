export interface HSL { h: number; s: number; l: number }

export function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
export const rgbToHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

export function hexToHsl(hex: string): HSL {
  const { r, g, b } = hexToRgb(hex)
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
  }
  return { h, s, l }
}

/** Neutrals (black, white, grey, beige, camel, denim-ish navy) go with everything. */
export function isNeutral(hex: string) {
  const { h, s, l } = hexToHsl(hex)
  if (s < 0.14 || l < 0.13 || l > 0.92) return true
  if (h >= 20 && h <= 48 && s < 0.55 && l > 0.45) return true // beige, camel, cream
  if (h >= 195 && h <= 235 && (l < 0.32 || (s < 0.5 && l < 0.66))) return true // navy & denim
  return false
}

export function colorName(hex: string): string {
  const { h, s, l } = hexToHsl(hex)
  if (l < 0.13) return 'Schwarz'
  if (l > 0.92) return 'Weiß'
  if (s < 0.12) return l > 0.6 ? 'Hellgrau' : l > 0.35 ? 'Grau' : 'Anthrazit'
  if (h >= 18 && h <= 48 && s < 0.55) return l > 0.7 ? 'Creme' : l > 0.45 ? 'Beige' : 'Braun'
  if (h < 12 || h >= 345) return l > 0.72 ? 'Rosé' : 'Rot'
  if (h < 40) return l < 0.35 ? 'Braun' : l > 0.72 ? 'Pfirsich' : 'Orange'
  if (h < 68) return l > 0.75 ? 'Vanille' : 'Gelb'
  if (h < 90) return 'Oliv'
  if (h < 160) return l > 0.7 ? 'Mint' : l < 0.3 ? 'Dunkelgrün' : 'Grün'
  if (h < 195) return 'Türkis'
  if (h < 250) return l > 0.72 ? 'Hellblau' : l < 0.3 ? 'Navy' : 'Blau'
  if (h < 290) return l > 0.7 ? 'Flieder' : 'Lila'
  if (h < 345) return l > 0.7 ? 'Rosa' : 'Pink'
  return 'Bunt'
}

const hueDist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/** Returns a 0..1 harmony score for a palette and a short German explanation. */
export function harmony(colors: string[]): { score: number; why: string } {
  const accents = colors.filter((c) => !isNeutral(c))
  const neutrals = colors.length - accents.length
  if (accents.length === 0) return { score: 0.85, why: 'All-Neutrals: zeitlos & clean' }
  if (accents.length === 1) return { score: 0.95, why: `Neutrals + ${colorName(accents[0])} als Farbakzent` }
  const hs = accents.map(hexToHsl)
  let worst = 0
  let comp = false
  for (let i = 0; i < hs.length; i++)
    for (let j = i + 1; j < hs.length; j++) {
      const d = hueDist(hs[i].h, hs[j].h)
      if (d > 150) comp = true
      else worst = Math.max(worst, d)
    }
  const pastel = hs.every((x) => x.l > 0.68)
  if (worst <= 40 && !comp) return { score: 0.9, why: pastel ? 'Ton-in-Ton Pastell 🍬' : 'Analoge Farben – harmonisch' }
  if (comp && accents.length === 2) return { score: neutrals ? 0.8 : 0.72, why: 'Komplementär-Kontrast – mutig!' }
  if (pastel) return { score: 0.75, why: 'Pastell-Mix – verspielt' }
  return { score: 0.45, why: 'Viele Farben – eher wild' }
}

/** Dominant color of the central area of an image. */
export function dominantColor(img: HTMLImageElement): string {
  const c = document.createElement('canvas')
  const S = 40
  c.width = S
  c.height = S
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const sw = img.naturalWidth * 0.6, sh = img.naturalHeight * 0.6
  ctx.drawImage(img, img.naturalWidth * 0.2, img.naturalHeight * 0.2, sw, sh, 0, 0, S, S)
  const { data } = ctx.getImageData(0, 0, S, S)
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>()
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
    if (a < 128) continue
    if (r > 240 && g > 240 && b > 240) continue // skip white backdrop
    const k = `${r >> 5}-${g >> 5}-${b >> 5}`
    const e = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 }
    e.n++; e.r += r; e.g += g; e.b += b
    buckets.set(k, e)
  }
  let best: { n: number; r: number; g: number; b: number } | null = null
  for (const v of buckets.values()) if (!best || v.n > best.n) best = v
  if (!best) return '#f2f2f2'
  return rgbToHex(best.r / best.n, best.g / best.n, best.b / best.n)
}
