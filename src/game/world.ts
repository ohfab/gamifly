import type { QuestCat, StatKey } from './types'

export interface Boss { id: string; name: string; art: string; desc: string; weakness: string }
export const BOSSES: Boss[] = [
  { id: 'golem', name: 'Prokrastinations-Golem', art: 'boss_golem', desc: 'Schläft auf deinen To-dos. Jede erledigte Quest bricht ein Stück Stein ab.', weakness: 'Kleine Aufgaben sofort erledigen' },
  { id: 'hydra', name: 'Chaos-Hydra', art: 'boss_hydra', desc: 'Wächst aus Unordnung. Aufräumen trifft sie besonders hart.', weakness: 'Räume aufräumen' },
  { id: 'phantom', name: 'Doomscroll-Phantom', art: 'boss_phantom', desc: 'Lebt im Handy-Licht. Fokus-Gates verbannen es.', weakness: 'Fokus-Gates' },
  { id: 'kraken', name: 'Couch-Kraken', art: 'boss_kraken', desc: 'Hält dich auf dem Sofa fest. Bewegung befreit dich.', weakness: 'Schritte & Workouts' },
  { id: 'dragon', name: 'Zucker-Drache', art: 'boss_dragon', desc: 'Süß, aber gefährlich. Wasser und gutes Essen schwächen ihn.', weakness: 'Wasser & Kochen' },
]
export const bossHpFor = (level: number) => 900 + level * 70

export interface Job { id: string; name: string; art: string; desc: string; cats: QuestCat[]; stat: StatKey }
export const JOBS: Job[] = [
  { id: 'monarch', name: 'Glow Monarch', art: 'job_monarch', desc: 'Herrscht über Style & Selfcare. +15 % XP auf Style- und Social-Quests.', cats: ['style', 'social'], stat: 'cha' },
  { id: 'iron', name: 'Iron Bloom', art: 'job_iron', desc: 'Stark und unaufhaltsam. +15 % XP auf Körper- und Health-Quests.', cats: ['body', 'health'], stat: 'str' },
  { id: 'sage', name: 'Sage of Pages', art: 'job_sage', desc: 'Wissen ist Macht. +15 % XP auf Geist-Quests und Fokus-Gates.', cats: ['mind'], stat: 'int' },
  { id: 'hearth', name: 'Hearth Keeper', art: 'job_hearth', desc: 'Hüterin des Zuhauses. +15 % XP auf Zuhause-Quests und Aufräumen.', cats: ['home'], stat: 'per' },
]
export const JOB_BONUS = 0.15
export const JOB_LEVEL = 10

export interface GateRank { rank: string; minutes: number; tier: number; color: string; xp: number }
export const GATE_RANKS: GateRank[] = [
  { rank: 'E', minutes: 10, tier: 0, color: '#b8b0bd', xp: 30 },
  { rank: 'D', minutes: 15, tier: 0, color: '#3fc796', xp: 50 },
  { rank: 'C', minutes: 25, tier: 1, color: '#4a9bff', xp: 90 },
  { rank: 'B', minutes: 45, tier: 1, color: '#9b6bff', xp: 170 },
  { rank: 'A', minutes: 60, tier: 2, color: '#ffa928', xp: 240 },
]

export const BONUS_POOL: { title: string; cat: QuestCat; stat: StatKey }[] = [
  { title: 'Schreib 3 Dinge auf, für die du dankbar bist', cat: 'mind', stat: 'per' },
  { title: 'Ruf jemanden an, den du magst', cat: 'social', stat: 'cha' },
  { title: '10 Minuten Sonne oder frische Luft', cat: 'health', stat: 'vit' },
  { title: 'Probier ein neues Rezept aus', cat: 'home', stat: 'vit' },
  { title: 'Leg das Handy 1 Stunde weg', cat: 'mind', stat: 'int' },
  { title: '5 Minuten Stretching', cat: 'body', stat: 'agi' },
  { title: 'Miste eine Schublade aus', cat: 'home', stat: 'per' },
  { title: 'Gönn dir eine Gesichtsmaske', cat: 'style', stat: 'cha' },
  { title: 'Tanz zu deinem Lieblingssong', cat: 'body', stat: 'agi' },
  { title: 'Lerne 10 neue Vokabeln', cat: 'mind', stat: 'int' },
  { title: 'Mach ein Foto von etwas Schönem', cat: 'style', stat: 'per' },
  { title: 'Schreib jemandem eine liebe Nachricht', cat: 'social', stat: 'cha' },
]
