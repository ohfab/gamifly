import type { Cloth } from '../game/types'

/** A garment the avatar should wear. `key` identifies it across renders (diffing, scan-in animation). */
export interface WornPart { key: string; def: string; color: string; fabric: string }

export const CUTS: Record<string, { v: string; label: string }[]> = {
  top: [{ v: 'tee', label: 'T-Shirt' }, { v: 'tee_loose', label: 'Oversized' }, { v: 'crop', label: 'Crop/Tank' }, { v: 'longsleeve', label: 'Pulli/Longsleeve' }, { v: 'shirt', label: 'Hemd' }, { v: 'blouse', label: 'Bluse' }],
  bottom: [{ v: 'jeans', label: 'Jeans' }, { v: 'trousers', label: 'Stoffhose' }, { v: 'leggings', label: 'Leggings' }, { v: 'shorts', label: 'Shorts' }, { v: 'skirt', label: 'A-Linie' }, { v: 'pencil', label: 'Bleistiftrock' }],
  dress: [{ v: 'dress', label: 'Kleid' }],
  outer: [{ v: 'jacket', label: 'Jacke' }, { v: 'coat', label: 'Mantel' }, { v: 'blazer', label: 'Blazer/Sakko' }],
  shoes: [{ v: 'shoes06', label: 'Sneaker' }, { v: 'shoes05', label: 'Sneaker clean' }, { v: 'shoes02', label: 'Runner' }, { v: 'shoes03', label: 'Boots' }, { v: 'shoes01', label: 'Derby' }, { v: 'shoes04', label: 'Loafer' }],
  accessory: [{ v: 'fedora', label: 'Hut' }],
}

export const TEXTILES: { v: string; label: string }[] = [
  { v: 'jersey', label: 'Jersey' }, { v: 'melange', label: 'Melange' }, { v: 'knit', label: 'Strick' }, { v: 'poplin', label: 'Popeline' },
  { v: 'denim', label: 'Denim' }, { v: 'wool', label: 'Wolle' }, { v: 'boucle', label: 'Bouclé' }, { v: 'satin', label: 'Satin' },
  { v: 'georgette', label: 'Chiffon' }, { v: 'linen', label: 'Leinen' }, { v: 'velvet', label: 'Samt' }, { v: 'corduroy', label: 'Cord' },
  { v: 'leather', label: 'Leder' }, { v: 'scuba', label: 'Stretch' },
]

const has = (s: string, ...words: string[]) => words.some((w) => s.includes(w))
const light = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 170
}

/** Picks a 3D cut for a wardrobe item from its category, form and name. */
export function cutFor(c: Cloth): string | null {
  if (c.cut) return c.cut
  const n = `${c.name} ${c.tags.join(' ')}`.toLowerCase()
  switch (c.cat) {
    case 'top':
      if (has(n, 'bluse', 'blouse', 'satin')) return 'blouse'
      if (has(n, 'hemd', 'shirt ', 'button', 'oxford') && !has(n, 't-shirt', 'tshirt')) return 'shirt'
      if (has(n, 'pulli', 'pullover', 'sweat', 'hoodie', 'strick', 'knit', 'longsleeve', 'cardigan', 'rolli')) return 'longsleeve'
      if (has(n, 'crop', 'tank', 'bralette', 'bustier', 'sport-top', 'sport top', 'top ')) return 'crop'
      if (has(n, 'oversize', 'boxy', 'weit')) return 'tee_loose'
      return 'tee'
    case 'bottom':
      if (c.fit === 'skirt') return has(n, 'bleistift', 'pencil', 'business', 'midi') && !has(n, 'falten', 'plissee') ? 'pencil' : 'skirt'
      if (c.fit === 'shorts') return 'shorts'
      if (has(n, 'legging', 'yoga', 'sporty', 'radler')) return 'leggings'
      if (has(n, 'stoff', 'chino', 'anzug', 'business', 'bundfalte', 'culotte', 'palazzo')) return 'trousers'
      return 'jeans'
    case 'dress': return 'dress'
    case 'outer':
      if (has(n, 'blazer', 'sakko', 'anzug')) return 'blazer'
      if (has(n, 'mantel', 'coat', 'trench', 'parka')) return 'coat'
      return 'jacket'
    case 'shoes':
      if (has(n, 'boot', 'stiefel')) return 'shoes03'
      if (has(n, 'loafer', 'ballerina', 'pump', 'heel', 'mokassin')) return 'shoes04'
      if (has(n, 'derby', 'oxford', 'budapester', 'leder')) return 'shoes01'
      if (has(n, 'runner', 'lauf', 'running')) return 'shoes02'
      return light(c.color) ? 'shoes05' : 'shoes06'
    case 'accessory': return c.fit === 'hat' ? 'fedora' : null
  }
  return null
}

const CUT_FABRIC: Record<string, string> = {
  tee: 'jersey', tee_loose: 'jersey', crop: 'scuba', longsleeve: 'melange', shirt: 'poplin', blouse: 'georgette',
  jeans: 'denim', trousers: 'wool', leggings: 'scuba', shorts: 'denim', skirt: 'satin', pencil: 'wool', dress: 'georgette',
  jacket: 'scuba', coat: 'wool', blazer: 'wool', fedora: 'wool',
  shoes01: 'leather', shoes02: 'scuba', shoes03: 'leather', shoes04: 'leather', shoes05: 'leather', shoes06: 'scuba',
}

export function textileFor(c: Cloth, cut: string): string {
  if (c.textile) return c.textile
  const n = `${c.name} ${c.tags.join(' ')}`.toLowerCase()
  if (has(n, 'jeans', 'denim')) return 'denim'
  if (has(n, 'strick', 'knit', 'cardigan', 'wollpulli')) return 'knit'
  if (has(n, 'satin', 'seide', 'silk')) return 'satin'
  if (has(n, 'leder', 'leather', 'lack')) return 'leather'
  if (has(n, 'samt', 'velvet', 'velours')) return 'velvet'
  if (has(n, 'leinen', 'linen')) return 'linen'
  if (has(n, 'cord')) return 'corduroy'
  if (has(n, 'teddy', 'boucl', 'fleece')) return 'boucle'
  if (has(n, 'chiffon', 'tüll', 'blümchen', 'floral')) return 'georgette'
  if (has(n, 'hoodie', 'jogger', 'sweat')) return 'melange'
  if (has(n, 'woll', 'tweed', 'mantel', 'trench')) return 'wool'
  return CUT_FABRIC[cut] ?? 'jersey'
}

/** Wardrobe items → garment parts. Dresses expand to bodice + skirt. */
export function outfitParts(items: Cloth[]): WornPart[] {
  const out: WornPart[] = []
  for (const c of items) {
    const cut = cutFor(c)
    if (!cut) continue
    const fabric = textileFor(c, cut)
    if (cut === 'dress') {
      out.push({ key: c.id + ':b', def: 'dress_bodice', color: c.color, fabric })
      out.push({ key: c.id + ':s', def: 'dress_skirt', color: c.color, fabric })
    } else out.push({ key: c.id + ':' + cut, def: cut, color: c.color, fabric })
  }
  return out
}
