import type { Metric, QuestCat } from './types'

/* ---------------------------------------------------------------- active skills (cost MP) */

export type SkillId = 'dash' | 'bloodlust' | 'stealth' | 'ruler' | 'arise'
export interface Skill { id: SkillId; name: string; desc: string; mp: number; level: number; art: string }
export const SKILLS: Skill[] = [
  { id: 'dash', name: 'Sprint', desc: 'Die nächsten 3 Quests innerhalb von 60 Minuten geben +50 % XP.', mp: 20, level: 1, art: 'run_shoe' },
  { id: 'bloodlust', name: 'Blutrausch', desc: 'Deine nächsten 3 Treffer gegen den Wochenboss sind kritisch (×2 Schaden).', mp: 30, level: 3, art: 'swords' },
  { id: 'stealth', name: 'Tarnung', desc: 'Das nächste Fokus-Gate gibt doppelte XP.', mp: 15, level: 5, art: 'gate' },
  { id: 'ruler', name: 'Herrscher-Autorität', desc: 'Der nächste Quest-Drop ist garantiert und mindestens selten.', mp: 35, level: 8, art: 'crystal_ball' },
  { id: 'arise', name: 'Erhebe dich', desc: 'Extrahiere den Schatten eines besiegten Bosses. 3 Versuche pro Boss.', mp: 40, level: 1, art: 'shadow' },
]

export interface Buffs {
  dash?: { until: number; charges: number }
  bloodlust?: number
  stealth?: boolean
  ruler?: boolean
}
export interface SkillState { day: string; spent: number; buffs: Buffs }

/* ---------------------------------------------------------------- shadow army */

export interface ShadowDef { boss: string; name: string; perk: string; cats?: QuestCat[]; gate?: boolean; boss_dmg?: boolean; all?: boolean; color: string }
export const SHADOWS: ShadowDef[] = [
  { boss: 'golem', name: 'Steinwache', perk: '+3 % XP auf alle Quests je Rang', all: true, color: '#8e98ae' },
  { boss: 'hydra', name: 'Giftzahn', perk: '+5 % XP auf Zuhause-Quests je Rang', cats: ['home'], color: '#3fd39a' },
  { boss: 'phantom', name: 'Schattenritter', perk: '+5 % XP auf Fokus-Gates und Geist-Quests je Rang', cats: ['mind'], gate: true, color: '#a98bff' },
  { boss: 'kraken', name: 'Tiefenläufer', perk: '+5 % XP auf Körper- und Health-Quests je Rang', cats: ['body', 'health'], color: '#ff5470' },
  { boss: 'dragon', name: 'Glutschwinge', perk: '+5 % Boss-Schaden je Rang', boss_dmg: true, color: '#ff8f3d' },
]
export const SHADOW_RANKS = ['Soldat', 'Elite', 'Ritter', 'Kommandant', 'Marschall']
export interface Shadow { boss: string; rank: number; since: number }

export function shadowXpBonus(shadows: Shadow[], cat?: QuestCat, gate = false) {
  let b = 0
  for (const sh of shadows) {
    const d = SHADOWS.find((x) => x.boss === sh.boss)
    if (!d) continue
    const r = sh.rank + 1
    if (d.all) b += 0.03 * r
    if (cat && d.cats?.includes(cat)) b += 0.05 * r
    if (gate && d.gate) b += 0.05 * r
  }
  return 1 + b
}
export function shadowBossBonus(shadows: Shadow[]) {
  const d = shadows.find((s) => s.boss === 'dragon')
  return 1 + (d ? 0.05 * (d.rank + 1) : 0)
}
export const ariseChance = (int: number) => Math.min(0.92, 0.45 + int * 0.015)

/* ---------------------------------------------------------------- red gates (surprise emergency quests) */

export interface RedGateTask { id: string; title: string; desc: string; metric?: Metric | 'quests'; amount?: number; art: string }
export const RED_GATE_TASKS: RedGateTask[] = [
  { id: 'water', title: 'Dehydrierungs-Fluch', desc: 'Trink 3 Gläser Wasser, bevor das Gate kollabiert.', metric: 'water', amount: 3, art: 'drop' },
  { id: 'steps', title: 'Verfolgungsjagd', desc: 'Geh 1.500 Schritte, um den Monstern zu entkommen.', metric: 'steps', amount: 1500, art: 'run_shoe' },
  { id: 'workout', title: 'Kampf ums Überleben', desc: '10 Minuten Workout. Egal welches.', metric: 'workoutMin', amount: 10, art: 'dumbbell' },
  { id: 'quests', title: 'Doppelschlag', desc: 'Schließe 2 beliebige Quests ab.', metric: 'quests', amount: 2, art: 'swords' },
  { id: 'clean', title: 'Säuberung', desc: '15 Minuten Blitz-Aufräumen. Bestätige, wenn du fertig bist.', art: 'broom' },
  { id: 'detox', title: 'Bann des Bildschirms', desc: '30 Minuten ohne Handy. Bestätige danach.', art: 'moon_sleep' },
  { id: 'breathe', title: 'Mana-Sturm', desc: '5 Minuten Meditation oder Atemübung.', metric: 'meditationMin', amount: 5, art: 'lotus' },
]
export interface RedGate { task: string; opened: number; until: number; base: number; done?: boolean }
export const RED_GATE_MIN = 90
