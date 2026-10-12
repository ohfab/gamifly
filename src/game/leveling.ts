import type { StatKey } from './types'

export const xpToNext = (level: number) => Math.round(80 + 40 * level + 4 * level * level)

export const RANKS = [
  { min: 1, rank: 'E', color: '#b8b0bd' },
  { min: 10, rank: 'D', color: '#5fd3a6' },
  { min: 20, rank: 'C', color: '#5aa9ff' },
  { min: 35, rank: 'B', color: '#a77bff' },
  { min: 50, rank: 'A', color: '#ffb84d' },
  { min: 70, rank: 'S', color: '#ff5fa8' },
  { min: 90, rank: 'SS', color: '#ff2e88' },
]
export const rankFor = (level: number) => [...RANKS].reverse().find((r) => level >= r.min)!

export const STAT_META: Record<StatKey, { label: string; short: string; icon: string; desc: string }> = {
  str: { label: 'Stärke', short: 'STR', icon: '💪', desc: 'Workouts & Kraft' },
  vit: { label: 'Vitalität', short: 'VIT', icon: '🍓', desc: 'Schlaf, Wasser, Ernährung' },
  agi: { label: 'Agilität', short: 'AGI', icon: '🩰', desc: 'Schritte, Cardio, Tanz' },
  int: { label: 'Intelligenz', short: 'INT', icon: '📚', desc: 'Lernen, Lesen, Fokus' },
  per: { label: 'Wahrnehmung', short: 'PER', icon: '🔮', desc: 'Ordnung, Achtsamkeit' },
  cha: { label: 'Charme', short: 'CHA', icon: '💄', desc: 'Style, Selfcare, Social' },
}
export const STAT_KEYS: StatKey[] = ['str', 'vit', 'agi', 'int', 'per', 'cha']
export const STAT_XP_PER_POINT = 100

export const RARITY_META = {
  common: { label: 'Gewöhnlich', color: '#b8b0bd' },
  uncommon: { label: 'Ungewöhnlich', color: '#3fc796' },
  rare: { label: 'Selten', color: '#4a9bff' },
  epic: { label: 'Episch', color: '#9b6bff' },
  legendary: { label: 'Legendär', color: '#ffa928' },
  mythic: { label: 'Mythisch', color: '#ff3d9a' },
} as const
