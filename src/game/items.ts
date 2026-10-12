import type { ItemDef, Rarity } from './types'

export const ITEMS: ItemDef[] = [
  // consumables
  { id: 'potion_xp_s', name: 'Erdbeer-Elixier', desc: 'Ein süßer Trank. +60 XP.', icon: '🧃', rarity: 'common', type: 'consumable', effect: { kind: 'xp', amount: 60 }, price: 120 },
  { id: 'potion_xp_m', name: 'Rosenquarz-Trank', desc: 'Schimmert rosa. +180 XP.', icon: '🧪', rarity: 'rare', type: 'consumable', effect: { kind: 'xp', amount: 180 }, price: 320 },
  { id: 'potion_xp_l', name: 'Elixier der Erwachten', desc: 'Pure Energie. +500 XP.', icon: '⚗️', rarity: 'epic', type: 'consumable', effect: { kind: 'xp', amount: 500 }, gemPrice: 12 },
  { id: 'gold_pouch', name: 'Glitzer-Geldbeutel', desc: 'Klimpert verdächtig. +80 Gold.', icon: '👛', rarity: 'common', type: 'consumable', effect: { kind: 'gold', amount: 80 } },
  { id: 'gold_chest', name: 'Goldene Schatulle', desc: '+300 Gold.', icon: '💰', rarity: 'rare', type: 'consumable', effect: { kind: 'gold', amount: 300 } },
  { id: 'gem_shard', name: 'Kristallsplitter', desc: '+3 Kristalle.', icon: '💎', rarity: 'uncommon', type: 'consumable', effect: { kind: 'gems', amount: 3 } },
  { id: 'stat_elixir', name: 'Sternenstaub', desc: '+1 freier Statuspunkt.', icon: '✨', rarity: 'epic', type: 'consumable', effect: { kind: 'statPoint', amount: 1 }, gemPrice: 8 },
  { id: 'streak_shield', name: 'Schleifen-Schild', desc: 'Schützt deinen Streak einmal vor der Strafzone. Wirkt automatisch.', icon: '🎀', rarity: 'rare', type: 'consumable', effect: { kind: 'streakShield' }, price: 450 },
  { id: 'box_common', name: 'Pastell-Box', desc: 'Zufälliges Item (gewöhnlich bis selten).', icon: '🎁', rarity: 'uncommon', type: 'consumable', effect: { kind: 'mystery', tier: 1 }, price: 200 },
  { id: 'box_rare', name: 'Holo-Box', desc: 'Zufälliges Item (selten bis legendär).', icon: '🪩', rarity: 'epic', type: 'consumable', effect: { kind: 'mystery', tier: 2 }, gemPrice: 10 },
  { id: 'box_daily', name: 'Tägliche Kiste', desc: 'Belohnung für alle Daily Quests.', icon: '📦', rarity: 'rare', type: 'consumable', effect: { kind: 'mystery', tier: 1 } },

  // materials
  { id: 'mat_ribbon', name: 'Seidenband', desc: 'Material für die Fusion.', icon: '🪢', rarity: 'common', type: 'material' },
  { id: 'mat_pearl', name: 'Perle', desc: 'Material für die Fusion.', icon: '🦪', rarity: 'uncommon', type: 'material' },
  { id: 'mat_stardust', name: 'Mondstaub', desc: 'Material für die Fusion.', icon: '🌙', rarity: 'rare', type: 'material' },
  { id: 'mat_crystal', name: 'Herzkristall', desc: 'Material für die Fusion.', icon: '💗', rarity: 'epic', type: 'material' },
  { id: 'mat_essence', name: 'Monarch-Essenz', desc: 'Extrem selten.', icon: '👑', rarity: 'legendary', type: 'material' },

  // equipment
  { id: 'eq_scrunchie', name: 'Scrunchie des Fokus', desc: 'Haare zurück, Fokus an.', icon: '🪮', rarity: 'common', type: 'equipment', slot: 'head', bonus: { int: 1 }, price: 150 },
  { id: 'eq_claw', name: 'Perlen-Haarklammer', desc: 'Clean girl approved.', icon: '🦋', rarity: 'uncommon', type: 'equipment', slot: 'head', bonus: { cha: 2 } },
  { id: 'eq_tiara', name: 'Tiara der Morgenröte', desc: 'Für Main-Character-Energie.', icon: '👑', rarity: 'legendary', type: 'equipment', slot: 'head', bonus: { cha: 5, per: 3 } },
  { id: 'eq_hoodie', name: 'Cozy Hoodie', desc: 'Weich wie eine Wolke.', icon: '🧥', rarity: 'common', type: 'equipment', slot: 'body', bonus: { vit: 1 }, price: 150 },
  { id: 'eq_pilates', name: 'Pilates-Set', desc: 'Matching set, matching mindset.', icon: '🩱', rarity: 'rare', type: 'equipment', slot: 'body', bonus: { str: 2, agi: 2 } },
  { id: 'eq_robe', name: 'Seidenrobe der Nacht', desc: 'Beauty sleep +100.', icon: '👘', rarity: 'epic', type: 'equipment', slot: 'body', bonus: { vit: 4, cha: 2 } },
  { id: 'eq_mittens', name: 'Strick-Handschuhe', desc: 'Warm und flauschig.', icon: '🧤', rarity: 'common', type: 'equipment', slot: 'hands', bonus: { vit: 1 } },
  { id: 'eq_ring', name: 'Mondstein-Ring', desc: 'Leuchtet bei Vollmond.', icon: '💍', rarity: 'rare', type: 'equipment', slot: 'hands', bonus: { per: 3 } },
  { id: 'eq_socks', name: 'Grip-Socken', desc: 'Kein Ausrutschen mehr.', icon: '🧦', rarity: 'common', type: 'equipment', slot: 'feet', bonus: { agi: 1 }, price: 150 },
  { id: 'eq_sneaker', name: 'Wolken-Sneaker', desc: 'Läuft wie von selbst.', icon: '👟', rarity: 'uncommon', type: 'equipment', slot: 'feet', bonus: { agi: 2, str: 1 } },
  { id: 'eq_heels', name: 'Kristall-Heels', desc: 'Jeder Schritt ein Statement.', icon: '👠', rarity: 'epic', type: 'equipment', slot: 'feet', bonus: { cha: 4, agi: 1 } },
  { id: 'eq_locket', name: 'Herz-Medaillon', desc: 'Erinnert dich an dein Warum.', icon: '🩷', rarity: 'uncommon', type: 'equipment', slot: 'accessory', bonus: { per: 1, cha: 1 } },
  { id: 'eq_headphones', name: 'Lo-fi Kopfhörer', desc: 'Deep focus mode.', icon: '🎧', rarity: 'rare', type: 'equipment', slot: 'accessory', bonus: { int: 3 } },
  { id: 'eq_bottle', name: 'Mega-Trinkflasche', desc: 'Hydration Hunter Equipment.', icon: '🍼', rarity: 'uncommon', type: 'equipment', slot: 'accessory', bonus: { vit: 2 }, price: 380 },
  { id: 'eq_aura_pink', name: 'Aura: Rosé', desc: 'Ein zarter, pinker Schimmer.', icon: '🌸', rarity: 'rare', type: 'equipment', slot: 'aura', bonus: { cha: 2, per: 1 } },
  { id: 'eq_aura_shadow', name: 'Aura: Shadow Monarch', desc: 'Arise.', icon: '🖤', rarity: 'mythic', type: 'equipment', slot: 'aura', bonus: { str: 4, vit: 4, agi: 4, int: 4, per: 4, cha: 4 } },
  { id: 'eq_aura_angel', name: 'Aura: Engelsflügel', desc: 'Federleicht.', icon: '🪽', rarity: 'legendary', type: 'equipment', slot: 'aura', bonus: { agi: 4, vit: 3 } },

  // key
  { id: 'key_awaken', name: 'Erweckungs-Siegel', desc: 'Beweis, dass du ein Player bist.', icon: '🔑', rarity: 'legendary', type: 'key' },
]

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']

export const SLOT_META = {
  head: { label: 'Kopf', icon: '🎀' },
  body: { label: 'Körper', icon: '👗' },
  hands: { label: 'Hände', icon: '💍' },
  feet: { label: 'Füße', icon: '👟' },
  accessory: { label: 'Accessoire', icon: '🎧' },
  aura: { label: 'Aura', icon: '🌸' },
} as const

const WEIGHTS: Record<number, Partial<Record<Rarity, number>>> = {
  0: { common: 60, uncommon: 28, rare: 10, epic: 2 },
  1: { common: 45, uncommon: 32, rare: 17, epic: 5, legendary: 1 },
  2: { rare: 55, epic: 33, legendary: 10, mythic: 2 },
}

export function rollRarity(tier: number, rnd = Math.random): Rarity {
  const w = WEIGHTS[tier] ?? WEIGHTS[0]
  const total = Object.values(w).reduce((a, b) => a + (b ?? 0), 0)
  let r = rnd() * total
  for (const [k, v] of Object.entries(w)) {
    r -= v ?? 0
    if (r <= 0) return k as Rarity
  }
  return 'common'
}

export function rollItem(tier: number, pool: ItemDef[] = ITEMS): ItemDef {
  const rarity = rollRarity(tier)
  const candidates = pool.filter((i) => i.rarity === rarity && i.type !== 'key' && i.type !== 'reward' && i.id !== 'box_daily')
  if (!candidates.length) return pool.find((i) => i.id === 'gold_pouch')!
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export const nextRarity = (r: Rarity): Rarity => RARITY_ORDER[Math.min(RARITY_ORDER.indexOf(r) + 1, RARITY_ORDER.length - 1)]
