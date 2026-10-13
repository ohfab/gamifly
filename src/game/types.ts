export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'
export type StatKey = 'str' | 'vit' | 'agi' | 'int' | 'per' | 'cha'
export type Slot = 'head' | 'body' | 'hands' | 'feet' | 'accessory' | 'aura'
export type Stats = Record<StatKey, number>

export type Effect =
  | { kind: 'xp'; amount: number }
  | { kind: 'gold'; amount: number }
  | { kind: 'gems'; amount: number }
  | { kind: 'statPoint'; amount: number }
  | { kind: 'streakShield' }
  | { kind: 'mystery'; tier: number }
  | { kind: 'reward' }

export type ItemType = 'consumable' | 'equipment' | 'material' | 'reward' | 'key'

export interface ItemDef {
  id: string
  name: string
  desc: string
  icon: string
  rarity: Rarity
  type: ItemType
  slot?: Slot
  bonus?: Partial<Stats>
  effect?: Effect
  price?: number
  gemPrice?: number
}

export interface InvEntry {
  defId: string
  qty: number
  firstAt: number
  isNew?: boolean
}

export type QuestType = 'daily' | 'weekly' | 'main' | 'side' | 'penalty'
export type QuestCat = 'body' | 'mind' | 'home' | 'style' | 'health' | 'social' | 'custom'
export type Metric = 'water' | 'steps' | 'workoutMin' | 'sleep' | 'meditationMin'

export interface Quest {
  id: string
  title: string
  desc?: string
  type: QuestType
  cat: QuestCat
  xp: number
  gold: number
  statXp: Partial<Stats>
  target?: number
  progress?: number
  unit?: string
  link?: Metric
  done: boolean
  doneAt?: number
  custom?: boolean
  bonus?: boolean
}

export interface Player {
  name: string
  level: number
  xp: number
  totalXp: number
  gold: number
  gems: number
  statPoints: number
  base: Stats
  statXp: Stats
  title: string
  streak: number
  bestStreak: number
  createdAt: number
}

export interface DayLog {
  water: number
  steps: number
  sleep?: number
  mood?: number
  workoutMin: number
  meditationMin: number
  weight?: number
}

export type RoomKind = 'living' | 'kitchen' | 'bedroom' | 'bath' | 'hall' | 'office' | 'other'
/** Room footprint in metres on the floor plan (x to the right, z downwards on the plan). */
export interface RoomRect { x: number; z: number; w: number; d: number }
/** An uploaded floor plan image with its scale (pixels per metre). */
export interface FloorPlan { image?: string; ppm: number; imgW: number; imgH: number; show3d: boolean }

export interface RoomItem { id: string; name: string; icon: string; where?: string }
export interface Need { id: string; text: string; done: boolean }
export interface Room {
  id: string
  name: string
  kind: RoomKind
  lastCleaned: number
  items: RoomItem[]
  needs: Need[]
  rect?: RoomRect
}
export type DeviceKind = 'light' | 'thermostat' | 'plug' | 'vacuum' | 'speaker' | 'blinds'
export interface Device { id: string; roomId: string; name: string; kind: DeviceKind; on: boolean; value?: number }
export type FridgeZone = 'fridge' | 'freezer' | 'pantry'
export interface FridgeItem { id: string; name: string; icon: string; qty: number; unit: string; expires?: string; zone: FridgeZone }
export interface ShopItem { id: string; name: string; done: boolean }

export type ClothCat = 'top' | 'bottom' | 'dress' | 'outer' | 'shoes' | 'accessory'
export type ClothFit = 'pants' | 'skirt' | 'shorts' | 'bag' | 'hat' | 'jewelry' | 'default'
export interface Cloth {
  id: string
  name: string
  cat: ClothCat
  fit: ClothFit
  color: string
  photo?: string
  fabric?: string
  /** 3D cut for the fitting room (see avatar/map.ts); guessed from name + category when empty */
  cut?: string
  /** fabric scan for the fitting room; guessed when empty */
  textile?: string
  tags: string[]
  seasons: string[]
  fav: boolean
  wears: number
  lastWorn?: string
  addedAt: number
}
export interface Outfit { id: string; name: string; items: string[]; createdAt: number }

export interface Toast {
  id: string
  title: string
  body?: string
  tone?: 'system' | 'good' | 'warn' | 'loot'
  icon?: string
}

export interface LogEntry { t: number; text: string; icon: string }
