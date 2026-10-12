import type { Quest } from './types'

type Tpl = Omit<Quest, 'done' | 'progress'>

export const DAILY_TEMPLATES: Tpl[] = [
  { id: 'd_water', title: '8 Gläser Wasser trinken', type: 'daily', cat: 'health', xp: 30, gold: 20, statXp: { vit: 20 }, target: 8, unit: 'Gläser', link: 'water' },
  { id: 'd_steps', title: '6.000 Schritte gehen', type: 'daily', cat: 'body', xp: 35, gold: 25, statXp: { agi: 20, vit: 5 }, target: 6000, unit: 'Schritte', link: 'steps' },
  { id: 'd_move', title: '15 Min. Workout', desc: 'Pilates, Yoga, Gym, Tanzen – alles zählt.', type: 'daily', cat: 'body', xp: 40, gold: 25, statXp: { str: 25 }, target: 15, unit: 'Min.', link: 'workoutMin' },
  { id: 'd_read', title: '20 Min. lesen oder lernen', type: 'daily', cat: 'mind', xp: 30, gold: 20, statXp: { int: 25 } },
  { id: 'd_tidy', title: '10 Min. Wohnung aufräumen', type: 'daily', cat: 'home', xp: 25, gold: 20, statXp: { per: 20 } },
  { id: 'd_skin', title: 'Skincare-Routine', desc: 'Morgens oder abends – dein Glow zählt.', type: 'daily', cat: 'style', xp: 20, gold: 15, statXp: { cha: 20 } },
]

export const WEEKLY_TEMPLATES: Tpl[] = [
  { id: 'w_clean', title: 'Großputz: 3 Räume aufräumen', type: 'weekly', cat: 'home', xp: 150, gold: 120, statXp: { per: 60 }, target: 3, unit: 'Räume' },
  { id: 'w_outfits', title: '5 Outfits tragen & loggen', type: 'weekly', cat: 'style', xp: 140, gold: 100, statXp: { cha: 60 }, target: 5, unit: 'Outfits' },
  { id: 'w_sleep', title: '4× mind. 7,5 h schlafen', type: 'weekly', cat: 'health', xp: 160, gold: 110, statXp: { vit: 70 }, target: 4, unit: 'Nächte' },
  { id: 'w_social', title: 'Zeit mit Freund*innen verbringen', type: 'weekly', cat: 'social', xp: 100, gold: 80, statXp: { cha: 40 } },
  { id: 'w_meal', title: 'Meal Prep für 3 Tage', type: 'weekly', cat: 'health', xp: 120, gold: 90, statXp: { vit: 40, per: 20 } },
]

export const MAIN_TEMPLATES: Tpl[] = [
  { id: 'm_wardrobe', title: 'Kapitel 1: Der Kleiderschrank erwacht', desc: 'Lies 10 Kleidungsstücke ein.', type: 'main', cat: 'style', xp: 300, gold: 250, statXp: { cha: 80 }, target: 10, unit: 'Teile' },
  { id: 'm_home', title: 'Kapitel 2: Kartografie des Zuhauses', desc: 'Trage 12 Gegenstände in deine Räume ein.', type: 'main', cat: 'home', xp: 300, gold: 250, statXp: { per: 80 }, target: 12, unit: 'Gegenstände' },
  { id: 'm_fridge', title: 'Kapitel 3: Die Vorratskammer', desc: 'Pflege 8 Lebensmittel im Kühlschrank.', type: 'main', cat: 'home', xp: 250, gold: 200, statXp: { vit: 50, per: 30 }, target: 8, unit: 'Items' },
  { id: 'm_streak', title: 'Kapitel 4: Die 7-Tage-Prüfung', desc: 'Erreiche einen 7-Tage-Streak.', type: 'main', cat: 'mind', xp: 600, gold: 500, statXp: { str: 30, vit: 30, agi: 30, int: 30, per: 30, cha: 30 }, target: 7, unit: 'Tage' },
  { id: 'm_level', title: 'Kapitel 5: Rang D', desc: 'Erreiche Level 10.', type: 'main', cat: 'mind', xp: 800, gold: 600, statXp: {}, target: 10, unit: 'Level' },
]

export const PENALTY: Tpl = {
  id: 'p_walk',
  title: 'STRAFQUEST: 30 Min. Spaziergang',
  desc: 'Du hast die Daily Quest nicht abgeschlossen. Überlebe die Strafzone.',
  type: 'penalty',
  cat: 'body',
  xp: 60,
  gold: 0,
  statXp: { agi: 20, vit: 10 },
}

export const fromTpl = (t: Tpl): Quest => ({ ...t, done: false, progress: 0 })

export const CAT_META = {
  body: { label: 'Körper', icon: '🏃‍♀️', color: '#ff8fc7' },
  mind: { label: 'Geist', icon: '🧠', color: '#a98bff' },
  home: { label: 'Zuhause', icon: '🏡', color: '#7fd4b8' },
  style: { label: 'Style', icon: '👗', color: '#ffad8f' },
  health: { label: 'Health', icon: '💧', color: '#7cc4ff' },
  social: { label: 'Social', icon: '💌', color: '#ffc75f' },
  custom: { label: 'Eigene', icon: '⭐', color: '#c9a3ff' },
} as const
