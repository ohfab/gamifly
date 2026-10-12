import type { Cloth, ClothCat, ClothFit } from '../game/types'
import { colorName, harmony, isNeutral } from './color'
import { dayKey, daysBetween } from './util'

export const CAT_LABEL: Record<ClothCat, string> = { top: 'Oberteil', bottom: 'Unterteil', dress: 'Kleid', outer: 'Jacke/Mantel', shoes: 'Schuhe', accessory: 'Accessoire' }
export const CAT_ICON: Record<ClothCat, string> = { top: '👚', bottom: '👖', dress: '👗', outer: '🧥', shoes: '👟', accessory: '👜' }
export const clothIcon = (c: { cat: ClothCat; fit: ClothFit }) =>
  c.cat === 'accessory' ? (c.fit === 'hat' ? '👒' : c.fit === 'jewelry' ? '📿' : '👜') : CAT_ICON[c.cat]
export const FITS: Partial<Record<ClothCat, { v: ClothFit; label: string }[]>> = {
  bottom: [{ v: 'pants', label: 'Hose' }, { v: 'skirt', label: 'Rock' }, { v: 'shorts', label: 'Shorts' }],
  accessory: [{ v: 'bag', label: 'Tasche' }, { v: 'hat', label: 'Hut/Cap' }, { v: 'jewelry', label: 'Schmuck' }],
}
export const VIBES = ['clean girl', 'cozy', 'chic', 'sporty', 'y2k', 'romantic', 'streetwear', 'business', 'boho', 'casual']
export const SEASONS = ['Frühling', 'Sommer', 'Herbst', 'Winter']

export type Occasion = 'alltag' | 'arbeit' | 'date' | 'sport' | 'party' | 'cozy'
export type Weather = 'warm' | 'mild' | 'kalt' | 'regen'
export const OCCASIONS: { v: Occasion; label: string; tags: string[] }[] = [
  { v: 'alltag', label: '☕ Alltag', tags: ['clean girl', 'casual', 'streetwear', 'cozy'] },
  { v: 'arbeit', label: '💼 Uni/Arbeit', tags: ['chic', 'business', 'clean girl'] },
  { v: 'date', label: '💘 Date', tags: ['romantic', 'chic', 'y2k'] },
  { v: 'sport', label: '🧘 Sport', tags: ['sporty'] },
  { v: 'party', label: '🪩 Party', tags: ['y2k', 'chic', 'streetwear'] },
  { v: 'cozy', label: '🧸 Cozy Day', tags: ['cozy', 'casual'] },
]
export const WEATHERS: { v: Weather; label: string }[] = [
  { v: 'warm', label: '☀️ Warm' }, { v: 'mild', label: '⛅ Mild' }, { v: 'kalt', label: '❄️ Kalt' }, { v: 'regen', label: '🌧️ Regen' },
]

export interface Suggestion { items: Cloth[]; score: number; reasons: string[] }

export function suggest(w: Cloth[], occasion: Occasion, weather: Weather, seed = 0): Suggestion[] {
  const by = (c: ClothCat) => w.filter((x) => x.cat === c)
  const tags = OCCASIONS.find((o) => o.v === occasion)!.tags
  const tagScore = (c: Cloth) => (c.tags.some((t) => tags.includes(t)) ? 1 : c.tags.length === 0 ? 0.5 : 0.2)
  const seasonOk = (c: Cloth) => {
    if (!c.seasons.length) return 0.7
    const want = weather === 'warm' ? ['Sommer', 'Frühling'] : weather === 'kalt' ? ['Winter', 'Herbst'] : ['Frühling', 'Herbst']
    return c.seasons.some((s) => want.includes(s)) ? 1 : 0.3
  }
  const fresh = (c: Cloth) => (!c.lastWorn ? 1 : Math.min(1, daysBetween(c.lastWorn, dayKey()) / 7))
  const rnd = (i: number) => { const x = Math.sin(seed * 999 + i * 77.7) * 10000; return x - Math.floor(x) }

  const bases: Cloth[][] = []
  by('dress').forEach((d) => bases.push([d]))
  by('top').forEach((t) => by('bottom').forEach((b) => {
    if (weather === 'kalt' && b.fit === 'shorts') return
    bases.push([t, b])
  }))
  if (!bases.length) return []

  const pickBest = (base: Cloth[], pool: Cloth[], i: number) => {
    let best: Cloth | null = null, bs = -1
    pool.forEach((c, j) => {
      const sc = harmony([...base, c].map((x) => x.color)).score + tagScore(c) * 0.4 + rnd(i * 31 + j) * 0.25
      if (sc > bs) { bs = sc; best = c }
    })
    return best as Cloth | null
  }

  const out: Suggestion[] = bases.map((base, i) => {
    const items = [...base]
    const outer = (weather === 'kalt' || weather === 'regen' || (weather === 'mild' && rnd(i) > 0.5)) ? pickBest(items, by('outer'), i) : null
    if (outer) items.push(outer)
    const shoes = pickBest(items, by('shoes'), i + 3)
    if (shoes) items.push(shoes)
    const acc = pickBest(items, by('accessory'), i + 7)
    if (acc && occasion !== 'sport') items.push(acc)
    const h = harmony(items.map((x) => x.color))
    const t = items.reduce((a, c) => a + tagScore(c), 0) / items.length
    const se = items.reduce((a, c) => a + seasonOk(c), 0) / items.length
    const fr = items.reduce((a, c) => a + fresh(c), 0) / items.length
    const fav = items.some((c) => c.fav) ? 0.05 : 0
    const needOuter = (weather === 'kalt' || weather === 'regen') && !outer ? -0.15 : 0
    const score = Math.max(0, Math.min(1, h.score * 0.45 + t * 0.25 + se * 0.15 + fr * 0.1 + fav + needOuter + rnd(i + 100) * 0.06))
    const reasons = [h.why]
    if (t > 0.8) reasons.push(`Passt perfekt zu ${OCCASIONS.find((o) => o.v === occasion)!.label.slice(2).trim()}`)
    if (fr > 0.8) reasons.push('Lange nicht getragen – Zeit für ein Comeback')
    if (needOuter) reasons.push('Tipp: Dir fehlt eine passende Jacke für das Wetter')
    if (outer && weather === 'regen') reasons.push('Mit Jacke gegen den Regen')
    return { items, score, reasons }
  })
  out.sort((a, b) => b.score - a.score)
  const seen = new Set<string>()
  return out.filter((s) => { const k = s.items.map((i) => i.id).sort().join(); if (seen.has(k)) return false; seen.add(k); return true }).slice(0, 4)
}

export interface Gap { name: string; why: string; query: string; icon: string }
export function gaps(w: Cloth[]): Gap[] {
  const has = (f: (c: Cloth) => boolean) => w.some(f)
  const g: Gap[] = []
  if (!has((c) => c.cat === 'top' && isNeutral(c.color) && (colorName(c.color) === 'Weiß' || colorName(c.color) === 'Creme')))
    g.push({ name: 'Weißes Basic-Top', why: 'Kombinierbar mit allem – das Fundament jeder Capsule Wardrobe.', query: 'weißes basic t-shirt', icon: '👚' })
  if (!has((c) => c.cat === 'bottom' && c.fit === 'pants' && isNeutral(c.color)))
    g.push({ name: 'Straight-Leg Jeans', why: 'Neutrale Hose für Alltag, Uni & Date.', query: 'straight leg jeans hellblau', icon: '👖' })
  if (!has((c) => c.cat === 'outer'))
    g.push({ name: 'Trenchcoat in Beige', why: 'Für mildes & regnerisches Wetter, macht jedes Outfit chic.', query: 'trenchcoat beige', icon: '🧥' })
  if (!has((c) => c.cat === 'shoes' && isNeutral(c.color)))
    g.push({ name: 'Weiße Sneaker', why: 'Neutrale Schuhe, die zu fast allem passen.', query: 'weiße sneaker leder', icon: '👟' })
  if (!has((c) => c.cat === 'accessory' && c.fit === 'bag'))
    g.push({ name: 'Mini Shoulder Bag', why: 'Das Finishing-Touch-Item. Boost für CHA.', query: 'mini shoulder bag', icon: '👜' })
  if (!has((c) => c.cat === 'dress'))
    g.push({ name: 'Midi-Kleid', why: 'Ein Teil = komplettes Outfit. Perfekt für Dates.', query: 'midi kleid satin', icon: '👗' })
  if (!has((c) => c.tags.includes('cozy')))
    g.push({ name: 'Oversized Strickpulli', why: 'Cozy-Days brauchen einen Lieblingspulli.', query: 'oversized strickpullover', icon: '🧶' })
  if (w.length >= 4 && !has((c) => !isNeutral(c.color)))
    g.push({ name: 'Ein Farb-Statement', why: 'Dein Schrank ist sehr neutral – ein Pastell-Akzent bringt Leben rein.', query: 'pastell rosa cardigan', icon: '🎀' })
  return g
}

export const SHOPS = [
  { name: 'Zalando', url: (q: string) => `https://www.zalando.de/katalog/?q=${encodeURIComponent(q)}` },
  { name: 'H&M', url: (q: string) => `https://www2.hm.com/de_de/search-results.html?q=${encodeURIComponent(q)}` },
  { name: 'Zara', url: (q: string) => `https://www.zara.com/de/de/search?searchTerm=${encodeURIComponent(q)}` },
  { name: 'ASOS', url: (q: string) => `https://www.asos.com/de/search/?q=${encodeURIComponent(q)}` },
  { name: 'Vinted', url: (q: string) => `https://www.vinted.de/catalog?search_text=${encodeURIComponent(q)}` },
  { name: 'Pinterest', url: (q: string) => `https://www.pinterest.de/search/pins/?q=${encodeURIComponent(q + ' outfit')}` },
]

export const similarQuery = (c: Cloth) => `${colorName(c.color)} ${c.fit !== 'default' ? (FITS[c.cat]?.find((f) => f.v === c.fit)?.label ?? CAT_LABEL[c.cat]) : CAT_LABEL[c.cat]} ${c.tags[0] ?? ''}`.trim()

export const SAMPLE_WARDROBE: Omit<Cloth, 'id' | 'addedAt'>[] = [
  { name: 'Weißes Tee', cat: 'top', fit: 'default', color: '#f6f3ef', tags: ['clean girl', 'casual'], seasons: ['Frühling', 'Sommer'], fav: true, wears: 4 },
  { name: 'Rosa Strickpulli', cat: 'top', fit: 'default', color: '#f4b6cd', tags: ['cozy', 'romantic'], seasons: ['Herbst', 'Winter'], fav: false, wears: 2 },
  { name: 'Lila Satin-Top', cat: 'top', fit: 'default', color: '#b9a2ea', tags: ['chic', 'y2k'], seasons: ['Sommer'], fav: false, wears: 1 },
  { name: 'Mom Jeans', cat: 'bottom', fit: 'pants', color: '#7d9cc4', tags: ['casual', 'streetwear'], seasons: [], fav: false, wears: 6 },
  { name: 'Beiger Midirock', cat: 'bottom', fit: 'skirt', color: '#e6d3bc', tags: ['chic', 'romantic'], seasons: ['Frühling', 'Sommer'], fav: false, wears: 1 },
  { name: 'Schwarze Leggings', cat: 'bottom', fit: 'pants', color: '#2a272f', tags: ['sporty', 'cozy'], seasons: [], fav: false, wears: 3 },
  { name: 'Blümchenkleid', cat: 'dress', fit: 'default', color: '#ffd3e4', tags: ['romantic', 'boho'], seasons: ['Sommer'], fav: true, wears: 2 },
  { name: 'Trenchcoat', cat: 'outer', fit: 'default', color: '#d7bf98', tags: ['chic', 'business'], seasons: ['Frühling', 'Herbst'], fav: false, wears: 3 },
  { name: 'Weiße Sneaker', cat: 'shoes', fit: 'default', color: '#fbfbfb', tags: ['casual', 'clean girl'], seasons: [], fav: false, wears: 9 },
  { name: 'Rosa Ballerinas', cat: 'shoes', fit: 'default', color: '#f2c2d1', tags: ['romantic', 'chic'], seasons: ['Frühling', 'Sommer'], fav: false, wears: 1 },
  { name: 'Shoulder Bag', cat: 'accessory', fit: 'bag', color: '#c7a07c', tags: ['chic', 'clean girl'], seasons: [], fav: false, wears: 5 },
  { name: 'Perlenkette', cat: 'accessory', fit: 'jewelry', color: '#fff6ea', tags: ['romantic', 'clean girl'], seasons: [], fav: false, wears: 2 },
]
